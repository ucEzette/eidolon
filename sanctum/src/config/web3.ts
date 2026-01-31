"use client";

import { http, createConfig } from "wagmi";
import { baseSepolia, mainnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATION (wagmi v2)
// ═══════════════════════════════════════════════════════════════════════════════

// WalletConnect project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const config = createConfig({
    chains: [baseSepolia, mainnet],
    connectors: [
        injected(),
        walletConnect({ projectId }),
    ],
    transports: {
        [baseSepolia.id]: http(),
        [mainnet.id]: http(),
    },
});

// Export chains for use elsewhere
export const chains = [baseSepolia, mainnet] as const;

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
