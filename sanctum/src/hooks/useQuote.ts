"use client";

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, unichainSepolia } from '@/config/web3';
import { QuoterV2ABI } from '@/abi/QuoterV2';

interface QuoteParams {
    token0: string;
    token1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
    zeroForOne: boolean;
    amountIn: string;
    decimalsIn: number;
    decimalsOut: number;
}

interface QuoteResult {
    amountOut: string | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useQuote(params: QuoteParams | null): QuoteResult {
    const [amountOut, setAmountOut] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const publicClient = usePublicClient({ chainId: unichainSepolia.id });

    const fetchQuote = useCallback(async () => {
        if (!params || !publicClient || !params.amountIn || isNaN(Number(params.amountIn))) {
            setAmountOut(null);
            return;
        }

        const { token0, token1, fee, tickSpacing, hooks, zeroForOne, amountIn, decimalsIn, decimalsOut } = params;

        // Log params for debugging
        console.log("Fetching Quote Params:", params);

        // Sort tokens for PoolKey (Uniswap V4 requires sorted order)
        const [currency0, currency1] = token0.toLowerCase() < token1.toLowerCase()
            ? [token0, token1]
            : [token1, token0];

        try {
            setIsLoading(true);
            setError(null);

            const inputDecimals = decimalsIn;
            const outputDecimals = decimalsOut;

            const exactAmount = parseUnits(amountIn, inputDecimals);

            // Determine actual zeroForOne based on sorted order
            // If user's token0 IS currency0, keep direction as-is
            // If user's token0 IS currency1, flip direction
            const actualZeroForOne = token0.toLowerCase() === currency0.toLowerCase()
                ? zeroForOne
                : !zeroForOne;

            const quoteParams = {
                poolKey: {
                    currency0: currency0 as `0x${string}`,
                    currency1: currency1 as `0x${string}`,
                    fee: fee,
                    tickSpacing: tickSpacing,
                    hooks: hooks as `0x${string}`,
                },
                zeroForOne: actualZeroForOne,
                exactAmount: exactAmount,
                hookData: '0x' as `0x${string}`,
            };

            console.log("Simulating Contract with:", quoteParams);

            // Use eth_call to simulate the quote (V4Quoter returns amountOut directly)
            const result = await publicClient.simulateContract({
                address: CONTRACTS.unichainSepolia.quoter,
                abi: QuoterV2ABI,
                functionName: 'quoteExactInputSingle',
                args: [quoteParams],
            });

            console.log("Quote Result:", result);

            // V4Quoter returns: [amountOut, gasEstimate]
            const [amountOut_raw] = result.result as [bigint, bigint];

            const formatted = formatUnits(amountOut_raw, outputDecimals);
            const numValue = parseFloat(formatted);
            setAmountOut(isNaN(numValue) ? '0' : numValue.toLocaleString('en-US', { maximumFractionDigits: 6 }));

        } catch (e: any) {
            console.error('Quote error:', e);
            // Extract detailed revert reason if possible
            const revertReason = e.walk ? e.walk((err: any) => err.data)?.data : null;
            if (revertReason) console.error("Revert Reason Data:", revertReason);

            setError(e.message || 'Failed to fetch quote');
            setAmountOut(null);
        } finally {
            setIsLoading(false);
        }
    }, [params, publicClient]);

    // Debounced fetch on params change
    useEffect(() => {
        const timer = setTimeout(fetchQuote, 300);
        return () => clearTimeout(timer);
    }, [fetchQuote]);

    return {
        amountOut,
        isLoading,
        error,
        refetch: fetchQuote,
    };
}
