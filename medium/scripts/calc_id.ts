import { encodeAbiParameters, keccak256 } from 'viem';

const WETH = "0x4200000000000000000000000000000000000006";
const eiETH = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";
const HOOK = "0x85bF7A29023EA1f853045fC848b31C9bE4Eaa0C8";

// Sort tokens - currency0 < currency1
const currency0 = (WETH.toLowerCase() < eiETH.toLowerCase() ? WETH : eiETH) as `0x${string}`;
const currency1 = (WETH.toLowerCase() < eiETH.toLowerCase() ? eiETH : WETH) as `0x${string}`;

console.log("Token ordering:");
console.log("  currency0:", currency0);
console.log("  currency1:", currency1);
console.log("");

// Calculate pool ID with fee=100 (old wrong value)
const keyBytes100 = encodeAbiParameters(
    [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' }
    ],
    [currency0, currency1, 100, 60, HOOK as `0x${string}`]
);
console.log("Pool ID with fee=100:", keccak256(keyBytes100));

// Calculate pool ID with fee=3000 (correct value)
const keyBytes3000 = encodeAbiParameters(
    [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' }
    ],
    [currency0, currency1, 3000, 60, HOOK as `0x${string}`]
);
console.log("Pool ID with fee=3000:", keccak256(keyBytes3000));

// The order has this poolId
console.log("\nOrder's poolId:      0x3de81fb5bf18e9029eda856f68e4c8acc0cb4a8a543a2629a430e298c962975b");
