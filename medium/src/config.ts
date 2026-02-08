import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
    RPC_URL: process.env.RPC_URL || "https://sepolia.unichain.org",
    PRIVATE_KEY: process.env.PRIVATE_KEY!,
    CONTRACTS: {
        EIDOLON_HOOK: process.env.EIDOLON_HOOK as `0x${string}`,
        EIDOLON_EXECUTOR: process.env.EIDOLON_EXECUTOR as `0x${string}`,
        POOL_MANAGER: process.env.POOL_MANAGER as `0x${string}`,
        PERMIT2: (process.env.PERMIT2 || '0x000000000022D473030F116dDEE9F6B43aC78BA3') as `0x${string}`
    },
    POOLS: {
        canonical: {
            fee: 3000,
            tickSpacing: 60,
        }
    },
    TOKENS: {
        "ETH": { address: "0x0000000000000000000000000000000000000000", decimals: 18 },
        "WETH": { address: process.env.WETH || "0x4200000000000000000000000000000000000006", decimals: 18 },
        "USDC": { address: process.env.USDC || "0x31d0220469e10c4E71834a79b1f276d740d3768F", decimals: 6 },
        "eiETH": { address: process.env.eiETH || "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6", decimals: 18 }
    } as Record<string, { address: string; decimals: number }>
};

import util from 'util';
console.log("Loaded CONFIG:", util.inspect(CONFIG, { depth: null, colors: true, maxStringLength: null }));


if (!CONFIG.PRIVATE_KEY) {
    console.warn("⚠️  WARNING: PRIVATE_KEY not found in .env");
}
