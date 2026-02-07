import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    signTypedData,
    keccak256,
    encodeAbiParameters
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const account = privateKeyToAccount(PRIVATE_KEY);

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const HOOK = "0x85bF7A29023EA1f853045fC848b31C9bE4Eaa0C8";
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";

const publicClient = createPublicClient({
    chain: unichainSepolia,
    transport: http()
});

const walletClient = createWalletClient({
    account,
    chain: unichainSepolia,
    transport: http()
});

// Helper to get local PoolID
const getLocalPoolId = (c0: string, c1: string, f: number, ts: number, h: string) => {
    const [t0, t1] = c0.toLowerCase() < c1.toLowerCase() ? [c0, c1] : [c1, c0];
    const encoded = encodeAbiParameters(
        [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' },
        ],
        [t0 as `0x${string}`, t1 as `0x${string}`, f, ts, h as `0x${string}`]
    );
    return keccak256(encoded);
};

async function main() {
    console.log(`🚀 Creating Test Intent for Bot: ${account.address}`);

    // Use the initialized pool (tickSpacing: 60)
    const fee = 3000;
    const tickSpacing = 60;
    const poolId = getLocalPoolId(USDC, WETH, fee, tickSpacing, HOOK);

    console.log(`🎯 Targeted Pool: ${poolId} (USDC/WETH 3000/60)`);

    const amount = parseUnits("0.05", 18); // Bot provides 0.05 WETH
    const nonce = BigInt(Math.floor(Date.now() / 1000));
    const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    const witness = {
        poolId,
        hook: HOOK
    };

    const signature = await walletClient.signTypedData({
        domain: {
            name: 'Permit2',
            chainId: 1301,
            verifyingContract: PERMIT2,
        },
        types: {
            PermitWitnessTransferFrom: [
                { name: "permitted", type: "TokenPermissions" },
                { name: "spender", type: "address" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
                { name: "witness", type: "WitnessData" }
            ],
            TokenPermissions: [
                { name: "token", type: "address" },
                { name: "amount", type: "uint256" }
            ],
            WitnessData: [
                { name: "poolId", type: "bytes32" },
                { name: "hook", type: "address" }
            ]
        },
        primaryType: 'PermitWitnessTransferFrom',
        message: {
            permitted: {
                token: WETH,
                amount
            },
            spender: HOOK,
            nonce,
            deadline: BigInt(expiry),
            witness
        }
    });

    const order = {
        id: `FINAL_VERIF_${nonce.toString(16)}`,
        id_hex: `FINAL_VERIF_${nonce.toString(16)}`,
        provider: account.address,
        tokenA: "WETH",
        tokenB: "USDC",
        amountA: "0.05",
        amountB: "10",
        fee,
        tickSpacing,
        hookAddress: HOOK,
        poolId,
        nonce: nonce.toString(),
        expiry: expiry * 1000,
        signature,
        liquidityMode: 'single-sided'
    };

    console.log("📡 Posting to Relayer...");
    const response = await axios.post('http://localhost:3000/api/relayer/orders', { order });
    console.log(`✅ Status: ${response.status}`);
    console.log("✨ Test Intent Published!");
}

main().catch(console.error);
