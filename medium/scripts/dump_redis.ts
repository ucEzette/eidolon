
import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const REDIS_KEY = 'eidolon:orders';

async function dump() {
    const data = await redis.get(REDIS_KEY);
    const orders = data ? JSON.parse(data) : [];
    console.log(JSON.stringify(orders, null, 2));
    process.exit(0);
}

dump();
