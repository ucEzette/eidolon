"use client";

import { useAccount, useSignTypedData } from "wagmi";
import { parseUnits, type Address } from "viem";
import { CONTRACTS, PERMIT2_DOMAIN } from "@/config/web3";
import { useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// EIP-712 TYPE DEFINITIONS (Updated with isDualSided)
// ═══════════════════════════════════════════════════════════════════════════════

const PERMIT_WITNESS_TRANSFER_FROM_TYPES = {
    PermitWitnessTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "witness", type: "GhostPermit" },
    ],
    TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
    ],
    GhostPermit: [
        { name: "provider", type: "address" },
        { name: "currency", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "poolId", type: "bytes32" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "isDualSided", type: "bool" }, // New flag
    ],
} as const;

export interface SignedGhostPermit {
    token: Address;
    amount: bigint;
    nonce: bigint;
    deadline: bigint;
    poolId: `0x${string}`;
    hook: Address;
    signature: `0x${string}`;
    provider: Address;
    isDualSided: boolean;
}

export function useGhostPermit() {
    const { address, chain } = useAccount();
    const { signTypedDataAsync, isPending } = useSignTypedData();
    const [error, setError] = useState<string | null>(null);

    const signPermit = async (
        token: Address,
        amount: string,
        poolId: `0x${string}`,
        isDualSided: boolean,
        validityMinutes: number = 30,
        decimals: number = 18 // Default to 18 if not provided
    ): Promise<SignedGhostPermit | null> => {
        if (!address) {
            setError("Wallet not connected");
            return null;
        }

        try {
            setError(null);

            // Generate nonce (timestamp-based for demo)
            const nonce = BigInt(Date.now());

            // Calculate deadline
            const deadline = BigInt(
                Math.floor(Date.now() / 1000) + validityMinutes * 60
            );

            // Parse amount with correct decimals
            const parsedAmount = parseUnits(amount, decimals);

            // Get correct contract addresses
            const contracts = CONTRACTS.unichainSepolia;

            // Prepare witness data (GhostPermit struct)
            const witness = {
                provider: address,
                currency: token,
                amount: parsedAmount,
                poolId: poolId,
                deadline: deadline,
                nonce: nonce,
                isDualSided: isDualSided,
            };

            // Sign using EIP-712
            const signature = await signTypedDataAsync({
                domain: {
                    name: PERMIT2_DOMAIN.name,
                    chainId: chain?.id || 1301,
                    verifyingContract: contracts.permit2,
                },
                types: PERMIT_WITNESS_TRANSFER_FROM_TYPES,
                primaryType: "PermitWitnessTransferFrom",
                message: {
                    permitted: {
                        token: token,
                        amount: parsedAmount,
                    },
                    spender: contracts.eidolonHook,
                    nonce: nonce,
                    deadline: deadline,
                    witness: witness,
                },
            });

            return {
                token,
                amount: parsedAmount,
                nonce,
                deadline,
                poolId,
                hook: contracts.eidolonHook,
                signature,
                provider: address,
                isDualSided
            };

        } catch (err: any) {
            console.error("Error signing permit:", err);
            // Return raw error message for better debugging
            const errorMessage = err?.cause?.message || err?.shortMessage || err.message || "Failed to sign permit";
            setError(errorMessage);
            throw new Error(errorMessage); // Throw so SummoningPortal catches it
        }
    };

    return {
        signPermit,
        isPending,
        error
    };
}
