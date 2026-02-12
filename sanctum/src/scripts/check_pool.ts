
import { createPublicClient, http, keccak256, encodeAbiParameters } from 'viem';
import { unichainSepolia } from 'viem/chains';

// Config
const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
const WETH = "0x4200000000000000000000000000000000000006";
const HOOK = "0x296bA69b1F79d0eb0Ca812C5cf58FC2f4C0Bb0C8"; // Default
const FEE = 3000;
const TICK_SPACING = 60;

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http("https://sepolia.unichain.org")
});

async function checkPoolParams(currency0: string, currency1: string, hook: string) {
    // Sort tokens
    const [c0, c1] = currency0.toLowerCase() < currency1.toLowerCase()
        ? [currency0, currency1]
        : [currency1, currency0];

    // 1. Calculate Pool ID
    // PoolKey structure: (currency0, currency1, fee, tickSpacing, hooks)
    const encoded = encodeAbiParameters(
        [
            { type: 'address' },
            { type: 'address' },
            { type: 'uint24' },
            { type: 'int24' },
            { type: 'address' }
        ],
        [c0 as `0x${string}`, c1 as `0x${string}`, FEE, TICK_SPACING, hook as `0x${string}`]
    );

    const poolId = keccak256(encoded);
    console.log(`\n--- Checking Pool ---`);
    console.log(`Token0: ${c0}`);
    console.log(`Token1: ${c1}`);
    console.log(`Hook:   ${hook}`);
    console.log(`PoolID: ${poolId}`);

    // 2. Check Initialization State via extsload
    // In PoolManager V4, pools mapping is usually at slot 0 (depending on impl).
    // Let's assume standard mapping(bytes32 poolId => Pool.State) at slot 0.
    // Slot for a mapping key K at slot P is keccak256(K . P)

    // Actually, the PoolManager usually stores:
    // mapping(PoolId => Pool.State) public pools;
    // If 'pools' is the first state variable, it's at slot 0.
    // Let's broaden search or try to call a getter.


    console.log(`Scanning slots 0 to 10 for Pool State...`);

    // Scan slots 0-10
    for (let i = 0; i <= 10; i++) {
        const slot = keccak256(encodeAbiParameters(
            [{ type: 'bytes32' }, { type: 'uint256' }],
            [poolId, BigInt(i)]
        ));

        try {
            const data = await client.readContract({
                address: POOL_MANAGER,
                abi: [{
                    inputs: [{ name: "slot", type: "bytes32" }],
                    name: "extsload",
                    outputs: [{ name: "value", type: "bytes32" }],
                    stateMutability: "view",
                    type: "function"
                }],
                functionName: 'extsload',
                args: [slot]
            });

            if (data !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                console.log(`✅ POOL FOUND at base slot ${i} (Wrapped Slot: ${slot})`);
                console.log(`   Value: ${data}`);
                return; // Found it
            }
        } catch (e) {
            // Ignore errors
        }
    }
    console.log("❌ POOL NOT FOUND in slots 0-10");

}

async function main() {
    // Check 1: With configured hook
    await checkPoolParams(USDC, WETH, HOOK);

    // Check 2: With Address(0) hook (common case)
    await checkPoolParams(USDC, WETH, "0x0000000000000000000000000000000000000000");
}

main();
