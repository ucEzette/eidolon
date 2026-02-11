// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ═══════════════════════════════════════════════════════════════════════════════
// UNISWAP V4 CORE IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {console2} from "forge-std/console2.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary, toBeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// PERMIT2 IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import {IEidolonHook} from "./interfaces/IEidolonHook.sol";

import {JITLiquidityLib} from "./libraries/JITLiquidityLib.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";

/// @title EidolonHook
/// @author EIDOLON Protocol
/// @notice The core "Quantum Liquidity" Hook for Uniswap v4
/// @dev Implements JIT (Just-In-Time) liquidity using Permit2 Witness signatures
///      Users keep funds in their wallets; the Hook "materializes" liquidity only
///      for the exact duration of a swap, returning funds + fees atomically.
contract EidolonHook is BaseHook, IEidolonHook {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;
    using SafeTransferLib for ERC20;

    // ═══════════════════════════════════════════════════════════════════════════
    // IMMUTABLE STATE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice The canonical Permit2 contract
    /// @dev Set at construction, never changes
    IAllowanceTransfer public immutable PERMIT2;

    // ═══════════════════════════════════════════════════════════════════════════
    // FEE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Fee for "Lazy Investor" (Single-Sided) liquidity providers
    /// @dev Default: 20% of profit = 2000 basis points (provider keeps 80%)
    uint16 public singleSidedFeeBps = 2000;

    /// @notice Fee for "Pro LP" (Dual-Sided) liquidity providers
    /// @dev Default: 10% of profit = 1000 basis points (provider keeps 90%)
    uint16 public dualSidedFeeBps = 1000;

    /// @notice Maximum allowed fee in basis points (50% cap)
    uint16 public constant MAX_FEE_BPS = 5000;

    /// @notice Basis points denominator
    uint16 public constant BPS_DENOMINATOR = 10000;

    // ═══════════════════════════════════════════════════════════════════════════
    // PROVIDER TYPES
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Provider type for fee calculation
    enum ProviderType {
        SINGLE_SIDED, // Lazy Investor - 20% fee
        DUAL_SIDED // Pro LP - 10% fee
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Contract owner for admin functions
    address public owner;

    /// @notice Treasury address for fee withdrawals
    address public treasury;

    /// @notice Tracks membership expiry timestamps for fee exemptions
    /// @dev provider => expiry timestamp (0 = no membership)
    mapping(address => uint256) public membershipExpiry;

    /// @notice Tracks active sessions for providers
    /// @dev provider => expiry timestamp
    mapping(address => uint256) public userSessionExpiry;

    /// @notice Tracks used nonces to prevent replay attacks
    /// @dev provider => nonce => used
    mapping(address => mapping(uint256 => bool)) public isNonceUsed;

    /// @notice Tracks active materializations for atomic settlement
    /// @dev poolId => provider => MaterializationState
    struct MaterializationState {
        uint256 amount; // Input token amount
        uint128 liquidity; // Liquidity units minted
        int24 tickLower; // JIT range lower
        int24 tickUpper; // JIT range upper
        uint256 initialBalance0; // Balance of currency0 before JIT
        uint256 initialBalance1; // Balance of currency1 before JIT
        Currency currency; // Input currency
        ProviderType providerType;
        bool active;
    }
    mapping(bytes32 => mapping(address => MaterializationState))
        private _materializations;

    /// @notice Protocol fee accumulator
    /// @dev currency => accumulated fees
    mapping(Currency => uint256) public protocolFees;

    /// @notice Tracks total lifetime earnings for each provider
    /// @dev provider => currency => total earnings
    mapping(address => mapping(Currency => uint256)) public lifetimeEarnings;

    /// @notice Bot kill count for the Exorcism leaderboard
    /// @dev user => number of bots exorcised
    mapping(address => uint256) public botKillCount;

    /// @notice Tracks last block's swap info per pool for sandwich detection
    /// @dev poolId => (blockNumber, swapCount, lastSender)
    struct SwapContext {
        uint256 blockNumber;
        uint8 swapCount;
        address lastSender;
    }
    mapping(bytes32 => SwapContext) private _swapContexts;

    /// @notice Tracks active providers for the current swap (multi-provider support)
    /// @dev poolId => list of active provider addresses for current block
    mapping(bytes32 => address[]) private _activeProviders;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when membership is added or extended
    event MembershipUpdated(address indexed provider, uint256 expiry);

    /// @notice Emitted when membership is revoked
    event MembershipRevoked(address indexed provider);

    /// @notice Emitted when protocol fees are withdrawn
    event FeesWithdrawn(
        Currency indexed currency,
        address indexed to,
        uint256 amount
    );

    /// @notice Emitted when treasury address is updated
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    /// @notice Emitted when ownership is transferred
    event OwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );

    /// @notice Emitted when fee rates are updated
    event FeesUpdated(uint16 singleSidedFeeBps, uint16 dualSidedFeeBps);

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Thrown when caller is not the owner
    error NotOwner();

    /// @notice Thrown when address is zero
    error ZeroAddress();

    /// @notice Thrown when withdrawal amount exceeds balance
    error InsufficientFees();

    /// @notice Thrown when fee exceeds maximum allowed
    error FeeTooHigh();

    /// @notice Thrown when solvency check fails (principal lost)
    error SolvencyViolation();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Restricts function access to owner only
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Deploys the EIDOLON Hook
    /// @param _poolManager The Uniswap v4 PoolManager address
    /// @param _permit2 The canonical Permit2 contract address
    /// @param _owner The initial owner address (for admin functions)
    /// @param _treasury The initial treasury address (for fee withdrawal)
    constructor(
        IPoolManager _poolManager,
        address _permit2,
        address _owner,
        address _treasury
    ) BaseHook(_poolManager) {
        PERMIT2 = IAllowanceTransfer(_permit2);
        owner = _owner;
        treasury = _treasury;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Add or extend membership for a provider (fee exemption)
    /// @param provider The provider address
    /// @param duration Duration in seconds to add to membership
    function addMembership(
        address provider,
        uint256 duration
    ) external onlyOwner {
        if (provider == address(0)) revert ZeroAddress();
        uint256 currentExpiry = membershipExpiry[provider];
        uint256 newExpiry;

        if (currentExpiry > block.timestamp) {
            // Extend existing membership
            newExpiry = currentExpiry + duration;
        } else {
            // Start new membership from now
            newExpiry = block.timestamp + duration;
        }

        membershipExpiry[provider] = newExpiry;
        emit MembershipUpdated(provider, newExpiry);
    }

    /// @notice Revoke membership for a provider
    /// @param provider The provider address
    function revokeMembership(address provider) external onlyOwner {
        membershipExpiry[provider] = 0;
        emit MembershipRevoked(provider);
    }

    /// @notice Check if a provider has an active membership
    /// @param provider The provider address
    /// @return True if provider has active membership
    function isMember(address provider) public view returns (bool) {
        return membershipExpiry[provider] >= block.timestamp;
    }

    /// @notice Withdraw accumulated protocol fees
    /// @param currency The currency to withdraw
    /// @param amount The amount to withdraw (0 = all)
    function withdrawFees(
        Currency currency,
        uint256 amount
    ) external onlyOwner {
        if (treasury == address(0)) revert ZeroAddress();

        uint256 available = protocolFees[currency];
        uint256 withdrawAmount = amount == 0 ? available : amount;

        if (withdrawAmount > available) revert InsufficientFees();

        protocolFees[currency] -= withdrawAmount;

        // Transfer to treasury
        currency.transfer(treasury, withdrawAmount);

        emit FeesWithdrawn(currency, treasury, withdrawAmount);
    }

    /// @notice Update the treasury address
    /// @param newTreasury The new treasury address
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Update fee rates for provider types
    /// @param newSingleSidedFeeBps New fee for single-sided (Lazy Investor) in basis points
    /// @param newDualSidedFeeBps New fee for dual-sided (Pro LP) in basis points
    function setFees(
        uint16 newSingleSidedFeeBps,
        uint16 newDualSidedFeeBps
    ) external onlyOwner {
        if (newSingleSidedFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (newDualSidedFeeBps > MAX_FEE_BPS) revert FeeTooHigh();

        singleSidedFeeBps = newSingleSidedFeeBps;
        dualSidedFeeBps = newDualSidedFeeBps;

        emit FeesUpdated(newSingleSidedFeeBps, newDualSidedFeeBps);
    }

    /// @notice Transfer ownership
    /// @param newOwner The new owner address
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /// @inheritdoc IEidolonHook
    function activateSession(
        IAllowanceTransfer.PermitSingle calldata permit,
        bytes calldata signature
    ) external override {
        // 1. Verify and Execute Permit
        // This sets the allowance for this hook on Permit2
        PERMIT2.permit(msg.sender, permit, signature);

        // 2. Register Session
        userSessionExpiry[msg.sender] = permit.details.expiration;

        emit SessionActivated(msg.sender, permit.details.expiration);
    }

    /// @inheritdoc IEidolonHook
    function isSessionActive(
        address provider
    ) public view override returns (bool) {
        return userSessionExpiry[provider] > block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOOK PERMISSIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Returns the hook permissions bitmap
    /// @dev Enables beforeSwap and afterSwap hooks
    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: true, // ✓ Limit initialization
                afterInitialize: true, // ✓ Verify initialization
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true, // ✓ Materialize liquidity
                afterSwap: true, // ✓ Settle and return funds
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: true, // ✓ Modify swap amounts
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOOK CALLBACKS (Override internal virtual functions from BaseHook)
    // ═══════════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION HOOKS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice No-op hook to verify initialization
    function _beforeInitialize(
        address,
        PoolKey calldata,
        uint160
    ) internal override returns (bytes4) {
        return this.beforeInitialize.selector;
    }

    /// @notice Verify initialization valid
    function _afterInitialize(
        address,
        PoolKey calldata,
        uint160 sqrtPriceX96,
        int24
    ) internal override returns (bytes4) {
        if (sqrtPriceX96 == 0) revert PoolNotInitialized();
        return this.afterInitialize.selector;
    }

    /// @notice Internal hook called before a swap executes
    /// @dev Validates Ghost Session(s) and materializes JIT liquidity
    /// @param sender The address initiating the swap
    /// @param key The pool being swapped on
    /// @param params The swap parameters
    /// @param hookData Encoded array of GhostInstruction structs
    /// @return selector The function selector
    /// @return beforeSwapDelta The delta to apply before the swap
    /// @return lpFeeOverride Fee override (0 = use pool default)
    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        console2.log("EidolonHook: _beforeSwap entered");

        // If no hookData provided, this is a normal swap - don't interfere
        if (hookData.length == 0) {
            return (
                this.beforeSwap.selector,
                BeforeSwapDeltaLibrary.ZERO_DELTA,
                0
            );
        }

        PoolId poolId = key.toId();

        // ANCHOR CHECK: Skip if liquidity is too low (prevent manipulation of empty pools)
        uint128 poolLiquidity = poolManager.getLiquidity(poolId);
        // Using a conservative threshold for "initialized and active"
        // In production, this should be value-aware.
        if (poolLiquidity < 1000000) {
            // Return zero delta, effectively skipping ghost logic
            return (
                this.beforeSwap.selector,
                BeforeSwapDeltaLibrary.ZERO_DELTA,
                0
            );
        }

        bytes32 poolIdBytes = PoolId.unwrap(poolId);

        _handleExorcism(sender, poolId, poolIdBytes);

        (
            int128 totalSpecifiedClaimed,
            int128 totalUnspecifiedClaimed
        ) = _processGhostInstructions(sender, key, params, hookData);

        return (
            this.beforeSwap.selector,
            toBeforeSwapDelta(totalSpecifiedClaimed, totalUnspecifiedClaimed),
            0
        );
    }

    /// @notice Helper to process all ghost instructions
    function _processGhostInstructions(
        address, // sender (unused)
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    )
        internal
        returns (int128 totalSpecifiedClaimed, int128 totalUnspecifiedClaimed)
    {
        GhostInstruction[] memory instructions = abi.decode(
            hookData,
            (GhostInstruction[])
        );

        PoolId poolId = key.toId();
        bytes32 poolIdBytes = PoolId.unwrap(poolId);

        bool isSameBlock = _swapContexts[poolIdBytes].blockNumber ==
            block.number;
        uint256 swapCount = _swapContexts[poolIdBytes].swapCount;
        bool isZeroForOne = params.zeroForOne;
        (, int24 currentTick, , ) = poolManager.getSlot0(poolId);

        for (uint256 i = 0; i < instructions.length; i++) {
            _processSingleInstruction(
                instructions[i],
                key,
                poolId,
                poolIdBytes,
                currentTick,
                isZeroForOne,
                isSameBlock,
                swapCount
            );
        }

        return (0, 0);
    }

    function _processSingleInstruction(
        GhostInstruction memory instr,
        PoolKey calldata key,
        PoolId poolId,
        bytes32 poolIdBytes,
        int24 currentTick,
        bool isZeroForOne,
        bool isSameBlock,
        uint256 swapCount
    ) internal {
        // 1. Session Validation
        if (userSessionExpiry[instr.provider] <= block.timestamp) {
            return; // Session expired
        }

        // 1.5 Nonce Validation (Replay Protection)
        if (isNonceUsed[instr.provider][instr.nonce]) {
            revert InvalidNonce(instr.nonce);
        }
        isNonceUsed[instr.provider][instr.nonce] = true;

        // 2. Currency Validation
        if (
            (isZeroForOne &&
                Currency.unwrap(instr.currency) !=
                Currency.unwrap(key.currency1)) ||
            (!isZeroForOne &&
                Currency.unwrap(instr.currency) !=
                Currency.unwrap(key.currency0))
        ) {
            return;
        }

        // 3. Calculate JIT Position
        (int24 tickLower, int24 tickUpper, uint128 liquidity) = JITLiquidityLib
            .calculateJITPosition(
                key,
                currentTick,
                instr.amount,
                isZeroForOne,
                instr.currency
            );

        if (liquidity == 0) return;

        // 4. State Updates
        _activeProviders[poolIdBytes].push(instr.provider);

        _materializations[poolIdBytes][instr.provider] = MaterializationState({
            amount: instr.amount,
            liquidity: liquidity,
            tickLower: tickLower,
            tickUpper: tickUpper,
            initialBalance0: key.currency0.balanceOfSelf(),
            initialBalance1: key.currency1.balanceOfSelf(),
            currency: instr.currency,
            providerType: instr.isDualSided
                ? ProviderType.DUAL_SIDED
                : ProviderType.SINGLE_SIDED,
            active: true
        });

        if (isSameBlock && swapCount >= 2) {
            botKillCount[instr.provider]++;
        }

        // 5. Interactions (Pull Funds -> Mint Liquidity)
        // Use Permit2 transferFrom
        PERMIT2.transferFrom(
            instr.provider,
            address(this),
            uint160(instr.amount),
            Currency.unwrap(instr.currency)
        );

        // MINT JIT LIQUIDITY
        (BalanceDelta delta, ) = poolManager.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: bytes32(0)
            }),
            bytes("") // No callback data needed
        );

        // PAY FOR JIT
        if (delta.amount0() < 0) {
            uint256 amountToSettle = uint256(int256(-delta.amount0()));
            poolManager.sync(key.currency0);
            key.currency0.transfer(address(poolManager), amountToSettle);
            poolManager.settle();
        }
        if (delta.amount1() < 0) {
            uint256 amountToSettle = uint256(int256(-delta.amount1()));
            poolManager.sync(key.currency1);
            key.currency1.transfer(address(poolManager), amountToSettle);
            poolManager.settle();
        }

        emit LiquidityMaterialized(instr.provider, poolId, instr.amount, 0);
    }

    /// @notice Internal hook called after a swap executes
    /// @dev Settles all active providers, takes protocol fee, and returns funds
    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        bytes32 poolIdBytes = PoolId.unwrap(poolId);

        // Get all active providers for this pool
        address[] storage providers = _activeProviders[poolIdBytes];

        // If no active providers, nothing to settle
        if (providers.length == 0) {
            return (this.afterSwap.selector, 0);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // MULTI-PROVIDER SETTLEMENT: Process each provider
        // ═══════════════════════════════════════════════════════════════════════

        for (uint256 i = 0; i < providers.length; i++) {
            address provider = providers[i];
            MaterializationState storage state = _materializations[poolIdBytes][
                provider
            ];

            if (!state.active) continue;

            // BURN JIT LIQUIDITY
            // We burn exactly what we minted.
            // The delta we get back includes Principal + Fees + Swapped Amounts
            (BalanceDelta burnDelta, ) = poolManager.modifyLiquidity(
                key,
                ModifyLiquidityParams({
                    tickLower: state.tickLower,
                    tickUpper: state.tickUpper,
                    liquidityDelta: -int256(uint256(state.liquidity)),
                    salt: bytes32(0)
                }),
                bytes("")
            );

            // HANDLE BURN DELTAS
            // Positive delta = credit (we take tokens from PoolManager)
            // Negative delta = debit (we owe tokens to PoolManager, must settle)
            uint256 amount0Received;
            uint256 amount1Received;

            // SETTLE ANY NEGATIVE DELTAS FIRST (fees owed, or edge cases)
            if (burnDelta.amount0() < 0) {
                uint256 amountToSettle = uint256(int256(-burnDelta.amount0()));
                poolManager.sync(key.currency0);
                key.currency0.transfer(address(poolManager), amountToSettle);
                poolManager.settle();
            }
            if (burnDelta.amount1() < 0) {
                uint256 amountToSettle = uint256(int256(-burnDelta.amount1()));
                poolManager.sync(key.currency1);
                key.currency1.transfer(address(poolManager), amountToSettle);
                poolManager.settle();
            }

            // TAKE POSITIVE DELTAS (credits from removing liquidity)
            if (burnDelta.amount0() > 0) {
                amount0Received = uint256(int256(burnDelta.amount0()));
                poolManager.take(key.currency0, address(this), amount0Received);
            }
            if (burnDelta.amount1() > 0) {
                amount1Received = uint256(int256(burnDelta.amount1()));
                poolManager.take(key.currency1, address(this), amount1Received);
            }

            // solvency is checked implicitly by ensuring both currencies are returned to the provider
            // and the hook's own baseline balance is protected below.
            uint256 principalReturned = (state.currency == key.currency0)
                ? amount0Received
                : amount1Received;

            // To satisfy "funds never remain in contract", we return all remaining deltas to the provider.
            // 1. Calculate Profit and Protocol Fee if we got more principal back than we sent
            if (principalReturned > state.amount) {
                uint256 profit = principalReturned - state.amount;
                uint16 feeBps = _getProviderFee(provider, state.providerType);
                uint256 protocolCut = (profit * uint256(feeBps)) /
                    uint256(BPS_DENOMINATOR);

                if (protocolCut > 0) {
                    protocolFees[state.currency] += protocolCut;

                    // Subtract from the amount we send to the provider
                    if (state.currency == key.currency0) {
                        amount0Received -= protocolCut;
                    } else {
                        amount1Received -= protocolCut;
                    }
                }
            }
            // INVARIANT CHECK: Atomic Guard
            else if (principalReturned < state.amount) {
                revert AtomicGuardViolation(state.amount, principalReturned);
            }

            // To satisfy "funds never remain in contract", we return all remaining deltas to the provider.
            state.active = false;

            if (amount0Received > 0)
                _returnFunds(provider, key.currency0, amount0Received);
            if (amount1Received > 0)
                _returnFunds(provider, key.currency1, amount1Received);

            emit LiquiditySettled(provider, poolId, state.amount, 0);
        }

        // Clear active providers
        delete _activeProviders[poolIdBytes];

        return (this.afterSwap.selector, 0);
    }

    /// @notice Gets the protocol fee for a provider based on type and membership
    /// @param provider The provider address
    /// @param providerType The type of liquidity provision
    /// @return The fee in basis points
    function _getProviderFee(
        address provider,
        ProviderType providerType
    ) internal view returns (uint16) {
        // Subscribers pay no fees
        if (isMember(provider)) {
            return 0;
        }

        // Tiered fees based on provider type
        if (providerType == ProviderType.DUAL_SIDED) {
            return dualSidedFeeBps; // Pro LP
        }

        return singleSidedFeeBps; // Lazy Investor
    }

    /// @notice Returns funds to the provider after swap settlement
    /// @param provider The address to return funds to
    /// @param currency The currency to return
    /// @param amount The amount to return
    function _returnFunds(
        address provider,
        Currency currency,
        uint256 amount
    ) internal {
        if (currency.isAddressZero()) {
            // Return ETH
            (bool success, ) = provider.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Return ERC20
            currency.transfer(provider, amount);
        }
    }

    /// @notice Helper to handle anti-MEV logic
    function _handleExorcism(
        address sender,
        PoolId poolId,
        bytes32 poolIdBytes
    ) internal {
        SwapContext storage ctx = _swapContexts[poolIdBytes];
        if (ctx.blockNumber == block.number) {
            ctx.swapCount++;
            if (ctx.swapCount >= 3 && ctx.lastSender != sender) {
                emit ExorcismTriggered(poolId, sender);
                revert MEVDetected();
            }
        } else {
            ctx.blockNumber = block.number;
            ctx.swapCount = 1;
            delete _activeProviders[poolIdBytes];
        }
        ctx.lastSender = sender;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @inheritdoc IEidolonHook
    function permit2() external view override returns (address) {
        return address(PERMIT2);
    }

    /// @inheritdoc IEidolonHook

    // Removed legacy isPermitUsed

    // ═══════════════════════════════════════════════════════════════════════════
    // RECEIVE ETH
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Allows the contract to receive ETH
    receive() external payable {}
}
