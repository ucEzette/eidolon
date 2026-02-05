const Redis = require("ioredis");

// Use env var or default
const redisUrl = process.env.REDIS_URL || 'rediss://default:AbGDAAIncDIzOTk4ZDI0ODgzYWE0YTRiODM0NWEyYTE4YjRhZjQ1N3AyNDU0NDM@maximum-ocelot-45443.upstash.io:6379';
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
