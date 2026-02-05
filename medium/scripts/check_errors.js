
const { keccak256, encodeAbiParameters, verifyTypedData, parseUnits } = require("viem");

const key = {
    currency0: "0x4200000000000000000000000000000000000006",
    currency1: "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6",
    fee: 3000,
    tickSpacing: 60,
    hooks: "0xa5CC49688cB5026977a2A501cd7dD3daB2C580c8"
};

const encoded = encodeAbiParameters(
    [
        { name: "currency0", type: "address" },
        { name: "currency1", type: "address" },
        { name: "fee", type: "uint24" },
        { name: "tickSpacing", type: "int24" },
        { name: "hooks", type: "address" }
    ],
    [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
);
console.log("Calculated PoolId:", keccak256(encoded));

const hookDataPoolId = "0xa247cb37f130d76157c2b4ec621284b29be1923d53f59339b29190fb80f37a55";
console.log("PoolId from hookData matches?", hookDataPoolId === keccak256(encoded));

// Signature Verification Check
async function checkSignature() {
    const provider = "0x4c9de23f22992a51d6790c877870d7334b053d4b";
    const signature = "0xba12965f1e0c045947588ed0ed871ffec684b3711e83ab40027595a02cfb55520de87a3bd80b0a8652d82c3ff478f4d82c4f666f4d62e59ae485e1c975cdb9021b";
    const amount = 50000000000000000n; // 0.05 ETH
    const nonce = 1738768786479n; // Decoded from hookData signatures area? No, need to decode correctly.
    // Let's decode the permit more carefully from the raw data.
}
checkSignature();
