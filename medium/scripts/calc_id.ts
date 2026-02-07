
import { encodeAbiParameters, keccak256 } from 'viem';

const WETH = "0x4200000000000000000000000000000000000006";
const eiETH = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6";
const HOOK = "0x1244359060e16429A5568085012606c0213020c8";

const currency0 = (WETH.toLowerCase() < eiETH.toLowerCase() ? WETH : eiETH) as `0x${string}`;
const currency1 = (WETH.toLowerCase() < eiETH.toLowerCase() ? eiETH : WETH) as `0x${string}`;

const fee = 100;
const ts = 60;

const keyBytes = encodeAbiParameters(
    [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' }
    ],
    [currency0, currency1, fee, ts, HOOK as `0x${string}`]
);
console.log(keccak256(keyBytes));
