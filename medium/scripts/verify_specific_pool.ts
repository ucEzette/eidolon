
import { createPublicClient, http, encodeAbiParameters, keccak256, parseAbi, hexToBigInt } from 'viem';
import { unichainSepolia } from 'viem/chains';
import { CONFIG } from '../src/config';

// TARGET CONFIGURATION
// From User Trace:
// Token0: 0x0000000000000000000000000000000000000000
// Token1: 0xe02eb159eb92dd0388ecdb33d0db0f8831091be6
// Fee: 3000
// TickSpacing: 60
// Hook: 0xa5CC49688cB5026977a2A501cd7dD3daB2C580c8

const TARGET = {
    token0: "0x0000000000000000000000000000000000000000",
    token1: "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6",
    fee: 3000,
    tickSpacing: 200,
    hooks: "0xa5CC49688cB5026977a2A501cd7dD3daB2C580c8"
};

const POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http(CONFIG.RPC_URL)
});

async function main() {
    console.log("🔍 INSPECTING TARGET POOL:");
    console.log(TARGET);

    // 1. Calculate Pool ID matches
    const packed = encodeAbiParameters(
        [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' }
        ],
        [TARGET.token0 as `0x${string}`, TARGET.token1 as `0x${string}`, TARGET.fee, TARGET.tickSpacing, TARGET.hooks as `0x${string}`]
    );
    const poolId = keccak256(packed);
    console.log("\n🆔 Calculated Pool ID:", poolId);

    // 2. call getSlot0 directly
    console.log("\n📡 Checking getSlot0()...");
    try {
        const slot0Address = await client.readContract({
            address: POOL_MANAGER,
            abi: parseAbi([
                "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
            ]),
            functionName: 'getSlot0',
            args: [poolId]
        });
        console.log("✅ getSlot0 Success:", slot0Address);

        const [price] = slot0Address as [bigint, number, number, number];
        if (price > 0n) {
            console.log("   --> STATE: INITIALIZED");
        } else {
            console.log("   --> STATE: UNINITIALIZED (Price 0)");
        }

    } catch (e: any) {
        console.log("❌ getSlot0 Reverted/Failed:", e.shortMessage || e.message);
        console.log("   --> STATE: UNINITIALIZED (Likely)");
    }

    // 3. Simulate Initialize
    console.log("\n🧪 Simulating initialize()...");
    try {
        // SqrtPrice for 3000 (approx 1:1 parity for now, purely for test)
        // 79228162514264337593543950336 = 1.0
        const SQRT_PRICE_1_1 = 79228162514264337593543950336n;

        await client.simulateContract({
            address: POOL_MANAGER,
            abi: parseAbi([
                "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external payable returns (int24 tick)"
            ]),
            functionName: 'initialize',
            args: [
                {
                    currency0: TARGET.token0 as `0x${string}`,
                    currency1: TARGET.token1 as `0x${string}`,
                    fee: TARGET.fee,
                    tickSpacing: TARGET.tickSpacing,
                    hooks: TARGET.hooks as `0x${string}`
                },
                SQRT_PRICE_1_1
            ],
            account: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`
            // Actually simulateContract usually works without account if view, but initialize is write.
            // We'll see if it needs an account. It shouldn't strictly require one for simulation logic unless access control.
        });
        console.log("✅ Initialize Simulation Success!");
        console.log("   --> CONCLUSION: Pool WAS NOT initialized. You can initialize it.");

    } catch (e: any) {
        console.log("❌ Initialize Simulation Failed/Reverted:", e.shortMessage || e.message);
        if (e.message.includes("PoolAlreadyInitialized") || e.data?.includes("7983c051")) {
            console.log("   --> CONCLUSION: Pool IS ALREADY INITIALIZED (Confirmed via Revert).");
        }
    }
    // 4. Simulate Swap
    console.log("\n🧪 Simulating swap()...");
    try {
        await client.simulateContract({
            address: POOL_MANAGER,
            abi: parseAbi([
                "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes testSettings) external payable returns (int256 delta)"
            ]),
            functionName: 'swap',
            args: [
                {
                    currency0: TARGET.token0 as `0x${string}`,
                    currency1: TARGET.token1 as `0x${string}`,
                    fee: TARGET.fee,
                    tickSpacing: TARGET.tickSpacing,
                    hooks: TARGET.hooks as `0x${string}`
                },
                {
                    zeroForOne: true,
                    amountSpecified: -100n, // Exact Input 100
                    sqrtPriceLimitX96: 4295128739n + 1n // MIN_SQRT_PRICE + 1
                },
                "0x" // testSettings
            ],
            account: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`
        });
        console.log("✅ Swap Simulation Success!");
        console.log("   --> CONCLUSION: Pool IS INITIALIZED (Swap worked).");

    } catch (e: any) {
        console.log("❌ Swap Simulation Failed/Reverted:", e.shortMessage || e.message);
        if (e.message.includes("PoolNotInitialized") || e.data?.includes("486aa307")) {
            console.log("   --> CONCLUSION: Pool IS NOT INITIALIZED (Swap Reverted PoolNotInitialized).");
        } else if (e.message.includes("PoolAlreadyInitialized") || e.data?.includes("7983c051")) {
            console.log("   --> CONCLUSION: Pool IS ALREADY INITIALIZED (Weird to see this on swap).");
        } else {
            console.log("   --> OTHER ERROR: Might imply initialized but logic failure (e.g. balance/limit).");
            // If error is NOT PoolNotInitialized, then Pool LIKELY EXISTS.
            // e.g. "PriceLimitAlreadyExceeded" -> Pool Exists!
        }
    }
}


main();
