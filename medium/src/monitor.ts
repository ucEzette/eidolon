import axios from 'axios';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { CONFIG } from './config';
import { Redis } from 'ioredis';
import { Executor } from './executor';

// Define the GhostPosition interface matching the frontend
export interface GhostPosition {
    id: string;
    tokenA: string;
    tokenB: string;
    amountA: string;
    amountB: string;
    expiry: number;
    signature: string;
    status: 'Active' | 'Expired' | 'Revoked' | 'Settled';
    type: 'liquidity' | 'swap'; // [NEW] Distinguish intent type
    timestamp: number;
    liquidityMode: 'one-sided' | 'dual-sided';
    nonce: string; // Nonce for the Ghost Instruction (unique per provider)
    provider: string; // Address of the signer
    poolId: string; // Pool ID
    fee: number;
    tickSpacing: number;
    hookAddress: string;
    txHash?: string;
    permit?: any; // The full PermitSingle struct
}

export class Monitor {
    private isRunning: boolean = false;
    private processedIds: Set<string> = new Set();
    private RELAYER_URL = process.env.RELAYER_URL || 'http://localhost:3000/api/relayer/orders';
    private redisSubscriber: Redis;
    private redisClient: Redis;
    private executor: Executor;

    constructor() {
        // Connect to local Redis or env var
        this.redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            lazyConnect: true
        });

        // Silence errors to prevent crashes if Redis is down (Monitor will fallback to polling)
        this.redisSubscriber.on('error', (err) => {
            // console.warn("Redis connection warning (using fallback polling):", err.message);
        });

        this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        this.executor = new Executor();
    }

    async start() {
        this.isRunning = true;
        console.log("👻 The Medium is sensing the ethereal plane...");

        // 1. Subscribe to Real-Time Events
        try {
            await this.redisSubscriber.subscribe('ghost_events', (err, count) => {
                if (!err) {
                    console.log(`[Redis] Subscribed to ${count} channels. Listening for updates...`);
                }
            });

            this.redisSubscriber.on('message', async (channel, message) => {
                if (channel === 'ghost_events') {
                    try {
                        const event = JSON.parse(message);
                        if (event.type === 'NEW_ORDER' && event.order) {
                            console.log(`[Redis] Received NEW_ORDER event!`);
                            await this.handleNewOrder(event.order);
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            });
        } catch (e) {
            console.log("Redis unavailable, defaulting to polling.");
        }

        // 2. Start Fallback Polling (Safety net)
        this.fallbackLoop();
    }

    async stop() {
        this.isRunning = false;
        console.log("Stopping Monitor...");
        try {
            await this.redisSubscriber.quit();
        } catch (e) { }
    }

    private async fallbackLoop() {
        while (this.isRunning) {
            try {
                // Poll every 5 seconds (Fast for testing)
                // console.log("🔍 Running fallback poll...");
                const orders = await this.fetchOrders();
                const newOrders = orders.filter(o =>
                    o.status === 'Active' &&
                    !this.processedIds.has(o.id) &&
                    o.expiry > Date.now()
                );

                if (newOrders.length > 0) {
                    console.log(`Found ${newOrders.length} missed orders via poll.`);
                    for (const order of newOrders) {
                        await this.handleNewOrder(order);
                    }
                }
            } catch (error) {
                console.error("Fallback loop error:", error);
            }

            // Wait 5 seconds
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    private async handleNewOrder(order: GhostPosition) {
        if (this.processedIds.has(order.id)) return;

        // [NEW] Logic: Only act as a trigger if it's a SWAP intent
        // Liquidity intents are passive and must wait for a swap to be bundled.
        if (order.type === 'liquidity') {
            console.log(`👻 Sensed Ghost Liquidity [${order.id.slice(0, 8)}] in Pool ${order.poolId.slice(0, 10)}...`);
            console.log(`   Waiting for a matching swap to materialize...`);
            return; // Stay active in Relayer
        }

        this.processedIds.add(order.id);
        await this.processOrder(order);
    }


    private async fetchGhostSessions(): Promise<any[]> {
        try {
            const keys = await this.redisClient.keys('ghost:session:*');
            if (keys.length === 0) return [];

            const sessions = await this.redisClient.mget(keys);
            return sessions
                .filter(s => s !== null)
                .map(s => JSON.parse(s!))
                .map(s => ({
                    ...s,
                    type: 'liquidity', // Treat as liquidity intent
                    id: 'session-' + s.provider?.slice(0, 8), // Hacky ID
                    provider: s.provider,
                    status: 'Active',
                    expiry: s.permit?.details?.expiration || 0,
                    nonce: s.permit?.details?.nonce?.toString() || '0'
                }));
        } catch (e) {
            console.error("Failed to fetch Ghost Sessions:", e);
            return [];
        }
    }

    private async fetchOrders(): Promise<GhostPosition[]> {
        try {
            const response = await axios.get(this.RELAYER_URL);
            if (response.data?.success) {
                return response.data.orders;
            }
            return [];
        } catch (e: any) {
            console.error("Failed to connect to Relayer:", e.message);
            return [];
        }
    }

    private async processOrder(order: GhostPosition) {
        console.log(`🔮 EXORCISING Swap Intent [${order.id.slice(0, 8)}]...`);
        console.log(`   Token: ${order.tokenA} -> Amount: ${order.amountA}`);

        const allGhostSessions = await this.fetchGhostSessions();

        // Filter for matching tokens (Simple version: checks if permit token matches swap token)
        const poolLiquidity = allGhostSessions.filter(l =>
            // Logic: If user swaps Token A, we need Token A liquidity? 
            // Providing liquidity means providing BOTH or ONE side.
            // If Ghost is one-sided, it must match the token user is swapping INTO? No, user swaps A->B.
            // User gives A, takes B.
            // Provider gives B? Or User swaps against JIT liquidity?
            // If JIT provider gives liquidity, they provide both or single.
            // If user sells A for B.
            // Provider must provide B (and A).
            // Let's assume matches if ANY token matches.
            l.permit.details.token === order.tokenA || l.permit.details.token === order.tokenB
        );

        if (poolLiquidity.length > 0) {
            console.log(`   🌊 Found ${poolLiquidity.length} Ghost Liquidity matching intents.`);
        }

        // Pass to Executor with bundled liquidity
        const result = await this.executor.executeOrder(order, poolLiquidity);

        if (result && result.hash) {
            console.log(`✅ Order executed! Hash: ${result.hash}`);

            // Only settle intents that the executor confirms were valid and included
            for (const id of result.settledIds) {
                const liqIntent = poolLiquidity.find(l => l.id === id);
                if (liqIntent) {
                    await this.markAsSettled(liqIntent, result.hash);
                } else if (id === order.id) {
                    await this.markAsSettled(order, result.hash);
                }
            }
        }
    }

    private async markAsSettled(order: GhostPosition, txHash: string) {
        try {
            const updatedOrder = {
                ...order,
                status: 'Settled', // New Status
                txHash: txHash
            };

            await axios.post(this.RELAYER_URL, { order: updatedOrder });
            console.log(`📡 Updated Relayer status to SETTLED for ${order.id}`);
        } catch (e: any) {
            console.error("Failed to update Relayer status:", e.message);
        }
    }
}
