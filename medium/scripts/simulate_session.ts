import { createWalletClient, http, defineChain, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';

// Mock Config from medium/src/config.ts
const CONFIG = {
    CONTRACTS: {
        EIDOLON_HOOK: '0x296bA69b1F79d0eb0Ca812C5cf58FC2f4C0Bb0C8',
        PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
    }
};

const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil Account 0
const account = privateKeyToAccount(PRIVATE_KEY);

const client = createWalletClient({
    account,
    chain: defineChain({
        id: 11155111,
        name: 'Sepolia',
        network: 'sepolia',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: ['http://localhost:8545'] } }
    }),
    transport: http()
});

const PERMIT2_DOMAIN = {
    name: 'Permit2',
    chainId: 11155111,
    verifyingContract: CONFIG.CONTRACTS.PERMIT2 as `0x${string}`
};

const PERMIT_TYPES = {
    PermitSingle: [
        { name: 'details', type: 'PermitDetails' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' }
    ],
    PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint160' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' }
    ]
};

async function main() {
    console.log("👻 Simulating Ghost Session Activation...");

    const permit = {
        details: {
            token: '0xe02eb159eb92dd0388ecdb33d0db0f8831091be6', // eiETH
            amount: '100000000000000000000', // 100 ETH
            expiration: Math.floor(Date.now() / 1000) + 3600, // 1 hour
            nonce: 0
        },
        spender: CONFIG.CONTRACTS.EIDOLON_HOOK,
        sigDeadline: Math.floor(Date.now() / 1000) + 3600
    };

    console.log("Signing Permit:", permit);

    const signature = await client.signTypedData({
        domain: PERMIT2_DOMAIN,
        types: PERMIT_TYPES,
        primaryType: 'PermitSingle',
        message: permit
    });

    console.log("Signature:", signature);

    try {
        const response = await axios.post('http://localhost:8080/session/start', {
            permit,
            signature,
            provider: account.address
        });

        console.log("✅ Receptionist Response:", response.data);
    } catch (e: any) {
        console.error("❌ Error:", e.response?.data || e.message);
    }
}

main();
