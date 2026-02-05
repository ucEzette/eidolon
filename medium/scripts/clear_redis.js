const Redis = require("ioredis");

// Use env var or default
const redisUrl = process.env.REDIS_URL;
const redis = new Redis(redisUrl);
const REDIS_KEY = 'eidolon:orders';

async function clear() {
    console.log(`🧹 Connecting to Redis at ${redisUrl}...`);
    try {
        const deleted = await redis.del(REDIS_KEY);
        console.log(`✅ Deleted ${deleted} keys. Queue '${REDIS_KEY}' is now empty.`);
    } catch (e) {
        console.error("❌ Failed to clear Redis:", e.message);
    } finally {
        redis.disconnect();
    }
}

clear();
