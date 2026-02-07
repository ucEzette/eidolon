
import {
    keccak256,
    encodeAbiParameters,
    Hex
} from 'viem';

const addr1 = "0x31d0220469e10c4E71834a79b1f276d740d3768F" as Hex;
const addr2 = "0x31d0220469e10c4e71834a79b1f276d740d3768f" as Hex;

const hash1 = keccak256(encodeAbiParameters([{ type: 'address' }], [addr1]));
const hash2 = keccak256(encodeAbiParameters([{ type: 'address' }], [addr2]));

console.log("Hash 1:", hash1);
console.log("Hash 2:", hash2);
console.log("Match:", hash1 === hash2);
