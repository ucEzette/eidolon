
const Redis = require("ioredis");
require("dotenv").config();

const redisUrl = process.env.REDIS_URL;
const redis = new Redis(redisUrl);
const REDIS_KEY = 'eidolon:orders';

async function inspect() {
    console.log(`🔍 Inspecting Redis key '${REDIS_KEY}' at ${redisUrl}...`);
    try {
        const type = await redis.type(REDIS_KEY);
        console.log(`Type: ${type}`);

        if (type === 'hash') {
            const ordersRaw = await redis.hgetall(REDIS_KEY);
            const ids = Object.keys(ordersRaw);
            console.log(`Found ${ids.length} orders in Hash.`);
            ids.forEach((id, i) => {
                const order = JSON.parse(ordersRaw[id]);
                console.log(`\n--- Order ${i + 1} ---`);
                console.log(`ID: ${id}`);
                console.log(`Mode: ${order.liquidityMode}`);
                console.log(`Nonce: ${order.nonce}`);
            });
        } else if (type === 'list') {
            const ordersRaw = await redis.lrange(REDIS_KEY, 0, -1);
            console.log(`Found ${ordersRaw.length} orders in List.`);
            ordersRaw.forEach((raw, i) => {
                const order = JSON.parse(raw);
                console.log(`\n--- Order ${i + 1} ---`);
                console.log(`ID: ${order.id}`);
                console.log(`Mode: ${order.liquidityMode}`);
            });
        } else if (type === 'set') {
            const ordersRaw = await redis.smembers(REDIS_KEY);
            console.log(`Found ${ordersRaw.length} orders in Set.`);
            ordersRaw.forEach((raw, i) => {
                const order = JSON.parse(raw);
                console.log(`\n--- Order ${i + 1} ---`);
                console.log(`ID: ${order.id}`);
                console.log(`Mode: ${order.liquidityMode}`);
            });
        } else if (type === 'none') {
            console.log("Key does not exist.");
        } else {
            const val = await redis.get(REDIS_KEY);
            console.log("Value:", val);
        }
    } catch (e) {
        console.error("❌ Failed to inspect Redis:", e.message);
    } finally {
        redis.disconnect();
    }
}

inspect();
