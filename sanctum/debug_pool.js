
const { createPublicClient, http, parseAbi, encodePacked, keccak256 } = require('viem');
const { unichainSepolia } = require('viem/chains');

const POOL_MANAGER = '0x00B036B58a818B1BC34d502D3fE730Db729e62AC'; // Correct Unichain Sepolia address
// Actually, let's read the config first or use the one from the file view earlier: 
// CONTRACTS.unichainSepolia.poolManager
// I need the actual addresses. 
// From previous views: 
// LiquidityProvider: ?
// PoolManager: ? 
// Hook: 0x296bA69b1F79d0eb0Ca812C5cf58FC2f4C0Bb0C8 (from user screenshot)

const RPC_URL = 'https://sepolia.unichain.org'; // Assuming

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http()
});

const POOL_MANAGER_ABI = parseAbi([
    "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
]);

const TOKENS = {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x31d0220469e10c4E71834a79b1f276d740d3768F'
};

const HOOK = '0x296bA69b1F79d0eb0Ca812C5cf58FC2f4C0Bb0C8';

const FEE = 3000;
const TICK_SPACING = 60;

function getPoolId(t0, t1, fee, ts, hook) {
    // Sort tokens
    const sorted = t0.toLowerCase() < t1.toLowerCase() ? [t0, t1] : [t1, t0];
    const token0 = sorted[0];
    const token1 = sorted[1];

    console.log(`Config: ${token0} / ${token1} / ${fee} / ${ts} / ${hook}`);

    const API_VERSION = '0x00000000000000000000000000000000'; // Assuming pure V4 or similar? V4 usually has specific struct.

    // PoolKey struct: currency0, currency1, fee, tickSpacing, hooks
    // packed: currency0(20) + currency1(20) + fee(3) + tickSpacing(3) + hooks(20) ... wait, encoding is standard abi.encode

    // V4 PoolId is keccak256(abi.encode(key))

    const encoded = require('viem').encodeAbiParameters(
        [
            { type: 'address' },
            { type: 'address' },
            { type: 'uint24' },
            { type: 'int24' },
            { type: 'address' }
        ],
        [token0, token1, fee, ts, hook]
    );

    return keccak256(encoded);
}

async function check() {
    // 1. Correct Order
    const id1 = getPoolId(TOKENS.WETH, TOKENS.USDC, FEE, TICK_SPACING, HOOK);
    console.log(`Pool ID (Sorted): ${id1}`);

    try {
        const slot0 = await client.readContract({
            address: POOL_MANAGER,
            abi: POOL_MANAGER_ABI,
            functionName: 'getSlot0',
            args: [id1]
        });
        console.log('Slot0 (Sorted):', slot0);
    } catch (e) {
        console.log('Error reading slot0 (Sorted):', e);
    }

    // 2. Incorrect Order (just in case frontend is dumb)
    // ...
}

check();
