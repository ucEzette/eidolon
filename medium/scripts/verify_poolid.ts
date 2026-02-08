
import { createPublicClient, http, keccak256, encodePacked, encodeAbiParameters } from 'viem';
import { unichainSepolia } from 'viem/chains';

const client = createPublicClient({
    chain: unichainSepolia,
    transport: http("https://sepolia.unichain.org")
});

// WETH/eiETH pool key
const token0 = "0x4200000000000000000000000000000000000006"; // WETH
const token1 = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6"; // eiETH
const fee = 3000;
const tickSpacing = 60;
const hooks = "0x7A3FDC42Ec96AFeF175FA446ee62057F412A20c8";

// Calculate pool ID the same way Uniswap does
const [c0, c1] = token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0];
const encoded = encodeAbiParameters(
    [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' },
    ],
    [c0 as `0x${string}`, c1 as `0x${string}`, fee, tickSpacing, hooks as `0x${string}`]
);
const poolId = keccak256(encoded);

console.log("Token0:", c0);
console.log("Token1:", c1);
console.log("Calculated Pool ID:", poolId);
console.log("Expected Pool ID: 0xdf3ebc2dbf48d8d04e00deb19ff13231c5ae3025709aab4a5bb26f5010b0261f");
console.log("Match:", poolId.toLowerCase() === "0xdf3ebc2dbf48d8d04e00deb19ff13231c5ae3025709aab4a5bb26f5010b0261f");
