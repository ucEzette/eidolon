import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, Log } from 'viem';

// Canonical Permit2 Address
export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export interface ActivityEvent {
    hash: string;
    blockNumber: bigint;
    timestamp: number;
    type: 'Revoke' | 'Interaction';
    description: string;
}

export function useActivityHistory() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!address || !publicClient) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Fetch Permit2 Invalidations (Revocations)
                const revocationLogs = await publicClient.getLogs({
                    address: PERMIT2_ADDRESS,
                    event: parseAbiItem('event NonceInvalidated(address indexed owner, uint256 word, uint256 mask, uint256 algorithm)'),
                    args: {
                        owner: address
                    },
                    fromBlock: 'earliest' // In prod, maybe limit this range
                });

                const formattedEvents: ActivityEvent[] = [];

                // Process logs
                for (const log of revocationLogs) {
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    formattedEvents.push({
                        hash: log.transactionHash,
                        blockNumber: log.blockNumber,
                        timestamp: Number(block.timestamp) * 1000,
                        type: 'Revoke',
                        description: 'Revoked Permit Batch'
                    });
                }

                // Sort by new
                formattedEvents.sort((a, b) => b.timestamp - a.timestamp);
                setEvents(formattedEvents);

            } catch (error) {
                console.error("Failed to fetch activity history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();

        // Poll every 30 seconds
        const interval = setInterval(fetchHistory, 30000);
        return () => clearInterval(interval);
    }, [address, publicClient]);

    return { events, loading };
}
