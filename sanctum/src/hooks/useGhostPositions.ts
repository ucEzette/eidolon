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
    signature: SignedGhostPermit;
    status: 'Active' | 'Expired' | 'Revoked';
    timestamp: number;
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

    const removePosition = (id: string) => {
        const updated = positions.filter(p => p.id !== id);
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
        removePosition
    };
}
