// Uniswap V4 QuoterV2 ABI (minimal interface for quoting)
// Reference: https://docs.uniswap.org/contracts/v4/reference/periphery/lens/Quoter

export const QuoterV2ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "Currency", "name": "exactCurrency", "type": "address" },
                    {
                        "components": [
                            { "internalType": "Currency", "name": "intermediateCurrency", "type": "address" },
                            { "internalType": "uint24", "name": "fee", "type": "uint24" },
                            { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                            { "internalType": "contract IHooks", "name": "hooks", "type": "address" },
                            { "internalType": "bytes", "name": "hookData", "type": "bytes" }
                        ],
                        "internalType": "struct PathKey[]",
                        "name": "path",
                        "type": "tuple[]"
                    },
                    { "internalType": "uint128", "name": "exactAmount", "type": "uint128" }
                ],
                "internalType": "struct IQuoter.QuoteExactParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "quoteExactInput",
        "outputs": [
            { "internalType": "int128[]", "name": "deltaAmounts", "type": "int128[]" },
            { "internalType": "uint160[]", "name": "sqrtPriceX96AfterList", "type": "uint160[]" },
            { "internalType": "uint32[]", "name": "initializedTicksLoadedList", "type": "uint32[]" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "components": [
                            { "internalType": "Currency", "name": "currency0", "type": "address" },
                            { "internalType": "Currency", "name": "currency1", "type": "address" },
                            { "internalType": "uint24", "name": "fee", "type": "uint24" },
                            { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                            { "internalType": "contract IHooks", "name": "hooks", "type": "address" }
                        ],
                        "internalType": "struct PoolKey",
                        "name": "poolKey",
                        "type": "tuple"
                    },
                    { "internalType": "bool", "name": "zeroForOne", "type": "bool" },
                    { "internalType": "uint128", "name": "exactAmount", "type": "uint128" },
                    { "internalType": "bytes", "name": "hookData", "type": "bytes" }
                ],
                "internalType": "struct IQuoter.QuoteExactSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "quoteExactInputSingle",
        "outputs": [
            { "internalType": "int128[]", "name": "deltaAmounts", "type": "int128[]" },
            { "internalType": "uint160", "name": "sqrtPriceX96After", "type": "uint160" },
            { "internalType": "uint32", "name": "initializedTicksLoaded", "type": "uint32" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "components": [
                            { "internalType": "Currency", "name": "currency0", "type": "address" },
                            { "internalType": "Currency", "name": "currency1", "type": "address" },
                            { "internalType": "uint24", "name": "fee", "type": "uint24" },
                            { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                            { "internalType": "contract IHooks", "name": "hooks", "type": "address" }
                        ],
                        "internalType": "struct PoolKey",
                        "name": "poolKey",
                        "type": "tuple"
                    },
                    { "internalType": "bool", "name": "zeroForOne", "type": "bool" },
                    { "internalType": "uint128", "name": "exactAmount", "type": "uint128" },
                    { "internalType": "bytes", "name": "hookData", "type": "bytes" }
                ],
                "internalType": "struct IQuoter.QuoteExactSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "quoteExactOutputSingle",
        "outputs": [
            { "internalType": "int128[]", "name": "deltaAmounts", "type": "int128[]" },
            { "internalType": "uint160", "name": "sqrtPriceX96After", "type": "uint160" },
            { "internalType": "uint32", "name": "initializedTicksLoaded", "type": "uint32" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export default QuoterV2ABI;
