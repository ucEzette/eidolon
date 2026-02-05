import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
    RPC_URL: process.env.RPC_URL || "https://sepolia.unichain.org",
    PRIVATE_KEY: process.env.PRIVATE_KEY!,
    CONTRACTS: {
        EIDOLON_HOOK: "0xC22Be98b2eb9301135408FD12C4D114Ab001C0C8",
        EIDOLON_EXECUTOR: process.env.EIDOLON_EXECUTOR || "0xa71D8e820e579412e80E62FD1b3619b179E61623",
        POOL_MANAGER: "0x00B036B58a818B1BC34d502D3fE730Db729e62AC"
    }
};

console.log("Loaded CONFIG:", CONFIG);


if (!CONFIG.PRIVATE_KEY) {
    console.warn("⚠️  WARNING: PRIVATE_KEY not found in .env");
}
