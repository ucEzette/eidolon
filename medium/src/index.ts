
import { CONFIG } from './config';
import { Monitor } from './monitor';

async function main() {
    console.log("🔮 The Medium: Eidolon Off-Chain Bot Starting...");
    console.log(`🔗 Network: ${CONFIG.RPC_URL}`);
    console.log(`📜 Contract: ${CONFIG.CONTRACTS.EIDOLON_HOOK}`);

    const monitor = new Monitor();

    // Handle shutdown
    process.on('SIGINT', async () => {
        await monitor.stop();
        process.exit(0);
    });

    await monitor.start();
}

main().catch((error) => {
    console.error("Fatal Error:", error);
    process.exit(1);
});
