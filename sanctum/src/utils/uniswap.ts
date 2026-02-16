
import { encodeAbiParameters, keccak256, type Address } from "viem";

const Q96 = 2n ** 96n;

export function getPoolId(
    currency0: Address,
    currency1: Address,
    fee: number,
    tickSpacing: number,
    hooks: Address
): `0x${string}` {
    const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
        ? [currency0, currency1]
        : [currency1, currency0];

    const encoded = encodeAbiParameters(
        [
            { name: "currency0", type: "address" },
            { name: "currency1", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "tickSpacing", type: "int24" },
            { name: "hooks", type: "address" },
        ],
        [token0, token1, fee, tickSpacing, hooks]
    );

    return keccak256(encoded);
}

// BigInt square root (Newton's method)
function bigIntSqrt(value: bigint): bigint {
    if (value < 0n) throw new Error("Square root of negative number");
    if (value === 0n) return 0n;
    let z = value;
    let x = value / 2n + 1n;
    while (x < z) {
        z = x;
        x = (value / x + x) / 2n;
    }
    return z;
}

export function getSqrtPriceX96(
    price: number,
    token0Decimals: number,
    token1Decimals: number
): bigint {
    // price = token0 per token1 in human units (e.g., 3000 USDC per WETH)
    // Uniswap stores token1/token0 in raw units:
    //   ratio_raw = (1/price) * 10^(token1Decimals - token0Decimals)
    // sqrtPriceX96 = sqrt(ratio_raw) * 2^96 = sqrt(ratio_raw * 2^192)

    // Scale price to BigInt with 18 decimal precision
    const PRECISION = 18;
    const priceBigInt = BigInt(Math.round(price * (10 ** PRECISION))); // price * 10^18

    const decimalDiff = token1Decimals - token0Decimals;

    // ratio_raw = (1/price) * 10^decimalDiff = 10^decimalDiff / price
    // We compute: ratio_raw * 2^192 = (10^decimalDiff * 2^192 * 10^PRECISION) / priceBigInt
    let numerator = (10n ** BigInt(PRECISION)) * (1n << 192n);

    if (decimalDiff >= 0) {
        numerator = numerator * (10n ** BigInt(decimalDiff));
    } else {
        // Negative decimalDiff: multiply denominator instead (handled below)
    }

    let denominator = priceBigInt;
    if (decimalDiff < 0) {
        denominator = denominator * (10n ** BigInt(-decimalDiff));
    }

    const val = numerator / denominator;
    return bigIntSqrt(val);
}

// Helper for Pool State Slot
const POOLS_MAPPING_SLOT = 6n;
export const getPoolStateSlot = (poolId: `0x${string}` | undefined) => {
    if (!poolId) return undefined;
    return keccak256(encodeAbiParameters(
        [{ name: 'key', type: 'bytes32' }, { name: 'slot', type: 'uint256' }],
        [poolId, POOLS_MAPPING_SLOT]
    ));
}

// Helper for Ticks State Slot
const TICKS_MAPPING_SLOT = 5n;
export const getTicksStateSlot = (poolId: `0x${string}` | undefined, tick: number) => {
    if (!poolId) return undefined;
    const innerMappingSlot = keccak256(encodeAbiParameters(
        [{ name: 'key', type: 'bytes32' }, { name: 'slot', type: 'uint256' }],
        [poolId, TICKS_MAPPING_SLOT]
    ));
    return keccak256(encodeAbiParameters(
        [{ name: 'key', type: 'int24' }, { name: 'slot', type: 'uint256' }],
        [tick, BigInt(innerMappingSlot)]
    ));
}

import { TOKENS, type Token } from "@/config/tokens";

export function getTokenByAddress(address: string): Token | undefined {
    return TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
}

export function sqrtPriceToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): string {
    // Returns price as token0 per token1 (e.g., 3000 USDC per WETH)
    // Uniswap stores: sqrtPriceX96 = sqrt(token1_raw / token0_raw) * 2^96
    // raw_price (token1/token0) = sqrtPriceX96^2 / 2^192
    // human_price (token1/token0) = raw_price * 10^(decimals0 - decimals1)
    // We want token0/token1 = 1 / human_price

    const priceX96 = sqrtPriceX96 * sqrtPriceX96;
    const shift = 1n << 192n;

    // Compute token0/token1: shift / priceX96 * 10^(decimals1 - decimals0)
    const decimalDiff = BigInt(decimals1 - decimals0);

    let num = shift;
    let den = priceX96;

    if (decimalDiff > 0n) {
        num = num * (10n ** decimalDiff);
    } else if (decimalDiff < 0n) {
        den = den * (10n ** (-decimalDiff));
    }

    const floatPrecision = 1000000n;
    const resultBigInt = (num * floatPrecision) / den;

    return (Number(resultBigInt) / Number(floatPrecision)).toFixed(6);
}

