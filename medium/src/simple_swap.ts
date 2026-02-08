import { createWalletClient, http, publicActions, parseUnits, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { unichainSepolia } from "viem/chains";
import { CONFIG } from "./config";
import dotenv from "dotenv";

dotenv.config();

// --- CONSTANTS ---
const WETH = CONFIG.TOKENS.WETH.address;
const eiETH = CONFIG.TOKENS.eiETH.address;
const EXECUTOR = CONFIG.CONTRACTS.EIDOLON_EXECUTOR;
const MANAGER = CONFIG.CONTRACTS.POOL_MANAGER;
const HOOK_ADDRESS = CONFIG.CONTRACTS.EIDOLON_HOOK;

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const account = privateKeyToAccount(PRIVATE_KEY);

const client = createWalletClient({
    account,
    chain: unichainSepolia,
    transport: http(CONFIG.RPC_URL)
}).extend(publicActions);

const ERC20_ABI = parseAbi([
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)"
]);

// EidolonExecutor ABI (execute only)
const EXECUTOR_ABI = parseAbi([
    "function execute((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96), bytes hookData, address recipient) external payable returns (int256 delta)"
]);

const MANAGER_ABI = parseAbi([
    "function sync(address currency) external"
]);

// PoolKey Struct
type PoolKey = {
    currency0: `0x${string}`;
    currency1: `0x${string}`;
    fee: number;
    tickSpacing: number;
    hooks: `0x${string}`;
};

// Valid Price Limits for V4
const MIN_SQRT_PRICE = 4295128739n;
const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;

async function run() {
    console.log("Running End-to-End Swap Verification...");
    console.log("Executor:", EXECUTOR);
    console.log("Hook:", HOOK_ADDRESS);

    // 1. Sort Tokens
    const token0 = WETH.toLowerCase() < eiETH.toLowerCase() ? WETH : eiETH;
    const token1 = WETH.toLowerCase() < eiETH.toLowerCase() ? eiETH : WETH;
    const isWETHToken0 = token0.toLowerCase() === WETH.toLowerCase();

    console.log(`Token0: ${token0} (${isWETHToken0 ? "WETH" : "eiETH"})`);
    console.log(`Token1: ${token1} (${!isWETHToken0 ? "WETH" : "eiETH"})`);

    const key: PoolKey = {
        currency0: token0 as `0x${string}`,
        currency1: token1 as `0x${string}`,
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOK_ADDRESS as `0x${string}`
    };

    // 2. Fund PoolManager
    // We want to sell WETH -> eiETH.
    // Amount: 0.001 WETH (10^15 wei)
    const amountIn = parseUnits("0.001", 18);
    console.log(`Funding PoolManager with ${amountIn} WETH...`);

    // START SYNC
    try {
        console.log("Syncing WETH first...");
        const hashSync = await client.writeContract({
            address: MANAGER as `0x${string}`,
            abi: MANAGER_ABI,
            functionName: 'sync',
            args: [WETH as `0x${string}`]
        });
        await client.waitForTransactionReceipt({ hash: hashSync });
        console.log("Synced.");
    } catch (e: any) {
        console.warn("Sync failed (maybe not needed?):", e.message);
    }
    // END SYNC

    const hash1 = await client.writeContract({
        address: WETH as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [MANAGER as `0x${string}`, amountIn]
    });
    console.log("Funding Tx:", hash1);
    await client.waitForTransactionReceipt({ hash: hash1 });
    console.log("PoolManager funded.");

    // 3. Execute Swap
    // zeroForOne: If WETH is token0, we sell token0 -> zeroForOne = true.
    // If WETH is token1, we sell token1 -> zeroForOne = false.
    const zeroForOne = isWETHToken0;

    console.log(`Executing Swap: ${zeroForOne ? "0->1" : "1->0"}...`);

    const params = {
        zeroForOne,
        amountSpecified: -amountIn, // Exact Input (negative)
        sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n
    };

    try {
        const hash2 = await client.writeContract({
            address: EXECUTOR as `0x${string}`,
            abi: EXECUTOR_ABI,
            functionName: 'execute',
            args: [
                key,
                params,
                "0x", // EMPTY HOOK DATA -> Bypass JIT/Permit2 for now just to test hook baseline
                account.address
            ]
        });
        console.log("Execute Tx:", hash2);
        const receipt = await client.waitForTransactionReceipt({ hash: hash2 });

        if (receipt.status === 'success') {
            console.log("✅ SWAP SUCCESSFUL!");
        } else {
            console.log("❌ SWAP FAILED (Reverted)");
        }
    } catch (e: any) {
        console.error("Executor Call Failed:", e.message);
    }
}

run().catch(console.error);
