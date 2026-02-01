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
