
import { createPublicClient, http, encodeAbiParameters, keccak256, hexToBigInt } from 'viem';
import { defineChain } from 'viem';

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

const POOL_MANAGER_ADDRESS = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";

const FEE_TIERS = [
    { fee: 500, tickSpacing: 10 },
    { fee: 3000, tickSpacing: 60 },
    { fee: 10000, tickSpacing: 200 }
];

const HOOK_OPTIONS = [
    "0x97ed05d79F5D8C8a5B956e5d7B5272Ed903000c8", // Configured Hook
    "0x0000000000000000000000000000000000000000"  // No Hook
];

const CURRENCY_PAIRS = [
    {
        name: "NATIVE_ETH",
        t0: "0x0000000000000000000000000000000000000000",
        t1: "0x31d0220469e10c4E71834a79b1f276d740d3768F"
    },
    {
        name: "WETH",
        t0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC (sorted)
        t1: "0x4200000000000000000000000000000000000006"  // WETH (sorted)
    }
];

function getPoolId(key) {
    const abiEncoded = encodeAbiParameters(
        [
            { name: "currency0", type: "address" },
            { name: "currency1", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "tickSpacing", type: "int24" },
            { name: "hooks", type: "address" },
        ],
        [key.token0, key.token1, key.fee, key.tickSpacing, key.hooks]
    );
    return keccak256(abiEncoded);
}

async function main() {
    console.log("Starting Deep Pool Search...");

    // Check if PoolManager exists
    const code = await client.getBytecode({ address: POOL_MANAGER_ADDRESS });
    if (!code) {
        console.error("🚨 CRITICAL: No code found at PoolManager address!");
        console.error(`Address checked: ${POOL_MANAGER_ADDRESS}`);
        return;
    }
    console.log("✅ PoolManager exists on-chain.");

    let foundAny = false;

    // Iterate all combinations
    for (const pair of CURRENCY_PAIRS) {
        for (const hook of HOOK_OPTIONS) {
            for (const tier of FEE_TIERS) {
                const key = {
                    token0: pair.t0,
                    token1: pair.t1,
                    fee: tier.fee,
                    tickSpacing: tier.tickSpacing,
                    hooks: hook
                };

                const poolId = getPoolId(key);
                // Simple logging to trace progress
                // console.log(`Checking ${pair.name} | Fee: ${tier.fee}`);

                // Check slots 0 to 50
                const promises = [];
                for (let i = 0; i <= 50; i++) {
                    const mappingKey = keccak256(encodeAbiParameters(
                        [{ type: 'bytes32' }, { type: 'uint256' }],
                        [poolId, BigInt(i)]
                    ));
                    promises.push(
                        client.getStorageAt({ address: POOL_MANAGER_ADDRESS, slot: mappingKey })
                            .then(val => ({ idx: i, val, pid: poolId, pName: pair.name, h: hook, f: tier.fee }))
                    );
                }

                const results = await Promise.all(promises);
                const match = results.find(r => r.val && hexToBigInt(r.val) !== 0n);

                if (match) {
                    console.log(`\n\n🎉 FOUND POOL! 🎉`);
                    console.log(`Pool Name: ${match.pName}`);
                    console.log(`Fee: ${match.f}`);
                    console.log(`Hooks: ${match.h}`);
                    console.log(`PoolID: ${match.pid}`);
                    console.log(`Storage Slot Index: ${match.idx}`);
                    console.log(`Value: ${match.val}`);
                    foundAny = true;
                }
            }
        }
    }

    if (!foundAny) {
        console.log("\n❌ No initialized pools found in any configuration.");
        console.log("Checked: Native/WETH, All Fee Tiers, Config/Zero Hooks, Slots 0-50");
    }
}

main();
