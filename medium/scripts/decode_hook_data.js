"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
const hookDataHex = process.argv[2];
if (!hookDataHex) {
    console.error("Please provide hookData hex as argument");
    process.exit(1);
}
const params = [
    {
        components: [
            { name: 'provider', type: 'address' },
            { name: 'currency', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'poolId', type: 'bytes32' },
            { name: 'deadline', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'isDualSided', type: 'bool' }
        ],
        name: 'permits',
        type: 'tuple[]'
    },
    { name: 'signatures', type: 'bytes[]' },
    {
        components: [
            { name: 'poolId', type: 'bytes32' },
            { name: 'hook', type: 'address' }
        ],
        name: 'witnesses',
        type: 'tuple[]'
    }
];
try {
    const decoded = (0, viem_1.decodeAbiParameters)(params, hookDataHex);
    console.log(JSON.stringify(decoded, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}
catch (e) {
    console.error("Decode failed:", e.message);
}
