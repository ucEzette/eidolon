"use client";

import { http, createConfig } from "wagmi";
import { type Chain } from "viem";
import { mainnet } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// ═══════════════════════════════════════════════════════════════════════════════
// UNICHAIN SEPOLIA CHAIN DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const unichainSepolia: Chain = {
    id: 1301,
    name: "Unichain Sepolia",
    nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ["https://sepolia.unichain.org"],
        },
    },
    blockExplorers: {
        default: {
            name: "Unichain Explorer",
            url: "https://unichain-sepolia.blockscout.com",
        },
    },
    testnet: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATION (wagmi v2)
// ═══════════════════════════════════════════════════════════════════════════════

// WalletConnect project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const config = createConfig({
    ssr: true, // Required for Next.js to avoid hydration mismatch
    chains: [unichainSepolia, mainnet],
    connectors: [
        injected(), // EIP-6963 support (Best for Rabby, MetaMask, Phantom, etc.)
        coinbaseWallet({ appName: 'Eidolon' }),
        walletConnect({ projectId, showQrModal: false }),
    ],
    transports: {
        [unichainSepolia.id]: http("https://sepolia.unichain.org"),
        [mainnet.id]: http(),
    },
});

// Export chains for use elsewhere
export const chains = [unichainSepolia, mainnet] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTRACTS = {
    // Unichain Sepolia testnet - DEPLOYED & VERIFIED
    unichainSepolia: {
        eidolonHook: "0x1244359060e16429A5568085012606c0213020c8" as `0x${string}`,
        executor: "0x1318783e1b61d173315d566003836dc850B144C2" as `0x${string}`,
        poolManager: "0x00B036B58a818B1BC34d502D3fE730Db729e62AC" as `0x${string}`,
        permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
    }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EIP-712 DOMAIN
// ═══════════════════════════════════════════════════════════════════════════════

export const PERMIT2_DOMAIN = {
    name: "Permit2",
    chainId: unichainSepolia.id,
    verifyingContract: CONTRACTS.unichainSepolia.permit2,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FEE CONSTANTS (matching smart contract)
// ═══════════════════════════════════════════════════════════════════════════════

export const FEES = {
    SINGLE_SIDED_BPS: 2000,  // 20% (Lazy Investor)
    DUAL_SIDED_BPS: 1000,   // 10% (Pro LP)
    SUBSCRIBER_BPS: 0,       // 0%  (Members)
    MAX_BPS: 5000,          // 50% cap
    BPS_DENOMINATOR: 10000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL POOL PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

export const POOLS = {
    canonical: {
        fee: 3000,
        tickSpacing: 200,
    }
} as const;
