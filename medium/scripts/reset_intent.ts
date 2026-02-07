
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../sanctum/.env.local') });

const redis = new Redis(process.env.REDIS_URL || '');
const REDIS_KEY = 'eidolon:orders';

async function resetIntent(intentId: string) {
    try {
        const ordersData = await redis.get(REDIS_KEY);
        if (!ordersData) {
            console.log('No orders found in Redis');
            return;
        }

        const orders = JSON.parse(ordersData);
        const order = orders.find((o: any) => o.id === intentId);

        if (!order) {
            console.log(`Intent ${intentId} not found`);
            return;
        }

        console.log('Found intent:', {
            id: order.id,
            status: order.status,
            type: order.type,
            tokens: `${order.tokenA} -> ${order.tokenB}`
        });

        // Reset to Active
        order.status = 'Active';
        delete order.txHash;

        // Update Redis
        await redis.set(REDIS_KEY, JSON.stringify(orders));
        console.log(`✅ Intent ${intentId} reset to Active`);

        await redis.quit();
    } catch (e) {
        console.error('Error:', e);
        await redis.quit();
    }
}

// Reset the incorrectly settled intents
const intentIds = process.argv.slice(2);
if (intentIds.length === 0) {
    console.log('Usage: npx ts-node scripts/reset_intent.ts <intent-id> [<intent-id-2> ...]');
    process.exit(1);
}

Promise.all(intentIds.map(resetIntent)).then(() => process.exit(0));
