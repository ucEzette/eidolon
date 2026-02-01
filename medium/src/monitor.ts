
import axios from 'axios';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains'; // Using Sepolia for logic, but config allows override
import { CONFIG } from './config';

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
    txHash?: string;
}

export class Monitor {
    private isRunning: boolean = false;
    private processedIds: Set<string> = new Set();
    private RELAYER_URL = 'http://localhost:3000/api/relayer/orders'; // Adjust based on Next.js port

    constructor() { }

    async start() {
        this.isRunning = true;
        console.log("👻 The Medium is sensing the ethereal plane...");

        // Poll Relayer loop
        this.loop();
    }

    async stop() {
        this.isRunning = false;
        console.log("Stopping Monitor...");
    }

    private async loop() {
        while (this.isRunning) {
            try {
                // 1. Fetch Active Intents from Relayer
                const orders = await this.fetchOrders();

                // 2. Filter for new, unprocessed orders
                const newOrders = orders.filter(o =>
                    o.status === 'Active' &&
                    !this.processedIds.has(o.id) &&
                    o.expiry > Date.now()
                );

                if (newOrders.length > 0) {
                    console.log(`👻 Found ${newOrders.length} new Ghost Intents!`);

                    for (const order of newOrders) {
                        await this.processOrder(order);
                        this.processedIds.add(order.id);
                    }
                }

            } catch (error) {
                console.error("Monitor loop error:", error);
            }

            // Wait 5 seconds
            await new Promise(r => setTimeout(r, 5000));
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
        console.log(`🔮 EXORCISING Intent [${order.id.slice(0, 8)}]...`);
        console.log(`   Token: ${order.tokenA} -> Amount: ${order.amountA}`);
        console.log(`   Mode: ${order.liquidityMode}`);

        // TODO: Pass to Executor
        // await calculateProfitAndExecute(order);
    }
}
