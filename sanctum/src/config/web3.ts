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
        eidolonHook: "0x78bb3Cc9986310FB935485192adB2Fe18C5c20C8" as `0x${string}`,
        executor: "0x1318783e1b61d173315d566003836dc850B144C2" as `0x${string}`,
        poolManager: "0x00B036B58a818B1BC34d502D3fE730Db729e62AC" as `0x${string}`,
        permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
        quoter: "0x56dcd40a3f2d466f48e7f48bdbe5cc9b92ae4472" as `0x${string}`,
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
// CANONICAL POOL PARAMETERS - SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════════════════════

export const POOL_CONFIG = {
    // Default fee and tickSpacing for all pools
    fee: 3000,
    tickSpacing: 60,
    hook: CONTRACTS.unichainSepolia.eidolonHook,
} as const;

// Use POOL_CONFIG for backwards compatibility
export const POOLS = {
    canonical: {
        fee: POOL_CONFIG.fee,
        tickSpacing: POOL_CONFIG.tickSpacing,
    }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN ADDRESSES - UNICHAIN SEPOLIA
// ═══════════════════════════════════════════════════════════════════════════════

export const TOKENS = {
    ETH: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    USDC: "0x31d0220469e10c4E71834a79b1f276d740d3768F" as `0x${string}`,
    eiETH: "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6" as `0x${string}`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZED POOLS - These pools are confirmed initialized on-chain
// ═══════════════════════════════════════════════════════════════════════════════

export const INITIALIZED_POOLS = [
    {
        name: "USDC/WETH",
        token0: TOKENS.USDC,
        token1: TOKENS.WETH,
        fee: POOL_CONFIG.fee,
        tickSpacing: POOL_CONFIG.tickSpacing,
        hook: POOL_CONFIG.hook,
    },
    {
        name: "WETH/eiETH",
        token0: TOKENS.WETH, // WETH < eiETH alphabetically
        token1: TOKENS.eiETH,
        fee: POOL_CONFIG.fee,
        tickSpacing: POOL_CONFIG.tickSpacing,
        hook: POOL_CONFIG.hook,
    },
] as const;

