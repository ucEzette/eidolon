
import {
    keccak256,
    encodeAbiParameters,
    Hex
} from 'viem';

function getPoolId(
    currency0: Hex,
    currency1: Hex,
    fee: number,
    tickSpacing: number,
    hooks: Hex
): Hex {
    return keccak256(
        encodeAbiParameters(
            [
                { type: 'address' },
                { type: 'address' },
                { type: 'uint24' },
                { type: 'int24' },
                { type: 'address' }
            ],
            [currency0, currency1, fee, tickSpacing, hooks]
        )
    );
}

function getPoolStateSlot(poolId: Hex): Hex {
    const POOLS_MAPPING_SLOT = 6n;
    return keccak256(
        encodeAbiParameters(
            [{ type: 'bytes32' }, { type: 'uint256' }],
            [poolId, POOLS_MAPPING_SLOT]
        )
    );
}

const WETH = "0x4200000000000000000000000000000000000006" as Hex;
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F" as Hex;
const hook = "0x85bF7A29023EA1f853045fC848b31C9bE4Eaa0C8" as Hex;

const [c0, c1] = WETH.toLowerCase() < USDC.toLowerCase() ? [WETH, USDC] : [USDC, WETH];

const id = getPoolId(c0, c1, 3000, 60, hook);
const slot = getPoolStateSlot(id);

console.log("ETH/USDC (3000/60, Correct Hook 0x1244...)");
console.log("Pool ID:", id);
console.log("Slot   :", slot);
