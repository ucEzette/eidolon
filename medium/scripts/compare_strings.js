
const { getTypesForEIP712Domain, encodeType, hashTypedData } = require("viem");

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

// viem's way of getting the type string (roughly)
const typeString = "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,WitnessData witness)TokenPermissions(address token,uint256 amount)WitnessData(bytes32 poolId,address hook)";
console.log("Viem/Frontend Type String:", typeString);

const contract_stub = "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,";
const contract_witness_part = "WitnessData witness)TokenPermissions(address token,uint256 amount)WitnessData(bytes32 poolId,address hook)";
const contract_full = contract_stub + contract_witness_part;
console.log("Contract Expected String :", contract_full);

console.log("Match?", typeString === contract_full);

// Check if maybe there is a space after the comma in the stub?
const contract_stub_with_space = "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline, ";
const contract_full_with_space = contract_stub_with_space + contract_witness_part;
console.log("With Space Match?       :", typeString === contract_full_with_space);

// Check if maybe the witness part should be different?
// ...
