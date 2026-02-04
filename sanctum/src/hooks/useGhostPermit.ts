"use client";

import { useAccount, useSignTypedData } from "wagmi";
import { parseUnits, type Address } from "viem";
import { CONTRACTS, PERMIT2_DOMAIN } from "@/config/web3";
import { useState } from "react";
import { useCircleWallet } from "@/components/providers/CircleWalletProvider";

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
    const { address: wagmiAddress, chain } = useAccount();
    const { signTypedDataAsync, isPending: isWagmiPending } = useSignTypedData();
    const { isConnected: isCircleConnected, address: circleAddress, signTypedData: signTypedDataCircle, isConnecting: isCirclePending } = useCircleWallet();
    const [error, setError] = useState<string | null>(null);

    const isPending = isWagmiPending || isCirclePending;
    const address = isCircleConnected ? circleAddress : wagmiAddress;

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

            const domain = {
                name: PERMIT2_DOMAIN.name,
                chainId: chain?.id || 1301,
                verifyingContract: contracts.permit2,
            };

            const types = PERMIT_WITNESS_TRANSFER_FROM_TYPES;

            const message = {
                permitted: {
                    token: token,
                    amount: parsedAmount,
                },
                spender: contracts.eidolonHook,
                nonce: nonce,
                deadline: deadline,
                witness: witness,
            };

            let signature: `0x${string}`;

            if (isCircleConnected) {
                console.log("Signing with Circle Passkey Wallet...");
                // Circle expects the standard object structure
                const sig = await signTypedDataCircle({
                    domain,
                    types,
                    primaryType: "PermitWitnessTransferFrom",
                    message
                });

                if (!sig) throw new Error("Failed to sign with Passkey");
                signature = sig as `0x${string}`;
            } else {
                // Sign using Wagmi (EIP-712)
                signature = await signTypedDataAsync({
                    domain,
                    types,
                    primaryType: "PermitWitnessTransferFrom",
                    message,
                });
            }

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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
