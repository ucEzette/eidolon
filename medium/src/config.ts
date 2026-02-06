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
    },
    TOKENS: {
        "ETH": { address: "0x0000000000000000000000000000000000000000", decimals: 18 },
        "WETH": { address: "0x4200000000000000000000000000000000000006", decimals: 18 },
        "USDC": { address: "0x31d0220469e10c4E71834a79b1f276d740d3768F", decimals: 6 },
        "eiETH": { address: "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6", decimals: 18 }
    } as Record<string, { address: string; decimals: number }>
};

import util from 'util';
console.log("Loaded CONFIG:", util.inspect(CONFIG, { depth: null, colors: true, maxStringLength: null }));


if (!CONFIG.PRIVATE_KEY) {
    console.warn("⚠️  WARNING: PRIVATE_KEY not found in .env");
}
