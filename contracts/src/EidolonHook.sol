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
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// PERMIT2 IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import {ISignatureTransfer} from "permit2/src/interfaces/ISignatureTransfer.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import {IEidolonHook} from "./interfaces/IEidolonHook.sol";
import {WitnessLib} from "./libraries/WitnessLib.sol";

/// @title EidolonHook
/// @author EIDOLON Protocol
/// @notice The core "Quantum Liquidity" Hook for Uniswap v4
/// @dev Implements JIT (Just-In-Time) liquidity using Permit2 Witness signatures
///      Users keep funds in their wallets; the Hook "materializes" liquidity only
///      for the exact duration of a swap, returning funds + fees atomically.
contract EidolonHook is BaseHook, IEidolonHook {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using WitnessLib for WitnessLib.WitnessData;

    // ═══════════════════════════════════════════════════════════════════════════
    // IMMUTABLE STATE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice The canonical Permit2 contract
    /// @dev Set at construction, never changes
    ISignatureTransfer public immutable PERMIT2;

    /// @notice Protocol fee in basis points (1 = 0.01%)
    /// @dev 15% of swap fees = 1500 basis points
    uint16 public constant PROTOCOL_FEE_BPS = 1500;

    /// @notice Basis points denominator
    uint16 public constant BPS_DENOMINATOR = 10000;

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Tracks used permit nonces to prevent replay attacks
    /// @dev provider => nonce => used
    mapping(address => mapping(uint256 => bool)) private _usedNonces;

    /// @notice Tracks active materializations for atomic settlement
    /// @dev poolId => provider => MaterializationState
    struct MaterializationState {
        uint256 amount;
        uint256 initialBalance;
        Currency currency;
        bool active;
    }
    mapping(bytes32 => mapping(address => MaterializationState)) private _materializations;

    /// @notice Protocol fee accumulator
    /// @dev currency => accumulated fees
    mapping(Currency => uint256) public protocolFees;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Deploys the EIDOLON Hook
    /// @param _poolManager The Uniswap v4 PoolManager address
    /// @param _permit2 The canonical Permit2 contract address
    constructor(
        IPoolManager _poolManager,
        address _permit2
    ) BaseHook(_poolManager) {
        PERMIT2 = ISignatureTransfer(_permit2);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOOK PERMISSIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Returns the hook permissions bitmap
    /// @dev Enables beforeSwap and afterSwap hooks
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,              // ✓ Materialize liquidity
            afterSwap: true,               // ✓ Settle and return funds
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,   // ✓ Modify swap amounts
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOOK CALLBACKS (Override internal virtual functions from BaseHook)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Internal hook called before a swap executes
    /// @dev Validates Ghost Permit and materializes JIT liquidity
    /// @param sender The address initiating the swap
    /// @param key The pool being swapped on
    /// @param params The swap parameters
    /// @param hookData Encoded Ghost Permit and signature data
    /// @return selector The function selector
    /// @return beforeSwapDelta The delta to apply before the swap
    /// @return lpFeeOverride Fee override (0 = use pool default)
    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        // If no hookData provided, this is a normal swap - don't interfere
        if (hookData.length == 0) {
            return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        // Decode the Ghost Permit data
        (
            GhostPermit memory permit,
            bytes memory signature,
            WitnessLib.WitnessData memory witness
        ) = abi.decode(hookData, (GhostPermit, bytes, WitnessLib.WitnessData));

        // ═══════════════════════════════════════════════════════════════════════
        // VALIDATION: Checks (CEI Pattern)
        // ═══════════════════════════════════════════════════════════════════════

        PoolId poolId = key.toId();

        // 1. Check permit hasn't expired
        if (block.timestamp > permit.deadline) {
            revert PermitExpired(permit.deadline, block.timestamp);
        }

        // 2. Check permit hasn't been used (replay protection)
        if (_usedNonces[permit.provider][permit.nonce]) {
            revert InvalidSignature();
        }

        // 3. Validate witness matches current pool context
        if (witness.poolId != PoolId.unwrap(poolId)) {
            revert WitnessMismatch(PoolId.wrap(witness.poolId), poolId);
        }

        // 4. Validate witness hook address
        if (witness.hook != address(this)) {
            revert InvalidSignature();
        }

        // ═══════════════════════════════════════════════════════════════════════
        // EFFECTS: Update state before external calls
        // ═══════════════════════════════════════════════════════════════════════

        // Mark nonce as used
        _usedNonces[permit.provider][permit.nonce] = true;

        // Record materialization state for afterSwap settlement
        uint256 initialBalance = permit.currency.balanceOfSelf();
        _materializations[PoolId.unwrap(poolId)][permit.provider] = MaterializationState({
            amount: permit.amount,
            initialBalance: initialBalance,
            currency: permit.currency,
            active: true
        });

        // ═══════════════════════════════════════════════════════════════════════
        // INTERACTIONS: External calls (Permit2)
        // ═══════════════════════════════════════════════════════════════════════

        // Pull funds from user via Permit2 with Witness verification
        _pullFundsWithWitness(permit, signature, witness);

        // Emit materialization event
        emit LiquidityMaterialized(permit.provider, poolId, permit.amount, 0);

        return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /// @notice Internal hook called after a swap executes
    /// @dev Settles the swap, takes protocol fee, and returns funds to provider
    /// @param sender The address that initiated the swap
    /// @param key The pool that was swapped on
    /// @param params The swap parameters
    /// @param delta The balance changes from the swap
    /// @param hookData The same hookData from beforeSwap
    /// @return selector The function selector
    /// @return afterSwapDelta The delta to apply after the swap
    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        // If no hookData, nothing to settle
        if (hookData.length == 0) {
            return (this.afterSwap.selector, 0);
        }

        // Decode to get provider address
        (GhostPermit memory permit,,) = abi.decode(
            hookData, 
            (GhostPermit, bytes, WitnessLib.WitnessData)
        );

        PoolId poolId = key.toId();
        MaterializationState storage state = _materializations[PoolId.unwrap(poolId)][permit.provider];

        // Skip if no active materialization
        if (!state.active) {
            return (this.afterSwap.selector, 0);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // SETTLEMENT: Calculate fees and return funds
        // ═══════════════════════════════════════════════════════════════════════

        uint256 currentBalance = state.currency.balanceOfSelf();
        
        // ATOMIC GUARD: Ensure no loss occurred
        if (currentBalance < state.initialBalance) {
            revert AtomicGuardViolation(state.initialBalance, currentBalance);
        }

        uint256 profit = currentBalance - state.initialBalance;
        
        // Calculate protocol fee (15% of profit)
        uint256 protocolFee = (profit * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 providerProfit = profit - protocolFee;

        // Accumulate protocol fees
        if (protocolFee > 0) {
            protocolFees[state.currency] += protocolFee;
        }

        // Clear materialization state
        state.active = false;

        // Return funds + profit to provider
        if (currentBalance - protocolFee > 0) {
            _returnFunds(permit.provider, state.currency, currentBalance - protocolFee);
        }

        // Update event with actual fees earned
        emit LiquidityMaterialized(permit.provider, poolId, state.amount, providerProfit);

        return (this.afterSwap.selector, 0);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Pulls funds from provider using Permit2 with Witness verification
    /// @dev This is the core security mechanism - signature is only valid for this pool
    /// @param permit The Ghost Permit containing authorization details
    /// @param signature The EIP-712 signature from the provider
    /// @param witness The witness data binding signature to pool context
    function _pullFundsWithWitness(
        GhostPermit memory permit,
        bytes memory signature,
        WitnessLib.WitnessData memory witness
    ) internal {
        // Construct the Permit2 transfer details
        ISignatureTransfer.PermitTransferFrom memory permitTransfer = ISignatureTransfer.PermitTransferFrom({
            permitted: ISignatureTransfer.TokenPermissions({
                token: Currency.unwrap(permit.currency),
                amount: permit.amount
            }),
            nonce: permit.nonce,
            deadline: permit.deadline
        });

        ISignatureTransfer.SignatureTransferDetails memory transferDetails = ISignatureTransfer.SignatureTransferDetails({
            to: address(this),
            requestedAmount: permit.amount
        });

        // Execute the transfer with witness verification
        // The signature is only valid if the witness data matches
        PERMIT2.permitWitnessTransferFrom(
            permitTransfer,
            transferDetails,
            permit.provider,
            WitnessLib.hash(witness),
            WitnessLib.WITNESS_TYPE_STRING,
            signature
        );
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
            (bool success,) = provider.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Return ERC20
            currency.transfer(provider, amount);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @inheritdoc IEidolonHook
    function permit2() external view override returns (address) {
        return address(PERMIT2);
    }

    /// @inheritdoc IEidolonHook
    function isPermitUsed(address provider, uint256 nonce) external view override returns (bool) {
        return _usedNonces[provider][nonce];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RECEIVE ETH
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Allows the contract to receive ETH
    receive() external payable {}
}
