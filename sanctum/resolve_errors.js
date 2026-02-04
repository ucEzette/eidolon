/* eslint-disable @typescript-eslint/no-require-imports */
const { keccak256, toBytes } = require("viem");

const errors = [
    // IPoolManager
    "CurrencyNotSettled()",
    "PoolNotInitialized()",
    "AlreadyUnlocked()",
    "ManagerLocked()",
    "TickSpacingTooLarge(int24)",
    "TickSpacingTooSmall(int24)",
    "CurrenciesOutOfOrderOrEqual(address,address)",
    "UnauthorizedDynamicLPFeeUpdate()",
    "SwapAmountCannotBeZero()",
    "NonzeroNativeValue()",
    "MustClearExactPositiveDelta()",
    "ProtocolFeeTooLarge(uint24)",
    "ProtocolFeeCurrencySynced()",
    "DelegateCallNotAllowed()",
    "InvalidCaller()",

    // Hooks Library
    "HookAddressNotValid(address)",
    "InvalidHookResponse()",
    "HookCallFailed()",
    "HookDeltaExceedsSwapAmount()",

    // EidolonHook
    "WitnessMismatch(bytes32,bytes32)",
    "PermitExpired(uint256,uint256)",
    "AtomicGuardViolation(uint256,uint256)",
    "InvalidSignature()",
    "InsufficientLiquidity()",
    "OnlyPoolManager()",
    "MEVDetected()",

    // Permit2
    "InvalidSigner()",
    "SignatureExpired(uint256)",
    "InvalidNonce()",
    "InsufficientAllowance()",
    "ExcessiveInvalidation()",
    "InvalidAmount(uint256)",
    "InvalidToken(address)",
    "InvalidPermit()",
    "LengthMismatch()",

    // Common
    "SafeCastOverflow()",
    "SafeTransferFailed()",
    "ETHTransferFailed()",
    "TransferFailed()",
    "InsufficientBalance()",
    "AmountsAreZero()",
    "InputLengthMismatch()",
    "SliceOutOfBounds()",
    "BytesOutOfBounds()",
    "PopulateTransactionFailed()",
    "ExecutionFailed()",

    // Custom possibly
    "PoolAlreadyInitialized()",
    "PoolKeyAlreadyExists()",
    "InvalidPoolKey()"
];

console.log("Computing selectors...");
errors.forEach(err => {
    const sel = keccak256(toBytes(err)).slice(0, 10);
    if (sel.includes("9e4d7cc7") || sel.includes("90bfb865") || sel.includes("486aa307")) {
        console.log(`MATCH FOUND: ${sel} -> ${err}`);
    }
});
