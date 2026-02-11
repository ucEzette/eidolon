"use client";

import { useAccount, useSignTypedData } from "wagmi";
import { type Address } from "viem";
import { CONTRACTS, PERMIT2_DOMAIN } from "@/config/web3";
import { useState } from "react";
import { useCircleWallet } from "@/components/providers/CircleWalletProvider";
import { useLocalStorage } from "usehooks-ts";

// EIP-712 TYPE DEFINITIONS FOR STANDARD PERMIT2 ALLOWANCE
// ═══════════════════════════════════════════════════════════════════════════════

const PERMIT_SINGLE_TYPES = {
    PermitSingle: [
        { name: 'details', type: 'PermitDetails' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' }
    ],
    PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint160' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' }
    ]
} as const;

export interface SignedSessionPermit {
    permit: {
        details: {
            token: Address;
            amount: bigint;
            expiration: number;
            nonce: number;
        };
        spender: Address;
        sigDeadline: bigint;
    };
    signature: `0x${string}`;
    provider: Address;
}

export function useGhostSession() {
    const { address: wagmiAddress, chain } = useAccount();
    const { signTypedDataAsync, isPending: isWagmiPending } = useSignTypedData();
    const { isConnected: isCircleConnected, address: circleAddress, signTypedData: signTypedDataCircle, isConnecting: isCirclePending } = useCircleWallet();
    const [error, setError] = useState<string | null>(null);

    // Persistent Session State
    const [sessionExpiry, setSessionExpiry] = useLocalStorage<number | null>('eidolon-session-expiry', null);
    const [sessionProvider, setSessionProvider] = useLocalStorage<string | null>('eidolon-session-provider', null);

    const isPending = isWagmiPending || isCirclePending;
    const address = isCircleConnected ? circleAddress : wagmiAddress;

    const isSessionActive = sessionExpiry && sessionExpiry > Math.floor(Date.now() / 1000) && sessionProvider === address;

    const activateSession = async (
        token: Address,
        validityHours: number = 24
    ): Promise<SignedSessionPermit | null> => {
        if (!address) {
            setError("Wallet not connected");
            return null;
        }

        try {
            setError(null);

            // Generate nonce (timestamp-based for demo simplicity)
            const nonce = Math.floor(Date.now() / 1000) % 1000000;

            // Calculate deadline
            const validitySeconds = validityHours * 60 * 60;
            const expiration = Math.floor(Date.now() / 1000) + validitySeconds;
            const sigDeadline = expiration;

            // Max uint160 for "Infinite" Session allowance
            const amount = BigInt("1461501637330902918203684832716283019655932542975"); // type(uint160).max

            // Get correct contract addresses
            const contracts = CONTRACTS.unichainSepolia;

            const domain = {
                name: PERMIT2_DOMAIN.name,
                chainId: chain?.id || 1301,
                verifyingContract: contracts.permit2,
            };

            const types = PERMIT_SINGLE_TYPES;

            const message = {
                details: {
                    token: token,
                    amount: amount,
                    expiration: expiration,
                    nonce: nonce,
                },
                spender: contracts.eidolonHook,
                sigDeadline: BigInt(sigDeadline),
            };

            let signature: `0x${string}`;

            // EIP-712 Signing
            if (isCircleConnected) {
                // Circle Wallet might need number/string, but Wagmi needs BigInt.
                // For now, let's cast message for Circle if needed, but Wagmi is priority.
                const sig = await signTypedDataCircle({
                    domain,
                    types,
                    primaryType: "PermitSingle",
                    message: message as any // Cast to satisfy Circle's potential type divergence
                });
                if (!sig) throw new Error("Failed to sign with Passkey");
                signature = sig as `0x${string}`;
            } else {
                signature = await signTypedDataAsync({
                    domain,
                    types,
                    primaryType: "PermitSingle",
                    message,
                });
            }

            // Update Local State
            setSessionExpiry(expiration);
            setSessionProvider(address);

            return {
                permit: message,
                signature,
                provider: address
            };

        } catch (err: any) {
            console.error("Error activating session:", err);
            const errorMessage = err?.cause?.message || err?.shortMessage || err.message || "Failed to sign session permit";
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const clearSession = () => {
        setSessionExpiry(null);
        setSessionProvider(null);
    };

    return {
        activateSession,
        clearSession,
        isSessionActive,
        sessionExpiry,
        isPending,
        error
    };
}
