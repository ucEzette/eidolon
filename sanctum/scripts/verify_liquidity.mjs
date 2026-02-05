
import { createPublicClient, http, encodeAbiParameters, keccak256, hexToBigInt } from 'viem';
import { defineChain } from 'viem';

const unichainSepolia = defineChain({
    id: 1301,
    name: "Unichain Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://sepolia.unichain.org"] } },
});

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http(),
});

const POOL_MANAGER_ADDRESS = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";
const POOL_ID = "0x9b231540ae1f621f8f03292013432197e4341ffa8a5568ec4e5ff9bbead7e682"; // Found NATIVE/USDC 10000/200

async function main() {
    console.log("Checking Pool Liquidity & State...");
    console.log(`Pool ID: ${POOL_ID}`);

    // Base Slot for _pools[poolId] is keccak256(poolId . 6)
    const baseSlotHash = keccak256(encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'uint256' }],
        [POOL_ID, 6n]
    ));

    // Check Slot 0 (SqrtPrice, Tick, etc.)
    const slot0Val = await client.getStorageAt({
        address: POOL_MANAGER_ADDRESS,
        slot: baseSlotHash
    });
    console.log(`\nSlot 0 (State): ${slot0Val}`);

    // Check Slot 3 (Liquidity) assuming Struct Layout:
    // Slot 0: Slot0 (packed)
    // Slot 1: FeeGrowth0
    // Slot 2: FeeGrowth1
    // Slot 3: Liquidity

    const baseBigInt = hexToBigInt(baseSlotHash);

    // Helper to get slot at offset
    const getSlotAtOffset = async (offset) => {
        const slot = '0x' + (baseBigInt + BigInt(offset)).toString(16).padStart(64, '0');
        return await client.getStorageAt({
            address: POOL_MANAGER_ADDRESS,
            slot: slot
        });
    };

    const liquidityVal = await getSlotAtOffset(3);
    console.log(`Slot 3 (Liquidity): ${liquidityVal}`);

    if (liquidityVal && hexToBigInt(liquidityVal) === 0n) {
        console.log("\n⚠️  LIQUIDITY IS ZERO.");
        console.log("This explains why swaps return 0. You must add liquidity.");
    } else {
        console.log(`\n✅ Liquidity Found: ${hexToBigInt(liquidityVal)}`);
    }
}

main();
