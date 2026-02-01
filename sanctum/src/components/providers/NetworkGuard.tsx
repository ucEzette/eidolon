"use client";

import { useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { unichainSepolia } from "@/config/web3";
import { toast } from "sonner"; // Assuming sonner is used, or fallback to console/alert if not

export function NetworkGuard({ children }: { children: React.ReactNode }) {
    const { chain, isConnected } = useAccount();
    const { switchChain, error: switchError } = useSwitchChain();
    const hasAttemptedSwitch = useRef(false);

    useEffect(() => {
        // Only proceed if connected and on the wrong chain
        if (!isConnected || !chain) return;

        if (chain.id !== unichainSepolia.id) {
            console.log(`[NetworkGuard] Detected wrong chain: ${chain.id}. Expected: ${unichainSepolia.id}`);

            // Prevent infinite loops or spamming
            if (hasAttemptedSwitch.current) return;

            hasAttemptedSwitch.current = true;

            try {
                switchChain({ chainId: unichainSepolia.id });
            } catch (err) {
                console.error("Failed to auto-switch network:", err);
            }
        } else {
            // Reset if we are on the correct chain
            hasAttemptedSwitch.current = false;
        }
    }, [chain, isConnected, switchChain]);

    // Handle errors (like user rejection)
    useEffect(() => {
        if (switchError) {
            console.error("Network switch error:", switchError);
            // Reset so we can try again if the user changes their mind or fixes the issue manually
            hasAttemptedSwitch.current = false;
        }
    }, [switchError]);

    return <>{children}</>;
}
