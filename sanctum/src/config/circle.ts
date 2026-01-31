"use client";

import { polygonAmoy, baseSepolia, arbitrumSepolia, sepolia } from "viem/chains";

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCLE MODULAR WALLET CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Circle Console credentials
// Get these from https://console.circle.com
// Note: Passkey transport expects base URL (https://modular-sdk.circle.com)
// Modular transport needs chain path appended (https://modular-sdk.circle.com/v1/basesepolia)
export const CIRCLE_CLIENT_URL = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL || "https://modular-sdk.circle.com";
export const CIRCLE_CLIENT_KEY = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY || "";

// Supported chains for Circle Smart Accounts
export const CIRCLE_SUPPORTED_CHAINS = {
    polygonAmoy,
    baseSepolia,
    arbitrumSepolia,
    sepolia,
} as const;

// Default chain for Circle operations
export const DEFAULT_CIRCLE_CHAIN = baseSepolia;

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCLE SMART ACCOUNT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CircleWalletState {
    isConnected: boolean;
    isConnecting: boolean;
    address: `0x${string}` | null;
    username: string | null;
    error: Error | null;
}

export const INITIAL_CIRCLE_STATE: CircleWalletState = {
    isConnected: false,
    isConnecting: false,
    address: null,
    username: null,
    error: null,
};
