import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { CONTRACTS } from '@/config/web3';

// Canonical Permit2 Address
export const PERMIT2_ADDRESS = CONTRACTS.unichainSepolia.permit2;

export interface ActivityEvent {
    hash: string;
    blockNumber: bigint;
    timestamp: number;
    type: 'Revoke' | 'Interaction' | 'Earned';
    description: string;
    amount?: string;
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
                // 1. Fetch Permit2 Invalidations (Revocations)
                const revocationLogs = await publicClient.getLogs({
                    address: PERMIT2_ADDRESS,
                    event: parseAbiItem('event NonceInvalidated(address indexed owner, uint256 word, uint256 mask, uint256 algorithm)'),
                    args: {
                        owner: address
                    },
                    fromBlock: 'earliest'
                });

                // 2. Fetch LiquidityMaterialized (Earnings) from EidolonHook
                const earningsLogs = await publicClient.getLogs({
                    address: CONTRACTS.unichainSepolia.eidolonHook,
                    event: parseAbiItem('event LiquidityMaterialized(address indexed provider, bytes32 poolId, uint256 amount, uint256 providerProfit)'),
                    args: {
                        provider: address
                    },
                    fromBlock: 'earliest'
                });

                const formattedEvents: ActivityEvent[] = [];

                // Process Revocations
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

                // Process Earnings
                for (const log of earningsLogs) {
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    const profit = formatUnits(log.args.providerProfit || 0n, 18); // Assuming 18 decimals for now
                    formattedEvents.push({
                        hash: log.transactionHash,
                        blockNumber: log.blockNumber,
                        timestamp: Number(block.timestamp) * 1000,
                        type: 'Earned',
                        description: `Earned ${parseFloat(profit).toFixed(6)} ETH`,
                        amount: profit
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
