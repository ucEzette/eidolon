
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

    // Health Check Server for Railway
    const http = require('http');
    const port = process.env.PORT || 8080;
    const server = http.createServer((req: any, res: any) => {
        res.writeHead(200);
        res.end('Health Check: OK');
    });
    server.listen(port, () => {
        console.log(`🏥 Health Check Server running on port ${port}`);
    });

    await monitor.start();
}

main().catch((error) => {
    console.error("Fatal Error:", error);
    process.exit(1);
});
