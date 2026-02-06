
import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    maxInt256,
    parseAbi
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

// CONFIGURATION
const RPC_URL = process.env.RPC_URL || "https://sepolia.unichain.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const SIMPLE_ROUTER = "0x30d0602786f1c242bd9cb4f473E6615a71F37DCA";
const HOOK = "0xa5CC49688cB5026977a2A501cd7dD3daB2C580c8";

// TOKENS
const NATIVE = "0x0000000000000000000000000000000000000000";
const WETH = "0x4200000000000000000000000000000000000006";
const eiETH = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";

const ROUTER_ABI = parseAbi([
    "struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }",
    "struct RouterSwapParams { PoolKey key; bool zeroForOne; int256 amountSpecified; uint160 sqrtPriceLimitX96; bytes hookData; }",
    "function swap(RouterSwapParams calldata params) external payable"
]);

const ERC20_ABI = parseAbi([
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address recipient, uint256 amount) external returns (bool)"
]);

async function main() {
    const account = privateKeyToAccount(PRIVATE_KEY);
    const client = createPublicClient({ chain: unichainSepolia, transport: http(RPC_URL) });
    const wallet = createWalletClient({ account, chain: unichainSepolia, transport: http(RPC_URL) });

    console.log(`🔌 Connected as ${account.address}`);

    // --- STEP 1: BUY eiETH ---
    const buyPoolKey = {
        currency0: NATIVE as `0x${string}`,
        currency1: eiETH as `0x${string}`,
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOK as `0x${string}`
    };

    const amountIn = parseUnits("0.01", 18);
    const minLimit = 4295128739n + 1n; // MIN + 1

    const buyParams = {
        key: buyPoolKey,
        zeroForOne: true,
        amountSpecified: -amountIn,
        sqrtPriceLimitX96: minLimit,
        hookData: "0x" as `0x${string}`
    };

    console.log("STEP 1: Buying eiETH...");
    const buyTx = await wallet.writeContract({
        address: SIMPLE_ROUTER,
        abi: ROUTER_ABI,
        functionName: "swap",
        args: [buyParams],
        value: amountIn
    });
    console.log(`Buy Payload: ${buyTx}`);
    await client.waitForTransactionReceipt({ hash: buyTx });
    console.log("✅ Bought eiETH.");

    // --- STEP 2: APPROVE ---
    console.log("STEP 2: Approving...");
    const approveTx = await wallet.writeContract({
        address: eiETH as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SIMPLE_ROUTER, maxInt256]
    });
    await client.waitForTransactionReceipt({ hash: approveTx });
    console.log("✅ Approved.");

    // --- STEP 3: BUMP ---
    console.log("STEP 3: Bumping WETH Pool...");
    const bumpPoolKey = {
        currency0: WETH as `0x${string}`,
        currency1: eiETH as `0x${string}`,
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOK as `0x${string}`
    };

    const targetPrice = 79228162514264337593543950336n;
    const bumpAmount = parseUnits("0.001", 18);

    const bumpParams = {
        key: bumpPoolKey,
        zeroForOne: false,
        amountSpecified: -bumpAmount,
        sqrtPriceLimitX96: targetPrice,
        hookData: "0x" as `0x${string}`
    };

    const bumpTx = await wallet.writeContract({
        address: SIMPLE_ROUTER,
        abi: ROUTER_ABI,
        functionName: "swap",
        args: [bumpParams]
    });
    console.log(`Bump Payload: ${bumpTx}`);
    await client.waitForTransactionReceipt({ hash: bumpTx });
    console.log("✅ POOL BUMPED!");
}

main().catch(console.error);
