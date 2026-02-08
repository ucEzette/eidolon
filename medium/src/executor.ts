
import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    parseEther,
    parseAbiItem,
    encodeFunctionData,
    encodeAbiParameters,
    verifyTypedData,
    keccak256,
    Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia } from 'viem/chains';
import { CONFIG } from './config';
import { GhostPosition } from './monitor';

// RPC Resilience: Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const isRetryable =
                error.message?.includes("block is out of range") ||
                error.message?.includes("too many requests") ||
                error.message?.includes("request timeout") ||
                error.code === -32019;

            if (!isRetryable || attempt === MAX_RETRIES - 1) break;

            const backoff = INITIAL_BACKOFF * Math.pow(2, attempt);
            console.warn(`⚠️  [${label}] RPC Error: ${error.message}. Retrying in ${backoff}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, backoff));
        }
    }
    throw lastError;
}

// ABI for EidolonExecutor
const EXECUTOR_ABI = [
    {
        name: 'execute',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            {
                name: 'key',
                type: 'tuple',
                components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' }
                ]
            },
            {
                name: 'params',
                type: 'tuple',
                components: [
                    { name: 'zeroForOne', type: 'bool' },
                    { name: 'amountSpecified', type: 'int256' },
                    { name: 'sqrtPriceLimitX96', type: 'uint160' }
                ]
            },
            { name: 'hookData', type: 'bytes' },
            { name: 'recipient', type: 'address' }
        ],
        outputs: [
            { name: 'amount0', type: 'int256' },
            { name: 'amount1', type: 'int256' }
        ]
    },
    {
        type: 'error',
        name: 'PriceLimitAlreadyExceeded',
        inputs: [
            { name: 'currentPrice', type: 'uint160' },
            { name: 'limitPrice', type: 'uint160' }
        ]
    },
    {
        type: 'error',
        name: 'PoolNotInitialized',
        inputs: []
    }
];

// ABI for checking if a permit nonce was used on-chain
const HOOK_ABI = [
    {
        name: 'isPermitUsed',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'provider', type: 'address' },
            { name: 'nonce', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    }
];

export class Executor {
    private client;
    private account;
    private wallet;

    constructor() {
        this.client = createPublicClient({
            chain: unichainSepolia, // Configurable
            transport: http(CONFIG.RPC_URL)
        });

        this.account = privateKeyToAccount(CONFIG.PRIVATE_KEY as `0x${string}`);

        this.wallet = createWalletClient({
            account: this.account,
            chain: unichainSepolia,
            transport: http(CONFIG.RPC_URL)
        });
    }

    async executeOrder(order: GhostPosition, bundledLiquidity: GhostPosition[] = []) {
        if (!CONFIG.CONTRACTS.EIDOLON_EXECUTOR || CONFIG.CONTRACTS.EIDOLON_EXECUTOR === "0x0000000000000000000000000000000000000000") {
            console.warn("⚠️  EIDOLON_EXECUTOR address not set! Skipping on-chain execution.");
            return false;
        }

        console.log(`⚡ Executor: Preparing settlement for swap trigger ${order.id}...`);
        if (bundledLiquidity.length > 0) {
            console.log(`   🌊 Bundling ${bundledLiquidity.length} JIT liquidity intents...`);
        }

        const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
        const WETH_ADDRESS = CONFIG.TOKENS.WETH.address;

        const normalize = (addr: string) => {
            if (!addr) return WETH_ADDRESS;
            const clean = addr.trim();
            if (clean.includes("...")) throw new Error(`Data Contamination: Address "${clean}" is truncated.`);
            if (clean.startsWith('0x') && clean.length === 42) return clean as `0x${string}`;
            const tokenSymbol = clean.toUpperCase();
            const tokenEntry = Object.entries(CONFIG.TOKENS).find(([symbol]) => symbol.toUpperCase() === tokenSymbol);
            if (tokenEntry) {
                const resolved = tokenEntry[1].address;
                return (resolved === ZERO_ADDRESS ? WETH_ADDRESS : resolved) as `0x${string}`;
            }
            const lower = clean.toLowerCase();
            if (lower === "eth" || lower === ZERO_ADDRESS) return WETH_ADDRESS;
            return clean as `0x${string}`;
        };

        const getDecimals = (addr: string) => {
            const lowerAddr = addr.toLowerCase();
            const token = Object.values(CONFIG.TOKENS).find(t => t.address.toLowerCase() === lowerAddr);
            return token ? token.decimals : 18;
        };

        const tokenA = normalize(order.tokenA);
        const tokenB = normalize(order.tokenB);
        const decimalsA = getDecimals(tokenA);
        const decimalsB = getDecimals(tokenB);

        try {
            const hookAddress = (order.hookAddress || CONFIG.CONTRACTS.EIDOLON_HOOK) as `0x${string}`;

            // Collect all intents: the trigger swap permit (if it exists) + all bundled liquidity
            // NOTE: Usually a swap trigger might NOT need a permit if it's a direct swap,
            // but in Eidolon, the bot triggers a swap *behalf of* the user, so it NEEDS the user's permit.
            const allIntents = [order, ...bundledLiquidity];
            const permits: any[] = [];
            const signatures: `0x${string}`[] = [];
            const witnesses: any[] = [];

            console.log("\n🔍 STARTING LOCAL VERIFICATION FOR ALL INTENTS 🔍\n");

            for (const intent of allIntents) {
                const iTokenA = normalize(intent.tokenA);
                const iDecimalsA = getDecimals(iTokenA);
                const iWitness = {
                    poolId: intent.poolId as `0x${string}`,
                    hook: (intent.hookAddress || CONFIG.CONTRACTS.EIDOLON_HOOK) as `0x${string}`
                };

                console.log(`\n--- DEBUG VERIFICATION [${intent.id.slice(0, 8)}] ---`);
                console.log(`Signer/Provider: ${intent.provider}`);
                console.log(`Token: ${iTokenA} (${iDecimalsA} decimals)`);
                console.log(`Amount (raw): ${intent.amountA}`);
                console.log(`Amount (parsed): ${parseUnits(intent.amountA.toString(), iDecimalsA)}`);
                console.log(`Spender: ${iWitness.hook}`);
                console.log(`Nonce: ${intent.nonce}`);
                console.log(`Deadline: ${Math.floor(intent.expiry / 1000)}`);
                console.log(`PoolId: ${iWitness.poolId}`);
                console.log(`Hook: ${iWitness.hook}`);
                console.log(`Signature: ${intent.signature.slice(0, 20)}...`);

                const isValid = await this.client.verifyTypedData({
                    address: intent.provider as `0x${string}`,
                    domain: {
                        name: 'Permit2',
                        chainId: unichainSepolia.id,
                        verifyingContract: CONFIG.CONTRACTS.PERMIT2,
                    },
                    types: {
                        PermitWitnessTransferFrom: [
                            { name: "permitted", type: "TokenPermissions" },
                            { name: "spender", type: "address" },
                            { name: "nonce", type: "uint256" },
                            { name: "deadline", type: "uint256" },
                            { name: "witness", type: "WitnessData" }
                        ],
                        TokenPermissions: [
                            { name: "token", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        WitnessData: [
                            { name: "poolId", type: "bytes32" },
                            { name: "hook", type: "address" }
                        ]
                    },
                    primaryType: 'PermitWitnessTransferFrom',
                    message: {
                        permitted: {
                            token: iTokenA as `0x${string}`,
                            amount: parseUnits(intent.amountA.toString(), iDecimalsA)
                        },
                        spender: iWitness.hook,
                        nonce: BigInt(intent.nonce),
                        deadline: BigInt(Math.floor(intent.expiry / 1000)),
                        witness: iWitness
                    },
                    signature: intent.signature as Hex
                });

                console.log(`   🔍 Intent [${intent.id.slice(0, 8)}] Result: ${isValid ? "✅ VALID" : "❌ INVALID"}`);

                if (!isValid) {
                    try {
                        const recovered = await import('viem').then(m => m.recoverTypedDataAddress({
                            domain: {
                                name: 'Permit2',
                                chainId: unichainSepolia.id,
                                verifyingContract: CONFIG.CONTRACTS.PERMIT2,
                            },
                            types: {
                                PermitWitnessTransferFrom: [
                                    { name: "permitted", type: "TokenPermissions" },
                                    { name: "spender", type: "address" },
                                    { name: "nonce", type: "uint256" },
                                    { name: "deadline", type: "uint256" },
                                    { name: "witness", type: "WitnessData" }
                                ],
                                TokenPermissions: [
                                    { name: "token", type: "address" },
                                    { name: "amount", type: "uint256" }
                                ],
                                WitnessData: [
                                    { name: "poolId", type: "bytes32" },
                                    { name: "hook", type: "address" }
                                ]
                            },
                            primaryType: 'PermitWitnessTransferFrom',
                            message: {
                                permitted: {
                                    token: iTokenA as `0x${string}`,
                                    amount: parseUnits(intent.amountA.toString(), iDecimalsA)
                                },
                                spender: iWitness.hook,
                                nonce: BigInt(intent.nonce),
                                deadline: BigInt(Math.floor(intent.expiry / 1000)),
                                witness: iWitness
                            },
                            signature: intent.signature as Hex
                        }));
                        console.log(`      ⚠️  [DEBUG] EOA Recovered: ${recovered} (Expected: ${intent.provider})`);
                        console.log(`      ⚠️  [DEBUG] If this mismatch persists, it might be an EIP-1271 wallet.`);
                    } catch (e) {
                        console.log(`      ⚠️  [DEBUG] Recovery failed: ${e}`);
                    }
                }

                if (isValid) {
                    permits.push({
                        id: intent.id, // Keep track of ID for settlement
                        provider: intent.provider as `0x${string}`,
                        currency: iTokenA as `0x${string}`,
                        amount: parseUnits(intent.amountA, iDecimalsA),
                        poolId: intent.poolId as `0x${string}`,
                        deadline: BigInt(Math.floor(intent.expiry / 1000)),
                        nonce: BigInt(intent.nonce),
                        isDualSided: intent.liquidityMode === 'dual-sided'
                    });
                    signatures.push(intent.signature as `0x${string}`);
                    witnesses.push(iWitness);
                } else {
                    console.warn(`   ⚠️  Intent [${intent.id.slice(0, 8)}] failed verification. Skipping.`);
                }
            }

            if (permits.length === 0) {
                console.error("❌ CRITICAL: No valid permits found for execution.");
                return null;
            }

            const hookData = encodeAbiParameters(
                [
                    {
                        components: [
                            { name: 'provider', type: 'address' },
                            { name: 'currency', type: 'address' },
                            { name: 'amount', type: 'uint256' },
                            { name: 'poolId', type: 'bytes32' },
                            { name: 'deadline', type: 'uint256' },
                            { name: 'nonce', type: 'uint256' },
                            { name: 'isDualSided', type: 'bool' }
                        ],
                        name: 'permits',
                        type: 'tuple[]'
                    },
                    { name: 'signatures', type: 'bytes[]' },
                    {
                        components: [
                            { name: 'poolId', type: 'bytes32' },
                            { name: 'hook', type: 'address' }
                        ],
                        name: 'witnesses',
                        type: 'tuple[]'
                    }
                ],
                [
                    // EidolonHook.sol uses uint256 for amount in GhostPermit struct
                    permits.map(p => ({ ...p, amount: BigInt(p.amount) })),
                    signatures,
                    witnesses
                ]
            );

            // 3. Prepare PoolKey
            const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];

            const poolKey = {
                currency0: currency0 as `0x${string}`,
                currency1: currency1 as `0x${string}`,
                fee: order.fee || CONFIG.POOLS.canonical.fee,
                tickSpacing: order.tickSpacing || CONFIG.POOLS.canonical.tickSpacing,
                hooks: hookAddress
            };

            // 4. Prepare Swap Params
            // The swapper (intent provider) is selling tokenA and buying tokenB.
            // Univ4: zeroForOne = true means swapping from currency0 to currency1 (selling currency0).
            const zeroForOne = tokenA.toLowerCase() === currency0.toLowerCase();

            // The amount specified for the swap is the user's input (tokenA).
            // Univ4: Negative value = Exact Input swap (User GIVES amountA).
            // Univ4: Positive value = Exact Output swap (User RECEIVES amountA).
            // Since we are selling tokenA, this is an EXACT INPUT swap.
            // Ensure we use the absolute value then negate to be 100% sure of sign.
            const absAmount = parseUnits(order.amountA.toString().replace('-', ''), decimalsA);
            const amountSpecified = -absAmount;

            console.log("   🔑 Pool Key Constructed:", poolKey);

            // 5. Verify Pool State & Calculate Dynamic Price Limit
            // RECALCULATE POOL ID LOCALLY (Do not trust order.poolId for storage reads)
            // Univ4 requires currency0 < currency1 and non-native tokens (standardized to WETH)
            const fee = order.fee || CONFIG.POOLS.canonical.fee;
            const tickSpacing = order.tickSpacing || CONFIG.POOLS.canonical.tickSpacing;
            const hooks = hookAddress;

            // Helper to get local PoolID (matches Frontend and Univ4 standard)
            const getLocalPoolId = (c0: string, c1: string, f: number, ts: number, h: string) => {
                const [t0, t1] = c0.toLowerCase() < c1.toLowerCase() ? [c0, c1] : [c1, c0];
                const encoded = encodeAbiParameters(
                    [
                        { name: 'currency0', type: 'address' },
                        { name: 'currency1', type: 'address' },
                        { name: 'fee', type: 'uint24' },
                        { name: 'tickSpacing', type: 'int24' },
                        { name: 'hooks', type: 'address' },
                    ],
                    [t0 as `0x${string}`, t1 as `0x${string}`, f, ts, h as `0x${string}`]
                );
                return keccak256(encoded);
            };

            const poolId = getLocalPoolId(currency0, currency1, fee, tickSpacing, hooks);
            console.log(`   🌊 Reading Pool State for ID: ${poolId}`);

            let limitX96 = zeroForOne ? 4295128740n : 1461446703485210103287273052203988822378723970341n; // Default Fallback

            try {
                try {
                    const [bn, chainId] = await withRetry(() => Promise.all([
                        this.client.getBlockNumber(),
                        this.client.getChainId()
                    ]), "StateVerification_Basics");
                    console.log(`\n   🔍 [DEBUG] Block: ${bn}, ChainID: ${chainId}`);
                    console.log(`   🔍 [DEBUG] RPC: ${CONFIG.RPC_URL}`);
                } catch (e) { }

                // ---------------------------------------------------------
                // FIX: Use extsload because getSlot0 is for helpers or removed in some versions
                // ---------------------------------------------------------

                // Calculate Storage Slot for _pools[poolId].slot0
                // Mapping is at slot 6
                const MAPPING_SLOT = 6n;
                const mappingKey = encodeAbiParameters(
                    [{ name: 'key', type: 'bytes32' }, { name: 'slot', type: 'uint256' }],
                    [poolId, MAPPING_SLOT]
                );
                const storageSlot = keccak256(mappingKey);
                console.log(`   🔍 Resolved Storage Slot: ${storageSlot}`);

                const slotData = await withRetry(() => this.client.readContract({
                    address: CONFIG.CONTRACTS.POOL_MANAGER as `0x${string}`,
                    abi: [
                        {
                            name: 'extsload',
                            type: 'function',
                            stateMutability: 'view',
                            inputs: [{ name: 'slot', type: 'bytes32' }],
                            outputs: [{ name: 'value', type: 'bytes32' }]
                        }
                    ],
                    functionName: 'extsload',
                    args: [storageSlot]
                }), "PoolState_ExtSload") as `0x${string}`;
                console.log(`   🔍 Debug Raw Slot Data: ${slotData}`);

                const val = BigInt(slotData);
                const price = val & ((1n << 160n) - 1n);
                // Tick extraction: (val >> 160) & 0xFFFFFF (24 bits)
                // Handle signed 24-bit integer manually if needed, but for display/logic unsigned verification is mostly okay
                // For completeness:
                let tick = Number((val >> 160n) & ((1n << 24n) - 1n));
                if (tick & 0x800000) tick -= 0x1000000; // Sign extension for 24-bit

                console.log(`   📊 Pool Price (via extsload): ${price.toString()}, Tick: ${tick}, amountSpecified: ${amountSpecified}`);

                if (price === 0n) {
                    console.error("❌ CRITICAL: Pool is NOT INITIALIZED (Price=0). Swap will fail.");
                    // return null; // Let's try to proceed ANYWAY in debug mode
                    console.log("   ⚠️  [DEBUG] Overriding initialization check. Attempting swap anyway...");
                }

                const MIN_SQRT_PRICE = 4295128739n;
                const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;

                if (zeroForOne && price <= MIN_SQRT_PRICE + 100n && price !== 0n) {
                    console.error("❌ CRITICAL: Pool Price at MINIMUM. Liquidity likely empty/drained.");
                    return null;
                }
                if (!zeroForOne && price >= MAX_SQRT_PRICE - 100n && price !== 0n) {
                    console.error("❌ CRITICAL: Pool Price at MAXIMUM. Liquidity likely empty/drained.");
                    return null;
                }

                // DYNAMIC SLIPPAGE
                // 20% Slippage Tolerance to prevent 0x7c9c6e8f
                if (price > 0n) {
                    if (zeroForOne) {
                        limitX96 = (price * 8n) / 10n; // Target 80% of current price
                        if (limitX96 <= MIN_SQRT_PRICE) limitX96 = MIN_SQRT_PRICE + 1n;
                    } else {
                        limitX96 = (price * 12n) / 10n; // Target 120% of current price
                        if (limitX96 >= MAX_SQRT_PRICE) limitX96 = MAX_SQRT_PRICE - 1n;
                    }
                }
                console.log(`   🛡️ Dynamic Limit Applied: ${limitX96.toString()}`);

            } catch (err) {
                console.error("⚠️  Pool State Check Failed:", err);
                return null; // Safety: Do not trade blindly
            }

            console.log("   📝 Transaction Data Encoded.");
            console.log("   HookData Length:", hookData.length);
            console.log(`   🔄 Swap Direction: ${zeroForOne ? "ZeroForOne" : "OneForZero"} (Selling ${tokenA})`);

            // REAL TRANSACTION
            const hash = await withRetry(() => this.wallet.writeContract({
                address: CONFIG.CONTRACTS.EIDOLON_EXECUTOR as `0x${string}`,
                abi: EXECUTOR_ABI,
                functionName: 'execute',
                args: [
                    poolKey,
                    // valid SwapParams: zeroForOne, amountSpecified, sqrtPriceLimitX96
                    {
                        zeroForOne,
                        amountSpecified: BigInt(amountSpecified),
                        sqrtPriceLimitX96: limitX96
                    },
                    hookData,
                    order.provider as `0x${string}` // recipient
                ]
            }), "ExecuteSwap_Tx");
            console.log(`   🚀 Transaction Submitted: ${hash}`);

            // Wait for confirmation
            console.log("   ⏳ Waiting for transaction receipt...");
            const receipt = await withRetry(() => this.client.waitForTransactionReceipt({ hash }), "ExecuteSwap_Receipt");

            if (receipt.status === 'reverted') {
                console.error(`   ❌ Transaction REVERTED: ${hash}`);
                return null;
            }

            console.log(`   ✅ Transaction SUCCESSFUL: ${hash}`);

            // CRITICAL: Verify on-chain which permits were actually consumed
            // The hook can silently skip permits for validation failures
            const actuallySettledIds: string[] = [];
            for (const p of permits) {
                try {
                    const isUsed = await withRetry(() => this.client.readContract({
                        address: CONFIG.CONTRACTS.EIDOLON_HOOK as `0x${string}`,
                        abi: HOOK_ABI,
                        functionName: 'isPermitUsed',
                        args: [p.provider, p.nonce]
                    }), `CheckNonce_${p.id.slice(0, 8)}`);
                    if (isUsed) {
                        actuallySettledIds.push(p.id);
                        console.log(`   ✅ Permit [${p.id.slice(0, 8)}] nonce confirmed used on-chain`);
                    } else {
                        console.warn(`   ⚠️  Permit [${p.id.slice(0, 8)}] nonce NOT used on-chain (skipped by hook)`);
                    }
                } catch (e) {
                    console.error(`   ❌ Failed to check nonce for [${p.id.slice(0, 8)}]:`, e);
                }
            }

            return {
                hash,
                settledIds: actuallySettledIds
            };

        } catch (error: any) {
            console.error("Executor Failed:", error.message || error);
            if (error.data) console.error("   DEBUG Revert Data:", error.data);
            if (error.cause) console.error("   DEBUG Cause:", error.cause);
            return null;
        }
    }
}
