
const { decodeAbiParameters, recoverTypedDataAddress, keccak256, toBytes, parseUnits } = require("viem");

const hookData = "0x00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000010000000000000000000000004c9de23f22992a51d6790c877870d7334b053d4b000000000000000000000000420000000000000000000000000000000000000600000000000000000000000000000000000000000000000000b1a2bc2ec50000a247cb37f130d76157c2b4ec621284b29be1923d53f59339b29190fb80f37a550000000000000000000000000000000000000000000000000000000069ac3dcf0000000000000000000000000000000000000000000000000000019c2e529a290000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000041ba12965f1e0c045947588ed0ed871ffec684b3711e83ab40027595a02cfb55520de87a3bd80b0a8652d82c3ff478f4d82c4f666f4d62e59ae485e1c975cdb9021b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a247cb37f130d76157c2b4ec621284b29be1923d53f59339b29190fb80f37a55000000000000000000000000a5cc49688cb5026977a2a501cd7dd3dab2c580c8";

const types = [
    { components: [{ name: 'provider', type: 'address' }, { name: 'currency', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'poolId', type: 'bytes32' }, { name: 'deadline', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'isDualSided', type: 'bool' }], name: 'permits', type: 'tuple[]' },
    { name: 'signatures', type: 'bytes[]' },
    { components: [{ name: 'poolId', type: 'bytes32' }, { name: 'hook', type: 'address' }], name: 'witnesses', type: 'tuple[]' }
];

const decoded = decodeAbiParameters(types, hookData);
const permit = decoded[0][0];
const signature = decoded[1][0];
const witness = decoded[2][0];

const domain = {
    name: 'Permit2',
    chainId: 1301,
    verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
};

async function checkVariations() {
    const permitTypes = {
        PermitWitnessTransferFrom: [
            { name: 'permitted', type: 'TokenPermissions' },
            { name: 'spender', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'witness', type: 'WitnessData' }
        ],
        TokenPermissions: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        WitnessData: [
            { name: 'poolId', type: 'bytes32' },
            { name: 'hook', type: 'address' }
        ]
    };

    console.log("Expected Signer:", permit.provider);

    // Variation 1: Standard
    try {
        const addr = await recoverTypedDataAddress({
            domain,
            types: permitTypes,
            primaryType: 'PermitWitnessTransferFrom',
            message: {
                permitted: { token: permit.currency, amount: permit.amount },
                spender: witness.hook,
                nonce: permit.nonce,
                deadline: permit.deadline,
                witness: witness
            },
            signature
        });
        console.log("Variation 1 (Standard) Recovered:", addr);
        if (addr.toLowerCase() === permit.provider.toLowerCase()) console.log("   ✅ MATCH!");
    } catch (e) {
        console.log("Variation 1 Failed:", e.message);
    }

    // Variation 2: Spender is a different address? (Unlikely)

    // Variation 3: Nonce is DIFFERENT?
    // Let's try recovering with slightly different nonces if they were close.
    // ...
}

checkVariations();
