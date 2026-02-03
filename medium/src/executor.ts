
import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    parseAbiItem,
    encodeFunctionData,
    encodeAbiParameters
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
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
            { name: 'hookData', type: 'bytes' }
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
            chain: sepolia, // Configurable
            transport: http(CONFIG.RPC_URL)
        });

        this.account = privateKeyToAccount(CONFIG.PRIVATE_KEY as `0x${string}`);

        this.wallet = createWalletClient({
            account: this.account,
            chain: sepolia,
            transport: http(CONFIG.RPC_URL)
        });
    }

    async executeOrder(order: GhostPosition) {
        if (!CONFIG.CONTRACTS.EIDOLON_EXECUTOR || CONFIG.CONTRACTS.EIDOLON_EXECUTOR === "0x0000000000000000000000000000000000000000") {
            console.warn("⚠️  EIDOLON_EXECUTOR address not set! Skipping on-chain execution.");
            return false;
        }

        console.log(`⚡ Executor: Preparing settlement for ${order.id}...`);

        try {
            // 1. Construct Witness Struct (Must match WitnessLib)
            const witness = {
                poolId: order.poolId as `0x${string}`,
                hook: CONFIG.CONTRACTS.EIDOLON_HOOK as `0x${string}`
            };

            // 2. Encode Permit Data
            // We need to match the decode in Hook._beforeSwap:
            // (GhostPermit[], bytes[], WitnessLib.WitnessData[])

            // Reconstruct the permit struct
            const permit = {
                provider: order.provider as `0x${string}`,
                currency: order.tokenA as `0x${string}`,
                amount: parseEther(order.amountA.toString()), // Handles "5.0" -> Wei
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
            const currency0 = order.tokenA.toLowerCase() < order.tokenB.toLowerCase() ? order.tokenA : order.tokenB;
            const currency1 = order.tokenA.toLowerCase() < order.tokenB.toLowerCase() ? order.tokenB : order.tokenA;

            const poolKey = {
                currency0: currency0 as `0x${string}`,
                currency1: currency1 as `0x${string}`,
                fee: order.fee || 3000,
                tickSpacing: order.tickSpacing || 60,
                hooks: (order.hookAddress || CONFIG.CONTRACTS.EIDOLON_HOOK) as `0x${string}`
            };

            // 4. Prepare Swap Params for Executor
            // Determine swap direction: selling tokenA
            const zeroForOne = order.tokenA.toLowerCase() === currency0.toLowerCase();
            const amountSpecified = -parseEther(order.amountA.toString()); // Negative = Exact Input

            console.log("   🔑 Pool Key Constructed:", poolKey);
            console.log("   📝 Transaction Data Encoded.");
            console.log("   HookData Length:", hookData.length);
            console.log(`   🔄 Swap Direction: ${zeroForOne ? "ZeroForOne" : "OneForZero"} (Selling ${order.tokenA})`);

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
                        sqrtPriceLimitX96: zeroForOne ? 4295128739n : 1461446703485210103287273052203988822378723970342n
                        // MIN_SQRT_RATIO + 1 OR MAX_SQRT_RATIO - 1 depending on direction. 
                        // Uniswap V4 creates limits. 
                        // Safe default: 0 for now (Viem might need explicit BigInt if not 0)
                        // Actually better to use 0 if supported implies "no limit" in some contexts, but V4 usually requires valid limits.
                        // Let's use 0n for now as per previous commented code, assuming it's handled or we verify V4 limits.
                    },
                    hookData
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
