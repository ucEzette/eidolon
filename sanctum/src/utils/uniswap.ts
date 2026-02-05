import { encodeAbiParameters, keccak256, type Address } from "viem";

export function getPoolId(
    currency0: Address,
    currency1: Address,
    fee: number,
    tickSpacing: number,
    hooks: Address
): `0x${string}` {
    // Sort currencies
    const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
        ? [currency0, currency1]
        : [currency1, currency0];

    // Encode PoolKey
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

export function getSqrtPriceX96(
    price: number,
    token0Decimals: number,
    token1Decimals: number
): bigint {
    // 1. Adjust price for decimals: price * 10^(d1 - d0) ? No.
    // Real Price P = (amount1 / 10^d1) / (amount0 / 10^d0)
    // SqrtPriceX96 = sqrt(P) * 2^96

    // For simplicity in this demo, assuming standard encoding:
    // We treat 'price' as the raw ratio if decimals were equal, then adjust? 
    // Let's use the simpler method: sqrt(price) * 2^96 
    // But we must account for decimal difference.

    // Example: ETH (18) / USDC (6). Price 3000.
    // 1 ETH = 3000 USDC.
    // Token0 = ETH, Token1 = USDC.
    // Price = amount1/amount0 = 3000 * 10^6 / 10^18 = 3000 * 10^-12 = 3 * 10^-9.
    // This is very small.

    // Correction: Valid price input usually assumes Human Readable.
    // We convert Human Price to Raw Price.

    // We can do this roughly with number for UI entry or use a library
    // Let's use a robust approximation for the UI:

    const ratio = price * Math.pow(10, token1Decimals - token0Decimals);
    const sqrtRatio = Math.sqrt(ratio);
    const Q96 = BigInt(2) ** BigInt(96);

    return BigInt(Math.floor(sqrtRatio * Number(Q96)));
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
const TICKS_MAPPING_SLOT = 5n; // Assuming slot 5 for ticks mapping in PoolManager
export const getTicksStateSlot = (poolId: `0x${string}` | undefined, tick: number) => {
    if (!poolId) return undefined;
    // Mapping keys: poolId -> tick -> value
    // First map: poolId -> mapping
    const innerMappingSlot = keccak256(encodeAbiParameters(
        [{ name: 'key', type: 'bytes32' }, { name: 'slot', type: 'uint256' }],
        [poolId, TICKS_MAPPING_SLOT]
    ));
    // Second map: tick -> value
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
    const priceX96 = sqrtPriceX96 * sqrtPriceX96;
    const shift = 1n << 192n;
    const decimalDiff = BigInt(decimals0 - decimals1);

    let num = priceX96;
    let den = shift;

    if (decimalDiff > 0n) {
        num = num * (10n ** decimalDiff);
    } else {
        den = den * (10n ** (-decimalDiff));
    }

    const floatPrecision = 1000000n; // 6 decimals precision
    const resultBigInt = (num * floatPrecision) / den;

    return (Number(resultBigInt) / Number(floatPrecision)).toFixed(6);
}
