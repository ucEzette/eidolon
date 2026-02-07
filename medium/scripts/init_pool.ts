
import { createWalletClient, http, createPublicClient, getAddress, encodeAbiParameters, keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = "https://sepolia.unichain.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
const HOOK = "0x85bF7A29023EA1f853045fC848b31C9bE4Eaa0C8";
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
const WETH = "0x4200000000000000000000000000000000000006";

const account = privateKeyToAccount(PRIVATE_KEY);
const client = createWalletClient({
    account,
    chain: unichainSepolia,
    transport: http(RPC_URL)
});

const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http(RPC_URL)
});

const POOL_MANAGER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "Currency", "name": "currency0", "type": "address" },
                    { "internalType": "Currency", "name": "currency1", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                    { "internalType": "address", "name": "hooks", "type": "address" }
                ],
                "internalType": "struct PoolKey",
                "name": "key",
                "type": "tuple"
            },
            { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" }
        ],
        "name": "initialize",
        "outputs": [
            { "internalType": "int24", "name": "tick", "type": "int24" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function main() {
    const [currency0, currency1] = [USDC, WETH].sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
    const key = {
        currency0: currency0 as `0x${string}`,
        currency1: currency1 as `0x${string}`,
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOK as `0x${string}`
    };

    console.log("Initializing Pool...");
    console.log("Key:", key);

    const sqrtPriceX96 = BigInt("79228162514264337593543950336"); // 1:1

    const hash = await client.writeContract({
        address: POOL_MANAGER,
        abi: POOL_MANAGER_ABI,
        functionName: "initialize",
        args: [key, sqrtPriceX96]
    });

    console.log("Transaction Hash:", hash);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("Pool Initialized!");
}

main().catch(console.error);
