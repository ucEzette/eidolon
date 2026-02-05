import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
    RPC_URL: process.env.RPC_URL || "https://sepolia.unichain.org",
    PRIVATE_KEY: process.env.PRIVATE_KEY!,
    CONTRACTS: {
        EIDOLON_HOOK: "0xC22Be98b2eb9301135408FD12C4D114Ab001C0C8",
        EIDOLON_EXECUTOR: "0x30e2c965b0b3cd3f726e8a2002ad95edbd8a8b16", // Hardcoded to prevent env pollution
        POOL_MANAGER: "0x00B036B58a818B1BC34d502D3fE730Db729e62AC"
    }
};

console.log("Loaded CONFIG:", CONFIG);


if (!CONFIG.PRIVATE_KEY) {
    console.warn("⚠️  WARNING: PRIVATE_KEY not found in .env");
}
