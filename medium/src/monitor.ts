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
    status: 'Active' | 'Expired' | 'Revoked';
    timestamp: number;
    liquidityMode: 'one-sided' | 'dual-sided';
    nonce: string;
    provider: string; // Address of the signer
    poolId: string; // Pool ID
    fee: number;
    tickSpacing: number;
    hookAddress: string;
    txHash?: string;
}

export class Monitor {
    private isRunning: boolean = false;
    private processedIds: Set<string> = new Set();
    private RELAYER_URL = 'http://localhost:3000/api/relayer/orders';
    private redisSubscriber: Redis;
    private executor: Executor;

    constructor() {
        // Connect to local Redis or env var
        this.redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        this.executor = new Executor();
    }

    async start() {
        this.isRunning = true;
        console.log("👻 The Medium is sensing the ethereal plane...");

        // 1. Subscribe to Real-Time Events
        this.redisSubscriber.subscribe('ghost_events', (err, count) => {
            if (err) {
                console.error("Failed to subscribe: %s", err.message);
            } else {
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
                    console.error("[Redis] Failed to parse message:", e);
                }
            }
        });

        // 2. Start Fallback Polling (Safety net)
        this.fallbackLoop();
    }

    async stop() {
        this.isRunning = false;
        console.log("Stopping Monitor...");
        await this.redisSubscriber.quit();
    }

    private async fallbackLoop() {
        while (this.isRunning) {
            try {
                // Poll every 60 seconds as backup
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

            // Wait 60 seconds (much less frequent than before)
            await new Promise(r => setTimeout(r, 60000));
        }
    }

    private async handleNewOrder(order: GhostPosition) {
        if (this.processedIds.has(order.id)) return;

        this.processedIds.add(order.id);
        await this.processOrder(order);
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
        console.log(`🔮 EXORCISING Intent [${order.id.slice(0, 8)}]...`);
        console.log(`   Token: ${order.tokenA} -> Amount: ${order.amountA}`);

        // Pass to Executor
        await this.executor.executeOrder(order);
    }
}
