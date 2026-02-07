
import { createPublicClient, http, parseAbi, encodeAbiParameters, keccak256, hexToBigInt } from 'viem';
import { unichainSepolia } from 'viem/chains';

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http("https://sepolia.unichain.org")
});

const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
const EIDOLON_HOOK = "0x78bb3Cc9986310FB935485192adB2Fe18C5c20C8";

// WETH/USDC pool key
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
const FEE = 3000;
const TICK_SPACING = 60;

// Sort tokens
const [token0, token1] = WETH.toLowerCase() < USDC.toLowerCase()
    ? [WETH, USDC]
    : [USDC, WETH];

// Calculate pool ID
const encoded = encodeAbiParameters(
    [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' },
    ],
    [token0 as `0x${string}`, token1 as `0x${string}`, FEE, TICK_SPACING, EIDOLON_HOOK as `0x${string}`]
);
const poolId = keccak256(encoded);

console.log("Token0:", token0);
console.log("Token1:", token1);
console.log("Pool ID:", poolId);

const POOL_MANAGER_ABI = parseAbi([
    "function extsload(bytes32 slot) external view returns (bytes32 value)"
]);

// Helper for Pool State Slot
const POOLS_MAPPING_SLOT = 6n;
function getPoolStateSlot(poolId: `0x${string}`) {
    return keccak256(encodeAbiParameters(
        [{ name: 'key', type: 'bytes32' }, { name: 'slot', type: 'uint256' }],
        [poolId, POOLS_MAPPING_SLOT]
    ));
}

async function checkPool() {
    try {
        const slot = getPoolStateSlot(poolId);
        console.log("Pool State Slot:", slot);

        const slotData = await client.readContract({
            address: POOL_MANAGER as `0x${string}`,
            abi: POOL_MANAGER_ABI,
            functionName: 'extsload',
            args: [slot]
        });
        console.log("Raw Slot Data:", slotData);

        const val = hexToBigInt(slotData);
        console.log("Val as BigInt:", val);

        // Extract sqrtPriceX96 from lower 160 bits
        const sqrtPriceX96 = val & ((1n << 160n) - 1n);
        console.log("sqrtPriceX96:", sqrtPriceX96.toString());

        if (sqrtPriceX96 === 0n) {
            console.log("⚠️  Pool is NOT initialized (sqrtPriceX96 = 0)");
        } else {
            console.log("✅ Pool is initialized with sqrtPriceX96:", sqrtPriceX96.toString());
        }
    } catch (e) {
        console.error("Error reading slot:", e);
    }
}

checkPool();
