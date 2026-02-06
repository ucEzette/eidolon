
import {
    createPublicClient,
    createWalletClient,
    http,
    parseAbi
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

// CONFIGURATION
const RPC_URL = process.env.RPC_URL || "https://sepolia.unichain.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

// TOKENS
const WETH = "0x4200000000000000000000000000000000000006";
const eiETH = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";

async function main() {
    const account = privateKeyToAccount(PRIVATE_KEY);
    const client = createPublicClient({ chain: unichainSepolia, transport: http(RPC_URL) });
    const wallet = createWalletClient({ account, chain: unichainSepolia, transport: http(RPC_URL) });

    console.log(`🔌 Connected as ${account.address}`);

    const currency0 = WETH.toLowerCase() < eiETH.toLowerCase() ? WETH : eiETH;
    const currency1 = WETH.toLowerCase() < eiETH.toLowerCase() ? eiETH : WETH;

    const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";

    // OLD HOOK
    const OLD_HOOK = "0xa5CC49688cB5026977a2A501cd7dD3daB2C580c8";

    const poolKey = {
        currency0: currency0 as `0x${string}`,
        currency1: currency1 as `0x${string}`,
        fee: 3000,
        tickSpacing: 200,
        hooks: OLD_HOOK as `0x${string}`
    };

    // 1:1 Price
    const initPrice = 79228162514264337593543950336n;

    console.log("INITIALIZING POOL via PoolManager directly...");

    const PM_ABI = parseAbi([
        "struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }",
        "function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick)"
    ]);

    const hash = await wallet.writeContract({
        address: POOL_MANAGER,
        abi: PM_ABI,
        functionName: "initialize",
        args: [poolKey, initPrice]
    });

    console.log(`Init Payload: ${hash}`);
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
        console.log("✅ POOL INITIALIZED SUCCESSFULLY!");
    } else {
        console.error("❌ INITIALIZATION FAILED / REVERTED");
        console.error("Receipt:", receipt);
        process.exit(1);
    }
}

main().catch(console.error);
