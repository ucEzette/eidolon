
import {
    createPublicClient,
    http,
    parseAbi,
    keccak256,
    encodeAbiParameters,
    Hex
} from 'viem';
import { unichainSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://sepolia.unichain.org";
const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
const HOOK = "0x1244359060e16429A5568085012606c0213020c8";

const ETH = "0x4200000000000000000000000000000000000006"; // WETH
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";

const TIERS = [
    { fee: 100, tickSpacing: 60 },
    { fee: 3000, tickSpacing: 60 }
];

function getPoolId(
    currency0: Hex,
    currency1: Hex,
    fee: number,
    tickSpacing: number,
    hooks: Hex
): Hex {
    return keccak256(
        encodeAbiParameters(
            [
                { type: 'address' },
                { type: 'address' },
                { type: 'uint24' },
                { type: 'int24' },
                { type: 'address' }
            ],
            [currency0, currency1, fee, tickSpacing, hooks]
        )
    );
}

const POOL_MANAGER_ABI = parseAbi([
    "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
]);

async function main() {
    const client = createPublicClient({ chain: unichainSepolia, transport: http(RPC_URL) });

    const [c0, c1] = ETH.toLowerCase() < USDC.toLowerCase() ? [ETH, USDC] : [USDC, ETH];

    console.log(`🔍 Checking ETH/USDC pools via getSlot0...`);

    for (const tier of TIERS) {
        const id = getPoolId(c0 as `0x${string}`, c1 as `0x${string}`, tier.fee, tier.tickSpacing, HOOK as `0x${string}`);
        try {
            const [sqrtPriceX96, tick] = await client.readContract({
                address: POOL_MANAGER as `0x${string}`,
                abi: POOL_MANAGER_ABI,
                functionName: 'getSlot0',
                args: [id as `0x${string}`]
            });
            console.log(`   Tier ${tier.fee}/${tier.tickSpacing}: ${sqrtPriceX96 > 0n ? "✅ INITIALIZED" : "❌ NOT INITIALIZED"} (Price: ${sqrtPriceX96}, Tick: ${tick})`);
        } catch (e: any) {
            console.log(`   Tier ${tier.fee}/${tier.tickSpacing}: ❌ REVERTS (${e.message.slice(0, 100)}...)`);
        }
    }
}

main().catch(console.error);
