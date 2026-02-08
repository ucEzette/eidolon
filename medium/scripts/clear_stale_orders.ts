import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL!;
const REDIS_KEY = 'eidolon:orders';

// Correct pool configuration (the only initialized pool)
const CORRECT_CONFIG = {
    fee: 3000,
    tickSpacing: 60,
    hookAddress: '0x7A3FDC42Ec96AFeF175FA446ee62057F412A20c8'.toLowerCase()
};

async function clearStaleOrders() {
    const redis = new Redis(REDIS_URL);

    console.log('🔍 Scanning for stale orders with incorrect pool parameters...');
    console.log(`   Correct config: fee=${CORRECT_CONFIG.fee}, tickSpacing=${CORRECT_CONFIG.tickSpacing}`);

    const data = await redis.get(REDIS_KEY);
    if (!data) {
        console.log('No orders found.');
        await redis.quit();
        return;
    }

    const orders = JSON.parse(data);
    console.log(`Found ${orders.length} orders total.`);

    const filteredOrders = orders.filter((order: any) => {
        const fee = order.fee;
        const tickSpacing = order.tickSpacing;
        const hookAddress = order.hookAddress?.toLowerCase();

        // Keep only orders with correct fee, tickSpacing, and hook
        const isCorrect = fee === CORRECT_CONFIG.fee &&
            tickSpacing === CORRECT_CONFIG.tickSpacing &&
            hookAddress === CORRECT_CONFIG.hookAddress;

        if (!isCorrect) {
            console.log(`   ❌ Removing order ${order.id}: fee=${fee}, tickSpacing=${tickSpacing}`);
        }

        return isCorrect;
    });

    const removedCount = orders.length - filteredOrders.length;

    if (removedCount > 0) {
        await redis.set(REDIS_KEY, JSON.stringify(filteredOrders));
        console.log(`\n✅ Removed ${removedCount} stale orders.`);
        console.log(`✅ ${filteredOrders.length} valid orders remaining.`);
    } else {
        console.log('\n✅ All orders have correct pool parameters.');
    }

    await redis.quit();
}

clearStaleOrders().catch(console.error);
