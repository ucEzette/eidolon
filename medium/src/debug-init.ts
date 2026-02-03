
import { createPublicClient, http, encodeAbiParameters, keccak256, parseAbi, hexToBigInt } from 'viem';
import { sepolia } from 'viem/chains';
import { CONFIG } from './config';

// Define Chain (Unichain Sepolia) manually if needed, or use sepolia config
const unichainSepolia = {
    id: 1301,
    name: 'Unichain Sepolia',
    network: 'unichain-sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://sepolia.unichain.org'] },
        public: { http: ['https://sepolia.unichain.org'] },
    },
} as const;

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http()
});

const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC" as `0x${string}`;
const HOOK = "0x2eb9Bc212868Ca74c0f9191B3a27990e0dfa80C8" as `0x${string}`;
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F" as `0x${string}`;
const NATIVE_ETH = "0x0000000000000000000000000000000000000000" as `0x${string}`;

const FEE = 3000;
const TICK_SPACING = 60;

// ABI
const ABI = parseAbi([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external payable returns (int24 tick)",
    "function pools(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
    "function extsload(bytes32 slot) external view returns (bytes32 value)"
]);

async function main() {
    console.log("🔍 Debugging Pool Initialization...");

    const currency0 = NATIVE_ETH < USDC ? NATIVE_ETH : USDC;
    const currency1 = NATIVE_ETH < USDC ? USDC : NATIVE_ETH;

    const poolKey = {
        currency0,
        currency1,
        fee: FEE,
        tickSpacing: TICK_SPACING,
        hooks: HOOK
    };

    // 1. Calculate ID
    const encoded = encodeAbiParameters(
        [
            { name: "currency0", type: "address" },
            { name: "currency1", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "tickSpacing", type: "int24" },
            { name: "hooks", type: "address" },
        ],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    );
    const poolId = keccak256(encoded);
    console.log(`🔑 Pool ID: ${poolId}`);

    // 2. Check Existence via Extsload (Slot 6)
    // Mapping pools is at slot 6.
    // Location = keccak256(key . slot)
    const mappingSlot = 6n;
    const slotKey = encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'uint256' }],
        [poolId, mappingSlot]
    );
    const poolStateSlot = keccak256(slotKey);
    console.log(`📦 Pool State Slot: ${poolStateSlot}`);

    try {
        const value = await client.readContract({
            address: POOL_MANAGER,
            abi: ABI,
            functionName: 'extsload',
            args: [poolStateSlot]
        });
        console.log("📊 Slot0 Raw Value:", value);

        const valueBI = hexToBigInt(value);
        if (valueBI !== 0n) {
            console.log("✅ Pool ALREADY Exists! (Found data in storage)");

            // Decode Slot0
            // struct Slot0 { uint160 sqrtPriceX96; int24 tick; uint24 protocolFee; uint24 lpFee; }
            // Packed in 32 bytes (from right/LSB):
            // sqrtPriceX96 (160 bits)
            // tick (24 bits)
            // protocolFee (24 bits)
            // lpFee (24 bits)
            const sqrtPriceX96 = valueBI & ((1n << 160n) - 1n);
            const tick = (valueBI >> 160n) & ((1n << 24n) - 1n); // This is unsigned, need to cast if negative
            const protocolFee = (valueBI >> 184n) & ((1n << 24n) - 1n);
            const lpFee = (valueBI >> 208n) & ((1n << 24n) - 1n);

            console.log("  -> sqrtPriceX96:", sqrtPriceX96.toString());
            console.log("  -> tick:", tick.toString());
            console.log("  -> protocolFee:", protocolFee.toString());
            console.log("  -> lpFee:", lpFee.toString());
            return;
        } else {
            console.log("❌ Pool NOT Initialized (Storage slot is 0)");
        }
    } catch (e) {
        console.error("⚠️ Failed to read extsload:", e);
    }

    // 3. Simulate Initialization
    console.log("🚀 Simulating Initialize...");

    // Price 3000 USDC/ETH.
    // Ratio = 3000 * 10^(6-18) = 3e-9. Sqrt = 5.477e-5.
    // X96 = 5.477e-5 * 2^96 ~ 4.33e24.
    // 4336601000000000000000000n
    const sqrtPriceX96 = 4336601000000000000000000n;

    try {
        const { result } = await client.simulateContract({
            address: POOL_MANAGER,
            abi: ABI,
            functionName: 'initialize',
            args: [poolKey, sqrtPriceX96],
            value: 0n,
            account: "0x68faEBF19FA57658d37bF885F5377f735FE97D70" // Mock sender
        });
        console.log("✅ Simulation SUCCESS! Result (Tick):", result);
    } catch (e: any) {
        console.error("❌ Simulation FAILED!");
        console.error("Reason:", e.shortMessage || e.message);
        if (e.data) console.error("Revert Data:", e.data);
    }
}

main();
