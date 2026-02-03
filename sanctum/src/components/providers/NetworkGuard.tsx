"use client";

import { useEffect, useRef } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { unichainSepolia } from "@/config/web3";

export function NetworkGuard() {
    const { isConnected, chainId } = useAccount();
    const { switchChain, error: switchError } = useSwitchChain();

    // Use a ref to prevent spamming switch requests
    const switchAttempted = useRef(false);

    useEffect(() => {
        if (!isConnected) return;

        // Unichain Sepolia ID = 1301
        if (chainId !== unichainSepolia.id) {
            console.log(`Wrong network detected (${chainId}). Forcing switch to Unichain Sepolia (${unichainSepolia.id})...`);

            if (switchChain) {
                try {
                    switchChain({ chainId: unichainSepolia.id });
                } catch (e) {
                    console.error("Failed to force switch network:", e);
                }
            } else {
                console.warn("Switch Chain not supported by connector.");
            }
        }
    }, [isConnected, chainId, switchChain]);

    if (switchError) {
        // Optional: Render a non-intrusive error toast or banner?
        // For now, we rely on the wallet's native modal error.
        console.error("Network Guard Switch Error:", switchError);
    }

    return null; // Headless component
}
