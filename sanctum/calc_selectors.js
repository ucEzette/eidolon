
const { keccak256, toBytes, encodePacked } = require("viem");

const errors = [
    "OnlyPoolManager()",
    "OnlyOwner()",
    "InsufficientLiquidity()",
    "TransferFromFailed()",
    "TransferFailed()",
    "ApproveFailed()",
    "PoolNotInitialized()",
    "ManagersNotEqual()",
    "LoopNotStarted()",
    "UnlockNotCalled()",
    "InvalidTick()",
    "NotPoolManager()",
    "LockFailure()",
    "LiquidityAddFailed()",
    "ModifyLiquidityFailed()",
    "NotOwner()", // EidolonHook
    "ZeroAddress()", // EidolonHook
    "FeeTooHigh()", // EidolonHook
    "AtomicGuardViolation(uint256,uint256)", // EidolonHook
    "ProtocolFeeOverflow()",
    "CallerNotManager()",
    "LockNotAcquired()",
    "LiquidityOverflow()",
    "PoolAlreadyInitialized()",
    "TickSpacingTooSmall()",
    "TickSpacingTooLarge()",
    "TickSpacingNotModulo()",
    "CurrenciesInitialized()"
];

errors.forEach(err => {
    const sel = keccak256(toBytes(err)).slice(0, 10);
    console.log(`${err}: ${sel}`);
});
