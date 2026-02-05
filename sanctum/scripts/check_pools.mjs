
import { createPublicClient, http, encodeAbiParameters, keccak256, hexToBigInt } from 'viem';
import { defineChain } from 'viem';

// Define Chain
const unichainSepolia = defineChain({
    id: 1301,
    name: "Unichain Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://sepolia.unichain.org"] } },
});

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http(),
});

const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
const HOOK = "0x97ed05d79F5D8C8a5B956e5d7B5272Ed903000c8";

// Tokens
const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
const eiETH = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";

// Pool Variants to Check
const variants = [
    { name: "ETH/USDC 1% (10000)", t0: NATIVE_ETH, t1: USDC, fee: 10000, tick: 200 },
    { name: "ETH/USDC 0.3% (3000)", t0: NATIVE_ETH, t1: USDC, fee: 3000, tick: 60 },
    { name: "ETH/USDC 0.05% (500)", t0: NATIVE_ETH, t1: USDC, fee: 500, tick: 10 },
    { name: "eiETH/USDC 1% (10000)", t0: eiETH, t1: USDC, fee: 10000, tick: 200 },
];

async function checkPool(v) {
    // Sort Tokens
    const [c0, c1] = v.t0.toLowerCase() < v.t1.toLowerCase() ? [v.t0, v.t1] : [v.t1, v.t0];

    // Calculate PoolKey ID
    const key = { currency0: c0, currency1: c1, fee: v.fee, tickSpacing: v.tick, hooks: HOOK };
    const encodedKey = encodeAbiParameters(
        [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' }
        ],
        [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
    );
    const poolId = keccak256(encodedKey);

    // Slot 0 Mapping
    const slot0Hash = keccak256(encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'uint256' }],
        [poolId, 6n]
    ));

    // Fetch Slot 0
    const val = await client.getStorageAt({ address: POOL_MANAGER, slot: slot0Hash });

    const valBig = val ? hexToBigInt(val) : 0n;
    const initialized = valBig !== 0n;

    // Extract SqrtPrice (first 160 bits)
    const sqrtPriceX96 = valBig & ((1n << 160n) - 1n);

    console.log(`\nChecking: ${v.name}`);
    console.log(`Pool ID: ${poolId}`);
    console.log(`Initialized: ${initialized}`);
    console.log(`SqrtPriceX96: ${sqrtPriceX96.toString()}`);

    if (initialized) {
        if (sqrtPriceX96 < 5000000000n) {
            console.log("⚠️  WARNING: Price is effectively ZERO (MinSqrtPrice). Pool is broken.");
        } else {
            console.log("✅ Price looks valid (non-zero).");
        }
    } else {
        console.log("✨ Pool is empty/fresh.");
    }
}

async function main() {
    console.log("--- Diagnostic Pool Check ---");
    for (const v of variants) {
        await checkPool(v);
    }
}

main();
