const { keccak256, encodePacked, encodeAbiParameters } = require("viem");

// From Image 4 and logs
const currency0 = "0x4200000000000000000000000000000000000006".toLowerCase();
const currency1 = "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6".toLowerCase();
const fee = 3000;
const tickSpacing = 60;
const hooks = "0x78bb3Cc9986310FB935485192adb2Fe18C5c20C8".toLowerCase();

const poolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks
};

const poolId = keccak256(encodeAbiParameters(
    [
        { type: "address", name: "currency0" },
        { type: "address", name: "currency1" },
        { type: "uint24", name: "fee" },
        { type: "int24", name: "tickSpacing" },
        { type: "address", name: "hooks" }
    ],
    [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks
    ]
));

console.log(`Calculated PoolId: ${poolId}`);

const POOLS_SLOT = BigInt(6);
const stateSlot = keccak256(encodePacked(
    ["bytes32", "uint256"],
    [poolId, POOLS_SLOT]
));

console.log(`Calculated StateSlot: ${stateSlot}`);
