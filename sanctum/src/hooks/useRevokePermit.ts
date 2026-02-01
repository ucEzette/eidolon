"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS } from "@/config/web3";

// Minimal ABI for Permit2 invalidation
const PERMIT2_INVALIDATE_ABI = [
    {
        "inputs": [
            { "internalType": "uint256", "name": "wordPos", "type": "uint256" },
            { "internalType": "uint256", "name": "mask", "type": "uint256" }
        ],
        "name": "invalidateUnorderedNonces",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export function useRevokePermit() {
    const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash || undefined,
    });

    const revokePermit = async (nonceStr: string) => {
        try {
            const nonce = BigInt(nonceStr);
            const wordPos = nonce >> 8n;
            const bitPos = nonce & 0xFFn;
            const mask = 1n << bitPos;

            const contracts = CONTRACTS.unichainSepolia;

            const hash = await writeContractAsync({
                address: contracts.permit2,
                abi: PERMIT2_INVALIDATE_ABI,
                functionName: 'invalidateUnorderedNonces',
                args: [wordPos, mask],
            });

            setTxHash(hash);
            return hash;
        } catch (error) {
            console.error("Failed to revoke permit:", error);
            throw error;
        }
    };

    return {
        revokePermit,
        isPending: isWritePending || isConfirming,
        isConfirmed,
        error: writeError,
        txHash
    };
}
