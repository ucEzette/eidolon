import { ethers } from "ethers";
import { CONFIG } from "./config";

async function main() {
    console.log("👻 The Medium is initializing...");

    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

    try {
        const network = await provider.getNetwork();
        console.log(`Connected to network: ${network.name} (${network.chainId})`);

        if (CONFIG.PRIVATE_KEY) {
            const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
            console.log(`Operator Address: ${wallet.address}`);
            console.log("Waiting for Ghost Intents...");
        } else {
            console.log("Running in Read-Only Mode (No Private Key)");
        }

    } catch (error) {
        console.error("Failed to connect to RPC:", error);
    }
}

main().catch(console.error);
