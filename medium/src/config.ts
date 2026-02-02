import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
    RPC_URL: process.env.RPC_URL || "https://sepolia.unichain.org",
    PRIVATE_KEY: process.env.PRIVATE_KEY!,
    CONTRACTS: {
        EIDOLON_HOOK: "0x2eb9Bc212868Ca74c0f9191B3a27990e0dfa80C8",
        EIDOLON_EXECUTOR: process.env.EIDOLON_EXECUTOR || "0x0000000000000000000000000000000000000000", // Deploy this!
        POOL_MANAGER: "0x00B036B58a818B1BC34d502D3fE730Db729e62AC"
    }
};

if (!CONFIG.PRIVATE_KEY) {
    console.warn("⚠️  WARNING: PRIVATE_KEY not found in .env");
}