// --- NEW HELPERS FOR LIQUIDITY AMOUNTS ---

function getSqrtRatioAtTick(tick: number): bigint {
    const absTick = tick < 0 ? -tick : tick;
    let ratio = (absTick & 0x1) != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001n : 0x100000000000000000000000000000000n;
    if ((absTick & 0x2) != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
    if ((absTick & 0x4) != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
    if ((absTick & 0x8) != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
    if ((absTick & 0x10) != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
    if ((absTick & 0x20) != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
    if ((absTick & 0x40) != 0) ratio = (ratio * 0xff2ea16466c96c3843ec3a8815466660n) >> 128n;
    if ((absTick & 0x80) != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
    if ((absTick & 0x100) != 0) ratio = (ratio * 0xfcbe86ad80ceaaef5e0050a647303374n) >> 128n;
    if ((absTick & 0x200) != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
    if ((absTick & 0x400) != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
    if ((absTick & 0x800) != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
    if ((absTick & 0x1000) != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
    if ((absTick & 0x2000) != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
    if ((absTick & 0x4000) != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
    if ((absTick & 0x8000) != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
    if ((absTick & 0x10000) != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
    if ((absTick & 0x20000) != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
    if ((absTick & 0x40000) != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
    if ((absTick & 0x80000) != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

    if (tick > 0) ratio = (0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn / ratio);

    // safe up to maxTick ~887k
    return (ratio * Q96) >> 128n; // This is a rough approx of TickMath? no, let's use a simpler way or standard library logic if possible, but this needs to be precise.
    // Actually, implementing full TickMath in TS is verbose.
    // Let's use `Math.pow` approach for display purposes which is sufficient.
    // sqrt(1.0001^tick) * 2^96
}

export function getAmountsForLiquidity(
    liquidity: bigint,
    sqrtPriceX96: bigint,
    tickLower: number,
    tickUpper: number
): { amount0: bigint, amount1: bigint } {
    const Q96 = 2n ** 96n;

    const sqrtRatioA = getSqrtRatioAtTick(tickLower);
    const sqrtRatioB = getSqrtRatioAtTick(tickUpper);

    let sqrtRatioL = sqrtRatioA;
    let sqrtRatioR = sqrtRatioB;
    if (sqrtRatioA > sqrtRatioB) {
        sqrtRatioL = sqrtRatioB;
        sqrtRatioR = sqrtRatioA;
    }

    let amount0 = 0n;
    let amount1 = 0n;

    if (sqrtPriceX96 <= sqrtRatioL) {
        // Price below range: All Amount0
        // amount0 = L * (1/sqrtP_L - 1/sqrtP_R)
        // amount0 = L * (sqrtRatioR - sqrtRatioL) / (sqrtRatioL * sqrtRatioR)
        // Adjust for Q96
        const num = liquidity * (sqrtRatioR - sqrtRatioL);
        const den = (sqrtRatioL * sqrtRatioR) / Q96;
        amount0 = num / den;
    } else if (sqrtPriceX96 < sqrtRatioR) {
        // Price in range
        // amount0 = L * (1/sqrtP - 1/sqrtP_R)
        const num0 = liquidity * (sqrtRatioR - sqrtPriceX96);
        const den0 = (sqrtPriceX96 * sqrtRatioR) / Q96;
        amount0 = num0 / den0;

        // amount1 = L * (sqrtP - sqrtP_L)
        amount1 = (liquidity * (sqrtPriceX96 - sqrtRatioL)) / Q96;
    } else {
        // Price above range: All Amount1
        // amount1 = L * (sqrtP_R - sqrtP_L)
        amount1 = (liquidity * (sqrtRatioR - sqrtRatioL)) / Q96;
    }

    return { amount0, amount1 };
}
