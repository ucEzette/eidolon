
import { createPublicClient, http } from 'viem';
import { unichainSepolia } from 'viem/chains';

const EIDOLON_HOOK = "0x7A3FDC42Ec96AFeF175FA446ee62057F412A20c8";

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http("https://sepolia.unichain.org")
});

const abi = [
    {
        name: 'isPermitUsed',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'provider', type: 'address' },
            { name: 'nonce', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    }
];

async function checkNonce(provider: string, nonce: string) {
    const isUsed = await client.readContract({
        address: EIDOLON_HOOK as `0x${string}`,
        abi,
        functionName: 'isPermitUsed',
        args: [provider as `0x${string}`, BigInt(nonce)]
    });
    console.log(`Provider: ${provider}`);
    console.log(`Nonce: ${nonce}`);
    console.log(`IsUsed: ${isUsed}`);
}

// Check the new WETH/USDC liquidity nonce
checkNonce("0x4c9De23f22992a51d6790C877870D7334b053d4B", "1770493114201");
