
import fs from 'fs';
import path from 'path';
import { type GhostPosition } from '@/hooks/useGhostPositions';

// Database file path - using /tmp for demo purposes or a persistent path if possible
// In a real Vercel deployment, this would need to be KV or Postgres.
// For this local/demo environment, we'll store it in the project root's .data folder
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'relayer_orders.json');

// Ensure DB exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

export const RelayerDB = {
    getAllOrders: (): GhostPosition[] => {
        try {
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error("RelayerDB Read Error (DB_PATH: " + DB_PATH + "):", e);
            return [];
        }
    },

    getOrdersByUser: (userAddress: string): GhostPosition[] => {
        // Simple filter, assuming we store user address in the permit or can infer it.
        // The GhostPosition struct doesn't explicitly have "maker" at top level, 
        // but it's part of the signature. For now, we'll return all and let client filter 
        // OR update GhostPosition to include 'maker'.
        // Let's assume we will update GhostPosition to include 'makerAddress' for easier indexing.
        const orders = RelayerDB.getAllOrders();
        return orders; // Filtering logic to be refined based on updated Interface
    },

    saveOrder: (order: GhostPosition) => {
        const orders = RelayerDB.getAllOrders();

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
            fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2));
            console.log("RelayerDB Saved Order:", order.id);
        } catch (e) {
            console.error("RelayerDB Write Error:", e);
            throw e;
        }
        return order;
    },

    // Revoke/Delete
    deleteOrder: (id: string, txHash?: string) => {
        const orders = RelayerDB.getAllOrders();
        const orderIndex = orders.findIndex(o => o.id === id);

        if (orderIndex !== -1) {
            // We don't actually delete, we mark as Revoked for history
            orders[orderIndex].status = 'Revoked';
            if (txHash) orders[orderIndex].txHash = txHash;
            fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2));
        }
    }
};
