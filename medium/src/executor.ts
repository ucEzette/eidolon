
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

    async executeOrder(order: GhostPosition) {
        if (!CONFIG.CONTRACTS.EIDOLON_EXECUTOR || CONFIG.CONTRACTS.EIDOLON_EXECUTOR === "0x0000000000000000000000000000000000000000") {
            console.warn("⚠️  EIDOLON_EXECUTOR address not set! Skipping on-chain execution.");
            return false;
        }

        console.log(`⚡ Executor: Preparing settlement for ${order.id}...`);

        const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
        // WETH Address on Unichain Sepolia
        const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

        const normalize = (addr: string) => {
            if (!addr) return WETH_ADDRESS;
            const clean = addr.trim();

            // FAIL FAST on truncated addresses
            if (clean.includes("...")) {
                console.error(`❌ CRITICAL: Truncated address detected in data: "${clean}"`);
                throw new Error(`Data Contamination: Address "${clean}" is truncated.`);
            }

            // Check if already a hex address
            if (clean.startsWith('0x') && clean.length === 42) return clean as `0x${string}`;

            // 1. Check for symbol resolution (e.g. "eiETH", "ETH")
            const tokenSymbol = clean.toUpperCase();
            const tokenEntry = Object.entries(CONFIG.TOKENS).find(
                ([symbol]) => symbol.toUpperCase() === tokenSymbol
            );

            if (tokenEntry) {
                const resolved = tokenEntry[1].address;
                const finalAddr = (resolved === ZERO_ADDRESS ? WETH_ADDRESS : resolved) as `0x${string}`;
                console.log(`   💎 Resolved ${clean} -> ${finalAddr}`);
                return finalAddr;
            }

            // 2. Manual fallbacks for known test symbols (Safety net)
            if (tokenSymbol === "EIETH") {
                console.log(`   💎 Resolved eiETH -> 0xe02eb159eb92dd0388ecdb33d0db0f8831091be6 (Fallback)`);
                return "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6" as `0x${string}`;
            }

            const lower = clean.toLowerCase();
            if (lower === "eth" || lower === ZERO_ADDRESS) return WETH_ADDRESS;
            if (lower === "weth") return WETH_ADDRESS;

            console.warn(`   ⚠️  Failed to resolve token: ${clean}. Using as-is.`);
            return clean as `0x${string}`;
        };

        const getDecimals = (addr: string) => {
            const lowerAddr = addr.toLowerCase();
            const token = Object.values(CONFIG.TOKENS).find(
                t => t.address.toLowerCase() === lowerAddr
            );
            if (token) return token.decimals;
            if (lowerAddr === "0x31d0220469e10c4e71834a79b1f276d740d3768f") return 6; // USDC
            return 18;
        };

        const tokenA = normalize(order.tokenA);
        const tokenB = normalize(order.tokenB);
        const decimalsA = getDecimals(tokenA);
        const decimalsB = getDecimals(tokenB);

        try {
            // 1. Construct Witness Struct (Must match WitnessLib)
            const witness = {
                poolId: order.poolId as `0x${string}`,
                hook: CONFIG.CONTRACTS.EIDOLON_HOOK as `0x${string}`
            };

            // VERIFY SIGNATURE LOCALLY
            console.log("\n🔍 STARTING LOCAL VERIFICATION 🔍\n");
            let isValid = false;
            try {
                isValid = await verifyTypedData({
                    address: order.provider as `0x${string}`,
                    domain: {
                        name: 'Permit2',
                        chainId: 1301,
                        verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
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
                            token: tokenA as `0x${string}`,
                            amount: parseUnits(order.amountA.toString(), decimalsA)
                        },
                        spender: CONFIG.CONTRACTS.EIDOLON_HOOK as `0x${string}`,
                        nonce: BigInt(order.nonce),
                        deadline: BigInt(Math.floor(order.expiry / 1000)),
                        witness: witness
                    },
                    signature: order.signature as Hex
                });
            } catch (err) {
                console.error("CRITICAL: Verification crashed:", err);
                throw new Error("Verification Logic Failed");
            }

            console.log(`   🔍 Result: ${isValid ? "✅ VALID" : "❌ INVALID"}`);

            if (!isValid) {
                console.warn("   ⚠️ WARNING: Local signature verification failed. On-chain execution will likely revert.");
            }

            // 2. Encode Permit Data
            const permit = {
                provider: order.provider as `0x${string}`,
                currency: tokenA as `0x${string}`,
                amount: parseUnits(order.amountA.toString(), decimalsA), // Handles correct decimals
                poolId: order.poolId as `0x${string}`, // Added poolId field
                deadline: BigInt(Math.floor(order.expiry / 1000)),
                nonce: BigInt(order.nonce),
                isDualSided: order.liquidityMode === 'dual-sided'
            };

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
                    [permit],
                    [order.signature as `0x${string}`],
                    [witness]
                ]
            );

            // 3. Prepare PoolKey
            const currency0 = tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenA : tokenB;
            const currency1 = tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenB : tokenA;

            const poolKey = {
                currency0: currency0 as `0x${string}`,
                currency1: currency1 as `0x${string}`,
                fee: order.fee || CONFIG.POOLS.canonical.fee,
                tickSpacing: order.tickSpacing || CONFIG.POOLS.canonical.tickSpacing,
                hooks: (order.hookAddress || CONFIG.CONTRACTS.EIDOLON_HOOK) as `0x${string}`
            };

            // 4. Prepare Swap Params
            const zeroForOne = tokenA.toLowerCase() === currency0.toLowerCase();
            const amountSpecified = -parseUnits(order.amountA.toString(), decimalsA);

            console.log("   🔑 Pool Key Constructed:", poolKey);

            // 5. Verify Pool State & Calculate Dynamic Price Limit
            // RECALCULATE POOL ID LOCALLY (Do not trust order.poolId for storage reads)
            // Univ4 requires currency0 < currency1 and non-native tokens (standardized to WETH)
            const fee = order.fee || CONFIG.POOLS.canonical.fee;
            const tickSpacing = order.tickSpacing || CONFIG.POOLS.canonical.tickSpacing;
            const hooks = (order.hookAddress || CONFIG.CONTRACTS.EIDOLON_HOOK) as `0x${string}`;

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
                // ---------------------------------------------------------
                // FIX: Use extsload (Slot 6) because getSlot0 is broken
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

                const slotData = await this.client.readContract({
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
                }) as `0x${string}`;
                console.log(`   🔍 Debug Raw Slot Data: ${slotData}`);

                const val = BigInt(slotData);
                const price = val & ((1n << 160n) - 1n);
                // Tick extraction: (val >> 160) & 0xFFFFFF (24 bits)
                // Handle signed 24-bit integer manually if needed, but for display/logic unsigned verification is mostly okay
                // For completeness:
                let tick = Number((val >> 160n) & ((1n << 24n) - 1n));
                if (tick & 0x800000) tick -= 0x1000000; // Sign extension for 24-bit

                console.log(`   📊 Pool Price (via extsload): ${price.toString()}, Tick: ${tick}`);

                if (price === 0n) {
                    console.error("❌ CRITICAL: Pool is NOT INITIALIZED (Price=0). Swap will fail.");
                    return null;
                }

                const MIN_SQRT_PRICE = 4295128739n;
                const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;

                if (zeroForOne && price <= MIN_SQRT_PRICE + 100n) {
                    console.error("❌ CRITICAL: Pool Price at MINIMUM. Liquidity likely empty/drained.");
                    return null;
                }
                if (!zeroForOne && price >= MAX_SQRT_PRICE - 100n) {
                    console.error("❌ CRITICAL: Pool Price at MAXIMUM. Liquidity likely empty/drained.");
                    return null;
                }

                // DYNAMIC SLIPPAGE
                // 20% Slippage Tolerance to prevent 0x7c9c6e8f
                if (zeroForOne) {
                    limitX96 = (price * 8n) / 10n; // Target 80% of current price
                    if (limitX96 <= MIN_SQRT_PRICE) limitX96 = MIN_SQRT_PRICE + 1n;
                } else {
                    limitX96 = (price * 12n) / 10n; // Target 120% of current price
                    if (limitX96 >= MAX_SQRT_PRICE) limitX96 = MAX_SQRT_PRICE - 1n;
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
            const hash = await this.wallet.writeContract({
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
            });
            console.log(`   🚀 Transaction Submitted: ${hash}`);

            // Wait for confirmation
            console.log("   ⏳ Waiting for transaction receipt...");
            const receipt = await this.client.waitForTransactionReceipt({ hash });

            if (receipt.status === 'reverted') {
                console.error(`   ❌ Transaction REVERTED: ${hash}`);
                return null;
            }

            console.log(`   ✅ Transaction SUCCESSFUL: ${hash}`);
            return hash;

        } catch (error: any) {
            console.error("Executor Failed:", error.message || error);
            return null;
        }
    }
}
