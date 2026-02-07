
import { createPublicClient, http } from 'viem';
import { unichainSepolia } from 'viem/chains';

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http("https://sepolia.unichain.org")
});

async function checkTx(hash: string) {
    console.log("Checking Tx:", hash);
    try {
        const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
        const tx = await client.getTransaction({ hash: hash as `0x${string}` });
        console.log("Status:", receipt.status);
        console.log("From:", tx.from);
        console.log("To:", tx.to);
        console.log("Block:", receipt.blockNumber.toString());
        console.log("Logs Count:", receipt.logs.length);

        // Try to decode logs if possible, or just look at them
        receipt.logs.forEach((log, i) => {
            console.log(`Log ${i}: ${log.address} - Topics: ${log.topics.join(', ')}`);
        });
    } catch (e: any) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

const hash = process.argv[2];
if (!hash) {
    console.error("Please provide a transaction hash");
    process.exit(1);
}
checkTx(hash);
