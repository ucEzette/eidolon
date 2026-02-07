import {
    createWalletClient,
    createPublicClient,
    http,
    parseEther,
    parseAbi,
    maxUint256
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { unichainSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const account = privateKeyToAccount(PRIVATE_KEY);

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const EXECUTOR = "0x0193d894abf6Cb5e932a9ba064901e81bF244F23";
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

const ABI = parseAbi([
    'function approve(address,uint256) returns (bool)',
    'function allowance(address,address) view returns (uint256)'
]);

async function checkAndApprove(token: `0x${string}`, spender: `0x${string}`, name: string) {
    const allowance = await publicClient.readContract({
        address: token,
        abi: ABI,
        functionName: 'allowance',
        args: [account.address, spender]
    });

    if (allowance < (maxUint256 / 2n)) {
        console.log(`🔓 Approving ${name} for ${spender}...`);
        const hash = await walletClient.writeContract({
            address: token,
            abi: ABI,
            functionName: 'approve',
            args: [spender, maxUint256]
        });
        console.log(`✅ Approved ${name}: ${hash}`);
        await publicClient.waitForTransactionReceipt({ hash });
    } else {
        console.log(`✅ ${name} already approved for ${spender}`);
    }
}

async function main() {
    console.log(`🚀 Preparing Bot: ${account.address}`);

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💰 ETH Balance: ${balance.toString()}`);

    await checkAndApprove(WETH, PERMIT2, "WETH -> Permit2");
    await checkAndApprove(USDC, PERMIT2, "USDC -> Permit2");
    await checkAndApprove(WETH, EXECUTOR, "WETH -> Executor");
    await checkAndApprove(USDC, EXECUTOR, "USDC -> Executor");

    console.log("\n✨ Bot Prepared for Exorcism!");
}

main().catch(console.error);
