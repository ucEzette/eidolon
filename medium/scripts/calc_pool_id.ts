
import { encodeAbiParameters, keccak256 } from 'viem';

const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
const WETH = "0x4200000000000000000000000000000000000006";
const EIETH = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";
const HOOKS = "0x7A3FDC42Ec96AFeF175FA446ee62057F412A20c8";

function getPoolId(c0: string, c1: string, fee: number, tickSpacing: number, hooks: string) {
    const [t0, t1] = c0.toLowerCase() < c1.toLowerCase() ? [c0, c1] : [c1, c0];
    const encoded = encodeAbiParameters(
        [
            { name: "currency0", type: "address" },
            { name: "currency1", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "tickSpacing", type: "int24" },
            { name: "hooks", type: "address" },
        ],
        [t0 as `0x${string}`, t1 as `0x${string}`, fee, tickSpacing, hooks as `0x${string}`]
    );
    return keccak256(encoded);
}

console.log("USDC/WETH Pool ID:", getPoolId(USDC, WETH, 3000, 60, HOOKS));
console.log("WETH/eiETH Pool ID:", getPoolId(WETH, EIETH, 3000, 60, HOOKS));
console.log("USDC/eiETH Pool ID:", getPoolId(USDC, EIETH, 3000, 60, HOOKS));
