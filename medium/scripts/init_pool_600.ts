
import {
    createPublicClient,
    createWalletClient,
    http,
    encodeFunctionData,
    parseEther,
    encodeAbiParameters,
    keccak256
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia } from 'viem/chains';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config();

// CONFIGURATION
const RPC_URL = process.env.RPC_URL || "https://sepolia.unichain.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
// TOKENS
const WETH = "0x0000000000000000000000000000000000000000"; // NATIVE ETH
const EIDOLON_HOOK = "0x9f24291f89fD0D7cfB3d6A599306c05607Aa20c8"; // New Hook
const eiETH = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";

// POOL PARAMS
const FEE = 10000; // 1%
const TICK_SPACING = 200; // Standard for 1%

async function main() {
    const account = privateKeyToAccount(PRIVATE_KEY);
    const client = createPublicClient({ chain: unichainSepolia, transport: http(RPC_URL) });
    const wallet = createWalletClient({ account, chain: unichainSepolia, transport: http(RPC_URL) });

    console.log(`🔌 Connected to ${unichainSepolia.name} as ${account.address}`);

    // Sort tokens
    const currency0 = WETH.toLowerCase() < eiETH.toLowerCase() ? WETH : eiETH;
    const currency1 = WETH.toLowerCase() < eiETH.toLowerCase() ? eiETH : WETH;

    console.log("Currency0:", currency0);
    console.log("Currency1:", currency1);

    const poolKey = {
        currency0: currency0 as `0x${string}`,
        currency1: currency1 as `0x${string}`,
        fee: FEE,
        tickSpacing: TICK_SPACING,
        hooks: EIDOLON_HOOK as `0x${string}`
    };

    // Calculate SQRT_PRICE_X96 for 1:1
    // 2^96 = 79228162514264337593543950336
    const initPrice = BigInt("79228162514264337593543950336");

    console.log(`✨ Initializing NEW Pool (TickSpacing: ${TICK_SPACING})...`);

    // Check if checks if it's already initialized by reading storage?
    // We can assume it's NOT since 600 is unusual. 

    const hash = await wallet.writeContract({
        address: POOL_MANAGER as `0x${string}`,
        abi: [{
            name: "initialize",
            type: "function",
            stateMutability: "payable",
            inputs: [
                {
                    type: "tuple",
                    name: "key",
                    components: [
                        { name: "currency0", type: "address" },
                        { name: "currency1", type: "address" },
                        { name: "fee", type: "uint24" },
                        { name: "tickSpacing", type: "int24" },
                        { name: "hooks", type: "address" }
                    ]
                },
                { name: "sqrtPriceX96", type: "uint160" },
                { name: "hookData", type: "bytes" }
            ],
            outputs: [{ name: "tick", type: "int24" }]
        }],
        functionName: "initialize",
        args: [
            poolKey,
            initPrice,
            "0x" // No hook data needed for initialization
        ]
    });

    console.log(`🚀 Initialization Tx Sent: ${hash}`);
    console.log("Waiting for confirmation...");

    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
        console.log("✅ Pool Initialized Successfully!");
    } else {
        console.error("❌ Transaction Reverted!");
    }
}

main().catch(console.error);
