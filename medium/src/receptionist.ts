import express from 'express';
import { Redis } from 'ioredis';
import { verifyTypedData, Hex } from 'viem';
import { CONFIG } from './config';

const app = express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Permit2 Domain Separator (Ideally fetched from chain, but hardcoded for speed/MVP if necessary)
// For robustness, we should fetch or configure it. 
// Standard Permit2 on Mainnet/Sepolia:
const PERMIT2_DOMAIN = {
    name: 'Permit2',
    chainId: 11155111, // Unichain Sepolia? CONFIG.RPC_URL implies Sepolia.unichain.org
    verifyingContract: CONFIG.CONTRACTS.PERMIT2 as Hex
};

// EIP-712 Types for PermitSingle
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

app.get('/', (req, res) => {
    res.send('Health Check: OK (Receptionist Active)');
});

app.post('/session/start', async (req, res) => {
    try {
        const { permit, signature, provider } = req.body;

        if (!permit || !signature || !provider) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Verify Signature
        // We verify that the signer of the permit is indeed the provider
        // AND that the spender is OUR HOOK.
        if (permit.spender.toLowerCase() !== CONFIG.CONTRACTS.EIDOLON_HOOK.toLowerCase()) {
            return res.status(400).json({ error: "Invalid spender (must be Eidolon Hook)" });
        }

        const valid = await verifyTypedData({
            address: provider as Hex,
            domain: PERMIT2_DOMAIN,
            types: PERMIT_TYPES,
            primaryType: 'PermitSingle',
            message: permit,
            signature: signature as Hex
        });

        if (!valid) {
            return res.status(401).json({ error: "Invalid signature" });
        }

        // 2. Additional Checks (Expiry, Balance?)
        if (Number(permit.details.expiration) < Math.floor(Date.now() / 1000)) {
            return res.status(400).json({ error: "Permit expired" });
        }

        // 3. Store Session in Redis
        // Key: ghost:session:{provider}
        // Value: JSON string of permit + signature
        // TTL: Until expiration
        const ttl = Number(permit.details.expiration) - Math.floor(Date.now() / 1000);

        await redis.set(
            `ghost:session:${provider}`,
            JSON.stringify({ permit, signature }),
            'EX',
            ttl
        );

        console.log(`👻 Ghost Session Started for ${provider}`);
        res.json({ success: true, message: "Session activated" });

    } catch (error: any) {
        console.error("Receptionist Error:", error);
        res.status(500).json({ error: error.message });
    }
});

export const startReceptionist = (port: number) => {
    app.listen(port, () => {
        console.log(`🛎️ Receptionist listening on port ${port}`);
    });
};
