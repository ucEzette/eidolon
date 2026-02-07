
import { createPublicClient, http, encodeAbiParameters, keccak256, parseAbi, hexToBigInt } from 'viem';
import { unichainSepolia } from 'viem/chains';
import { CONFIG } from '../src/config';

// CONSTANTS
const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
const HOOK_ADDRESS = "0xaF98eed0508587C7b8F1c658Dd6a91a0FedE60C8";
const SLOT_6 = 6n; // The Storage Slot for _pools mapping

// TOKENS
const TOKENS = {
    Native: "0x0000000000000000000000000000000000000000",
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    eiETH: "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6"
};

const FEES = [100, 500, 3000, 10000];
const TICKS = [10, 60, 200];

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http(CONFIG.RPC_URL)
});

async function main() {
    console.log("🔍 SCANNING POOL READINESS (via extsload Slot 6)...");

    // Define Pairs to Scan
    const PAIRS = [
        { name: "Native/USDC", t0: TOKENS.Native, t1: TOKENS.USDC },
        { name: "Native/eiETH", t0: TOKENS.Native, t1: TOKENS.eiETH },
        { name: "WETH/USDC", t0: TOKENS.WETH, t1: TOKENS.USDC },
        { name: "WETH/eiETH", t0: TOKENS.WETH, t1: TOKENS.eiETH }
    ];

    for (const pair of PAIRS) {
        console.log(`\n--- Checking Pair: ${pair.name} ---`);
        for (const fee of FEES) {
            for (const tickSpacing of TICKS) {
                // Construct Pool Key
                const currency0 = pair.t0.toLowerCase() < pair.t1.toLowerCase() ? pair.t0 : pair.t1;
                const currency1 = pair.t0.toLowerCase() < pair.t1.toLowerCase() ? pair.t1 : pair.t0;

                const packed = encodeAbiParameters(
                    [
                        { name: 'currency0', type: 'address' },
                        { name: 'currency1', type: 'address' },
                        { name: 'fee', type: 'uint24' },
                        { name: 'tickSpacing', type: 'int24' },
                        { name: 'hooks', type: 'address' }
                    ],
                    [currency0 as `0x${string}`, currency1 as `0x${string}`, fee, tickSpacing, HOOK as `0x${string}`]
                );
                const poolId = keccak256(packed);

                // Calculate Storage Slot: keccak256(poolId . 6)
                const mappingKey = encodeAbiParameters(
                    [{ name: 'key', type: 'bytes32' }, { name: 'slot', type: 'uint256' }],
                    [poolId, SLOT_6]
                );
                const storageSlot = keccak256(mappingKey);

                try {
                    // Read via extsload
                    const data = await client.readContract({
                        address: POOL_MANAGER,
                        abi: parseAbi(["function extsload(bytes32 slot) external view returns (bytes32 value)"]),
                        functionName: 'extsload',
                        args: [storageSlot]
                    });

                    const val = hexToBigInt(data);

                    if (val > 0n) {
                        const price = val & ((1n << 160n) - 1n);
                        let tick = Number((val >> 160n) & ((1n << 24n) - 1n));
                        if (tick & 0x800000) tick -= 0x1000000;

                        console.log(`✅ INITIALIZED: ${pair.name} [Fee: ${fee}, Term: ${tickSpacing}]`);
                        console.log(`   ID: ${poolId}`);
                        console.log(`   Price: ${price.toString()}`);
                        console.log(`   Tick: ${tick}`);

                        // Suggest Config
                        console.log(`   => READY FOR TRADING. Configure Bot with these params.`);
                    } else {
                        // console.log(`   . Uninitialized (${fee}/${tickSpacing})`);
                    }

                } catch (e) {
                    console.log(`   ❌ Error reading slot:`, e);
                }
            }
        }
    }
}

main();
