"use client";

import { useEffect, useState } from "react";
import { type SignedGhostPermit } from "./useGhostPermit";

export interface GhostPosition {
    id: string;
    tokenA: string; // Symbol
    tokenB: string; // Symbol
    amountA: string;
    amountB: string;
    expiry: number; // Timestamp
    signature: string;
    status: 'Active' | 'Expired' | 'Revoked';
    timestamp: number;
    liquidityMode: 'one-sided' | 'dual-sided';
    nonce: string; // Storing as string to avoid serialization issues
    txHash?: string;
}

const STORAGE_KEY = "eidolon_ghost_positions";

export function useGhostPositions() {
    const [positions, setPositions] = useState<GhostPosition[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setPositions(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse ghost positions", e);
            }
        }
    }, []);

    const addPosition = (position: Omit<GhostPosition, 'id' | 'timestamp' | 'status'>) => {
        const newPosition: GhostPosition = {
            ...position,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'Active'
        };

        const updated = [newPosition, ...positions];
        setPositions(updated);

        // Handle BigInt serialization
        const serialized = JSON.stringify(updated, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );
        localStorage.setItem(STORAGE_KEY, serialized);
    };

    const revokePosition = (id: string, txHash?: string) => {
        const updated = positions.map(p =>
            p.id === id ? { ...p, status: 'Revoked' as const, txHash } : p
        );
        setPositions(updated);

        // Handle BigInt serialization
        const serialized = JSON.stringify(updated, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );
        localStorage.setItem(STORAGE_KEY, serialized);
    };

    return {
        positions,
        addPosition,
        revokePosition
    };
}
