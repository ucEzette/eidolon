import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
    RPC_URL: process.env.RPC_URL || "https://sepolia.unichain.org",
    PRIVATE_KEY: process.env.PRIVATE_KEY!,
    CONTRACTS: {
        EIDOLON_HOOK: "0xa5CC49688cB5026977a2A501cd7dD3daB2C580c8",
        EIDOLON_EXECUTOR: "0x1318783e1b61d173315d566003836dc850B144C2", // Hardcoded to prevent env pollution
        POOL_MANAGER: "0x00B036B58a818B1BC34d502D3fE730Db729e62AC"
    },
    POOLS: {
        canonical: {
            fee: 3000,
            tickSpacing: 200,
        }
    }
};

import util from 'util';
console.log("Loaded CONFIG:", util.inspect(CONFIG, { depth: null, colors: true, maxStringLength: null }));


if (!CONFIG.PRIVATE_KEY) {
    console.warn("⚠️  WARNING: PRIVATE_KEY not found in .env");
}
