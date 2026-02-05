import { Redis } from 'ioredis';
import { type GhostPosition } from '@/hooks/useGhostPositions';

// Use env var or default local
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const REDIS_KEY = 'eidolon:orders';

export const RelayerDB = {
    getAllOrders: async (): Promise<GhostPosition[]> => {
        try {
            const data = await redis.get(REDIS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("RelayerDB Redis Read Error:", e);
            return [];
        }
    },

    saveOrder: async (order: GhostPosition) => {
        const orders = await RelayerDB.getAllOrders();

        // Check if already exists
        const exists = orders.find(o => o.id === order.id);
        if (exists) {
            // Update existing
            const index = orders.indexOf(exists);
            orders[index] = order;
        } else {
            // Add new
            orders.push(order);
        }

        try {
            await redis.set(REDIS_KEY, JSON.stringify(orders));
            console.log("RelayerDB Saved Order to Redis:", order.id);
        } catch (e) {
            console.error("RelayerDB Redis Write Error:", e);
            throw e;
        }
        return order;
    },

    // Revoke/Delete
    deleteOrder: async (id: string, txHash?: string) => {
        const orders = await RelayerDB.getAllOrders();
        const orderIndex = orders.findIndex(o => o.id === id);

        if (orderIndex !== -1) {
            // We don't actually delete, we mark as Revoked for history
            orders[orderIndex].status = 'Revoked';
            if (txHash) orders[orderIndex].txHash = txHash;
            await redis.set(REDIS_KEY, JSON.stringify(orders));
        }
    }
};
