
import {
    createPublicClient,
    http,
    parseAbi,
    keccak256,
    encodeAbiParameters,
    Hex,
    hexToBigInt
} from 'viem';
import { unichainSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://sepolia.unichain.org";
const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
const HOOK = "0x85bF7A29023EA1f853045fC848b31C9bE4Eaa0C8";

const ETH = "0x4200000000000000000000000000000000000006"; // WETH
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";

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
    "function extsload(bytes32 slot) external view returns (bytes32 value)"
]);

async function main() {
    const client = createPublicClient({ chain: unichainSepolia, transport: http(RPC_URL) });

    const [c0, c1] = ETH.toLowerCase() < USDC.toLowerCase() ? [ETH, USDC] : [USDC, ETH];
    const id = getPoolId(c0 as `0x${string}`, c1 as `0x${string}`, 3000, 60, HOOK as `0x${string}`);

    console.log(`🔍 Probing slots for Pool ID: ${id}`);

    for (let slot = 0n; slot < 20n; slot++) {
        const key = keccak256(
            encodeAbiParameters(
                [{ type: 'bytes32' }, { type: 'uint256' }],
                [id, slot]
            )
        );
        try {
            const value = await client.readContract({
                address: POOL_MANAGER as `0x${string}`,
                abi: POOL_MANAGER_ABI,
                functionName: 'extsload',
                args: [key]
            });
            if (hexToBigInt(value as Hex) > 0n) {
                console.log(`✅ FOUND DATA at Mapping Slot ${slot}!`);
                console.log(`   Storage Slot: ${key}`);
                console.log(`   Value: ${value}`);
            }
        } catch (e) {
            // ignore
        }
    }
}

main().catch(console.error);
