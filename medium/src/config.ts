import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
    RPC_URL: process.env.RPC_URL || "https://sepolia.unichain.org",
    PRIVATE_KEY: process.env.PRIVATE_KEY!,
    CONTRACTS: {
        EIDOLON_HOOK: "0x2eb9Bc212868Ca74c0f9191B3a27990e0dfa80C8",
        EIDOLON_EXECUTOR: process.env.EIDOLON_EXECUTOR || "0xa71D8e820e579412e80E62FD1b3619b179E61623",
        POOL_MANAGER: "0x00B036B58a818B1BC34d502D3fE730Db729e62AC"
    }
};

console.log("Loaded CONFIG:", CONFIG);


if (!CONFIG.PRIVATE_KEY) {
    console.warn("⚠️  WARNING: PRIVATE_KEY not found in .env");
}
