"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/web3";
import { useState, type ReactNode } from "react";
import { CircleWalletProvider } from "./CircleWalletProvider";

// ═══════════════════════════════════════════════════════════════════════════════
// WEB3 PROVIDER (wagmi v2)
// ═══════════════════════════════════════════════════════════════════════════════

interface Web3ProviderProps {
    children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <CircleWalletProvider>
                    {children}
                </CircleWalletProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
