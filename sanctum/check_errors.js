const { keccak256 } = require("viem");

const errors = [
    "ERC20TransferFailed()",
    "NativeTransferFailed()",
    "InsufficientBalance()",
    "InsufficientAllowance()",
    "InvalidAmount(uint256)",
    "LengthMismatch()"
];

errors.forEach(err => {
    const selector = keccak256(Buffer.from(err)).slice(0, 10);
    console.log(`${selector}: ${err}`);
});
