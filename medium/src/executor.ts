
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
        const USDC_ADDRESS = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
        const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // Unichain Sepolia WETH

        const normalize = (addr: string) => {
            if (!addr) return ZERO_ADDRESS;
            const clean = addr.trim();

            // FAIL FAST on truncated addresses
            if (clean.includes("...")) {
                console.error(`❌ CRITICAL: Truncated address detected in data: "${clean}"`);
                throw new Error(`Data Contamination: Address "${clean}" is truncated.`);
            }

            // Map ETH to WETH purely for the `permit.currency` field (Permit2 doesn't support ETH)
            if (clean === "ETH") return WETH_ADDRESS;
            if (clean === "USDC") return USDC_ADDRESS;
            if (clean === "WETH") return WETH_ADDRESS;
            if (clean === "eiETH") return "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";
            // Check for explicit 0x0 address string
            if (clean === ZERO_ADDRESS) return WETH_ADDRESS; // Treat Native as WETH for Token Logic

            // Case-insensitive check
            if (clean.toLowerCase() === "eieth") return "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";
            return clean;
        };

        const getDecimals = (addr: string) => {
            if (addr.toLowerCase() === USDC_ADDRESS.toLowerCase()) return 6;
            return 18;
        };

        const tokenA = normalize(order.tokenA);
        const tokenB = normalize(order.tokenB);
        const decimalsA = getDecimals(tokenA);

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
            // We need to match the decode in Hook._beforeSwap:
            // (GhostPermit[], bytes[], WitnessLib.WitnessData[])

            // Reconstruct the permit struct
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
            // Sort tokens to determine Currency0/1
            const currency0 = tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenA : tokenB;
            const currency1 = tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenB : tokenA;

            const poolKey = {
                currency0: currency0 as `0x${string}`,
                currency1: currency1 as `0x${string}`,
                fee: order.fee || 3000, // Default to 0.3%
                tickSpacing: order.tickSpacing || 60, // Default to 60
                hooks: (order.hookAddress || CONFIG.CONTRACTS.EIDOLON_HOOK) as `0x${string}`
            };

            // 4. Prepare Swap Params for Executor
            // Determine swap direction: selling tokenA
            const zeroForOne = tokenA.toLowerCase() === currency0.toLowerCase();
            const amountSpecified = -parseUnits(order.amountA.toString(), decimalsA); // Negative = Exact Input

            console.log("   🔑 Pool Key Constructed:", poolKey);
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
                        sqrtPriceLimitX96: zeroForOne ? 4295128740n : 1461446703485210103287273052203988822378723970341n
                    },
                    hookData,
                    order.provider as `0x${string}` // recipient
                ]
            });
            console.log(`   🚀 Transaction Submitted: ${hash}`);

            return hash; // Return the hash

        } catch (error) {
            console.error("Executor Failed:", error);
            return null;
        }
    }
}
