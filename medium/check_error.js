const { keccak256, toHex } = require("viem");
const errors = [
    "InvalidSignature()",
    "SignatureExpired(uint256)",
    "PermitExpired(uint256,uint256)",
    "WitnessMismatch(bytes32,bytes32)",
    "AtomicGuardViolation(uint256,uint256)",
    "InsufficientLiquidity()",
    "OnlyPoolManager()",
    "MEVDetected()",
    "PoolNotInitialized()",
    "DelegateCallNotAllowed()"
];
errors.forEach(e => {
    const hash = keccak256(Buffer.from(e)).slice(0, 10);
    console.log(`${hash} : ${e}`);
});
