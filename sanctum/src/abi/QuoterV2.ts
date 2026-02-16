// Uniswap V4 V4Quoter ABI — matches deployed V4Quoter (v4-periphery/src/lens/V4Quoter.sol)
// QuoteExactSingleParams: { PoolKey poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData }
// Returns: (uint256 amountOut, uint256 gasEstimate)

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
                "internalType": "struct IV4Quoter.QuoteExactParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "quoteExactInput",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" },
            { "internalType": "uint256", "name": "gasEstimate", "type": "uint256" }
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
                "internalType": "struct IV4Quoter.QuoteExactSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "quoteExactInputSingle",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" },
            { "internalType": "uint256", "name": "gasEstimate", "type": "uint256" }
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
                "internalType": "struct IV4Quoter.QuoteExactSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "quoteExactOutputSingle",
        "outputs": [
            { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
            { "internalType": "uint256", "name": "gasEstimate", "type": "uint256" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export default QuoterV2ABI;
