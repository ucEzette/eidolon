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
    const [isLoading, setIsLoading] = useState(true);

    // Initial Fetch & Polling
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/relayer/orders');
                const data = await res.json();
                if (data.success) {
                    setPositions(data.orders);
                }
            } catch (e) {
                console.error("Failed to sync with Relayer:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();

        // Poll every 5 seconds for cross-device sync
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const addPosition = async (position: Omit<GhostPosition, 'id' | 'timestamp' | 'status'>) => {
        const newPosition: GhostPosition = {
            ...position,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'Active'
        };

        // Optimistic Update
        setPositions(prev => [newPosition, ...prev]);

        // Sync to Relayer
        try {
            await fetch('/api/relayer/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: newPosition })
            });
        } catch (e) {
            console.error("Failed to push order to Relayer:", e);
            // Context: In a real app, rollback optimistic update or show error toast
        }
    };

    const revokePosition = async (id: string, txHash?: string) => {
        // Optimistic Update
        const updatedStart = positions.map(p =>
            p.id === id ? { ...p, status: 'Revoked' as const, txHash } : p
        );
        setPositions(updatedStart);

        // Sync Update to Relayer (Re-saving with new status)
        try {
            const targetPos = updatedStart.find(p => p.id === id);
            if (targetPos) {
                await fetch('/api/relayer/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order: targetPos })
                });
            }
        } catch (e) {
            console.error("Failed to sync revocation to Relayer:", e);
        }
    };

    return {
        positions,
        addPosition,
        revokePosition,
        isLoading
    };
}
