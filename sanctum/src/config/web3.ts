"use client";

import { configureChains, createConfig } from "wagmi";
import { baseSepolia, mainnet } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { InjectedConnector } from "wagmi/connectors/injected";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const { chains, publicClient, webSocketPublicClient } = configureChains(
    [baseSepolia, mainnet],
    [publicProvider()]
);

export { chains };

// ═══════════════════════════════════════════════════════════════════════════════
// WAGMI CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

// WalletConnect project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const config = createConfig({
    autoConnect: true,
    connectors: [
        new InjectedConnector({ chains }),
        new WalletConnectConnector({
            chains,
            options: {
                projectId,
            },
        }),
    ],
    publicClient,
    webSocketPublicClient,
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTRACTS = {
    // Base Sepolia testnet addresses (to be deployed)
    baseSepolia: {
        eidolonHook: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
        poolManager: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EIP-712 DOMAIN
// ═══════════════════════════════════════════════════════════════════════════════

export const PERMIT2_DOMAIN = {
    name: "Permit2",
    chainId: baseSepolia.id,
    verifyingContract: CONTRACTS.baseSepolia.permit2,
} as const;
