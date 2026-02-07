
import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const REDIS_KEY = 'eidolon:orders';

async function debug() {
    console.log("Reading from Redis:", process.env.REDIS_URL);
    const data = await redis.get(REDIS_KEY);
    const orders = data ? JSON.parse(data) : [];
    console.log(`Found ${orders.length} orders total.`);

    orders.forEach((o: any) => {
        console.log(`ID: ${o.id.slice(0, 8)} | Provider: ${o.provider} | Status: ${o.status} | Type: ${o.type} | Pool: ${o.poolId.slice(0, 10)}`);
        console.log(`   Tokens: ${o.tokenA} -> ${o.tokenB} | Amount: ${o.amountA} | Fee: ${o.fee} | TS: ${o.tickSpacing}`);
        console.log(`   Nonce: ${o.nonce} | Tx: ${o.txHash || 'N/A'}`);
    });

    process.exit(0);
}

debug();
