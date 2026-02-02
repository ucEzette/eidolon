
import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    parseAbiItem,
    encodeFunctionData
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { CONFIG } from './config';
import { GhostPosition } from './monitor';

// ABI for EidolonExecutor
const EXECUTOR_ABI = [
    parseAbiItem('function execute(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external payable returns (int256 amount0, int256 amount1)')
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
        if (!process.env.EIDOLON_EXECUTOR) {
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
                amount: BigInt(order.amountA),
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

            // 3. Prepare Swap Params for Executor
            // For now, assume simple 1:1 swap logic or arbitary amount
            // To "execute a trade", we need to swap AGAINST the JIT liquidity provided.
            // If user provides TokenA, we swap TokenB -> TokenA.
            // Amount: We take the full amount user provided? Or just enough to fill?
            // Let's swap the full amount.

            const amountSpecified = -BigInt(order.amountA); // Negative = Exact Input? No.
            // In V4:
            // negative = exact input (we pay input)
            // positive = exact output (we receive output)

            // Assume ZeroForOne logic based on token sort order.
            // We need proper PoolKey construction here. The backend doesn't have it fully.
            // For MVP, we need to fetch PoolKey details or recreate them.
            // Assuming order.poolId matches the key.

            // Just logging for now as we don't have PoolKey details (fee, tickSpacing) in GhostPosition easily without lookup.
            console.log("   📝 Transaction Data Encoded (Simulated).");
            console.log("   HookData Length:", hookData.length);

            // REAL TRANSACTION (Uncomment when Executor employed)
            /*
            const hash = await this.wallet.writeContract({
                address: CONFIG.CONTRACTS.EIDOLON_EXECUTOR as `0x${string}`,
                abi: EXECUTOR_ABI,
                functionName: 'execute',
                args: [
                    { ...poolKey },
                    { zeroForOne: true, amountSpecified: -100n, sqrtPriceLimitX96: 0n },
                    hookData
                ]
            });
            console.log(`   🚀 Transaction Submitted: ${hash}`);
            */

            return true;

        } catch (error) {
            console.error("Executor Failed:", error);
            return false;
        }
    }
}
