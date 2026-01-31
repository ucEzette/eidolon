"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { createPublicClient } from "viem";
import {
    CIRCLE_CLIENT_URL,
    CIRCLE_CLIENT_KEY,
    DEFAULT_CIRCLE_CHAIN,
    CircleWalletState,
    INITIAL_CIRCLE_STATE,
} from "@/config/circle";

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCLE WALLET CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface CircleWalletContextValue extends CircleWalletState {
    // Actions
    registerPasskey: (username: string) => Promise<void>;
    loginWithPasskey: (username: string) => Promise<void>;
    disconnect: () => void;
    signMessage: (message: string) => Promise<string | null>;
    signTypedData: (typedData: any) => Promise<string | null>;
    // Clients
    smartAccount: any | null;
    publicClient: any | null;
}

const CircleWalletContext = createContext<CircleWalletContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface CircleWalletProviderProps {
    children: ReactNode;
}

export function CircleWalletProvider({ children }: CircleWalletProviderProps) {
    const [state, setState] = useState<CircleWalletState>(INITIAL_CIRCLE_STATE);
    const [smartAccount, setSmartAccount] = useState<any | null>(null);
    const [publicClient, setPublicClient] = useState<any | null>(null);

    // Helper to create clients and smart account from credential
    const initializeAccount = useCallback(async (credential: any, username: string) => {
        try {
            // Dynamic import of Circle SDK (browser-only)
            const { toCircleSmartAccount, toModularTransport } = await import("@circle-fin/modular-wallets-core");
            const { toWebAuthnAccount } = await import("viem/account-abstraction");

            // Helper to get Circle-compatible chain slug
            const getCircleChainSlug = (chain: any) => {
                switch (chain.id) {
                    case 80002: return "polygonAmoy";
                    case 421614: return "arbitrumSepolia";
                    case 84532: return "baseSepolia";
                    case 11155111: return "sepolia";
                    default: return chain.name.toLowerCase().replace(/\s+/g, "");
                }
            };

            // Create modular transport
            // Bundler operations are chain-specific, so we append the chain name
            const chainPath = getCircleChainSlug(DEFAULT_CIRCLE_CHAIN);
            const modularTransport = toModularTransport(
                `${CIRCLE_CLIENT_URL}/${chainPath}`,
                CIRCLE_CLIENT_KEY
            );

            // Create public client
            const client = createPublicClient({
                chain: DEFAULT_CIRCLE_CHAIN,
                transport: modularTransport,
            });

            // Create Circle Smart Account
            const account = await toCircleSmartAccount({
                client,
                owner: toWebAuthnAccount({ credential }),
            });

            setPublicClient(client);
            setSmartAccount(account);

            setState({
                isConnected: true,
                isConnecting: false,
                address: account.address as `0x${string}`,
                username,
                error: null,
            });
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isConnecting: false,
                error: error as Error,
            }));
            throw error;
        }
    }, []);

    // Register new passkey
    const registerPasskey = useCallback(async (username: string) => {
        if (!CIRCLE_CLIENT_KEY) {
            throw new Error("Circle API credentials not configured. Please set NEXT_PUBLIC_CIRCLE_CLIENT_KEY.");
        }

        setState((prev) => ({ ...prev, isConnecting: true, error: null }));

        try {
            // Dynamic import of Circle SDK (browser-only)
            const { toPasskeyTransport, toWebAuthnCredential, WebAuthnMode } = await import("@circle-fin/modular-wallets-core");

            const passkeyTransport = toPasskeyTransport(CIRCLE_CLIENT_URL, CIRCLE_CLIENT_KEY);

            const credential = await toWebAuthnCredential({
                transport: passkeyTransport,
                mode: WebAuthnMode.Register,
                username,
            });

            await initializeAccount(credential, username);
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isConnecting: false,
                error: error as Error,
            }));
            throw error;
        }
    }, [initializeAccount]);

    // Login with existing passkey
    const loginWithPasskey = useCallback(async (username: string) => {
        if (!CIRCLE_CLIENT_KEY) {
            throw new Error("Circle API credentials not configured. Please set NEXT_PUBLIC_CIRCLE_CLIENT_KEY.");
        }

        setState((prev) => ({ ...prev, isConnecting: true, error: null }));

        try {
            // Dynamic import of Circle SDK (browser-only)
            const { toPasskeyTransport, toWebAuthnCredential, WebAuthnMode } = await import("@circle-fin/modular-wallets-core");

            const passkeyTransport = toPasskeyTransport(CIRCLE_CLIENT_URL, CIRCLE_CLIENT_KEY);

            const credential = await toWebAuthnCredential({
                transport: passkeyTransport,
                mode: WebAuthnMode.Login,
                username,
            });

            await initializeAccount(credential, username);
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isConnecting: false,
                error: error as Error,
            }));
            throw error;
        }
    }, [initializeAccount]);

    // Disconnect
    const disconnect = useCallback(() => {
        setSmartAccount(null);
        setPublicClient(null);
        setState(INITIAL_CIRCLE_STATE);
    }, []);

    // Sign arbitrary message (EIP-191)
    const signMessage = useCallback(async (message: string): Promise<string | null> => {
        if (!smartAccount) return null;
        try {
            return await smartAccount.signMessage({ message });
        } catch (error) {
            console.error("Failed to sign message:", error);
            return null;
        }
    }, [smartAccount]);

    // Sign typed data (EIP-712)
    const signTypedData = useCallback(async (typedData: any): Promise<string | null> => {
        if (!smartAccount) return null;
        try {
            return await smartAccount.signTypedData(typedData);
        } catch (error) {
            console.error("Failed to sign typed data:", error);
            return null;
        }
    }, [smartAccount]);

    // Memoize context value
    const contextValue = useMemo<CircleWalletContextValue>(
        () => ({
            ...state,
            registerPasskey,
            loginWithPasskey,
            disconnect,
            signMessage,
            signTypedData,
            smartAccount,
            publicClient,
        }),
        [state, registerPasskey, loginWithPasskey, disconnect, signMessage, signTypedData, smartAccount, publicClient]
    );

    return (
        <CircleWalletContext.Provider value={contextValue}>
            {children}
        </CircleWalletContext.Provider>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useCircleWallet(): CircleWalletContextValue {
    const context = useContext(CircleWalletContext);
    if (!context) {
        throw new Error("useCircleWallet must be used within a CircleWalletProvider");
    }
    return context;
}
