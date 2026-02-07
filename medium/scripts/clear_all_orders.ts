import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL!;
const REDIS_KEY = 'eidolon:orders';

async function clearAllOrders() {
    const redis = new Redis(REDIS_URL);

    console.log('🗑️  Clearing ALL orders from Redis...');

    const data = await redis.get(REDIS_KEY);
    if (!data) {
        console.log('No orders found.');
        await redis.quit();
        return;
    }

    const orders = JSON.parse(data);
    console.log(`Found ${orders.length} orders. Removing all...`);

    await redis.del(REDIS_KEY);

    console.log('✅ All orders cleared!');

    await redis.quit();
}

clearAllOrders().catch(console.error);
