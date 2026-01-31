"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiConfig } from "wagmi";
import { config } from "@/config/web3";
import { useState, type ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// WEB3 PROVIDER
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
        <WagmiConfig config={config}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiConfig>
    );
}
