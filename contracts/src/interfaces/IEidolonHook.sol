// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

/// @title IEidolonHook
/// @author EIDOLON Protocol
/// @notice Interface for the EIDOLON "Quantum Liquidity" Hook
/// @dev Defines the external API for Ghost Permit verification and JIT liquidity
interface IEidolonHook {
    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS (Gas-efficient revert messages)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Thrown when the Witness data doesn't match the current pool context
    /// @param expected The expected pool ID from the signature
    /// @param actual The actual pool ID being executed
    error WitnessMismatch(PoolId expected, PoolId actual);

    /// @notice Thrown when the Ghost Permit has expired
    /// @param deadline The permit deadline timestamp
    /// @param currentTime The current block timestamp
    error PermitExpired(uint256 deadline, uint256 currentTime);

    /// @notice Thrown when the Atomic Guard detects potential loss
    /// @param initialBalance The user's balance before the swap
    /// @param finalBalance The user's balance after the swap
    error AtomicGuardViolation(uint256 initialBalance, uint256 finalBalance);

    /// @notice Thrown when the permit signature is invalid
    error InvalidSignature();

    /// @notice Thrown when insufficient liquidity is provided
    error InsufficientLiquidity();

    /// @notice Thrown when the caller is not the PoolManager
    error OnlyPoolManager();

    /// @notice Thrown when MEV attack is detected (Exorcism feature)
    error MEVDetected();

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS (For indexing and UI updates)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when liquidity is successfully "materialized" from a Ghost Permit
    /// @param provider The address providing the ghost liquidity
    /// @param poolId The pool where liquidity was provided
    /// @param amount The amount of liquidity materialized
    /// @param feesEarned The fees earned by the provider
    event LiquidityMaterialized(
        address indexed provider,
        PoolId indexed poolId,
        uint256 amount,
        uint256 feesEarned
    );

    /// @notice Emitted when liquidity is successfully returned to the provider
    /// @param provider The provider receiving their funds
    /// @param poolId The pool being settled
    /// @param amount The original materialized amount
    /// @param profit The profit distributed to the provider
    event LiquiditySettled(
        address indexed provider,
        PoolId indexed poolId,
        uint256 amount,
        uint256 profit
    );

    /// @notice Emitted when an MEV attack is blocked (Exorcism)
    /// @param poolId The targeted pool
    /// @param attacker The detected attacker address
    event ExorcismTriggered(PoolId indexed poolId, address indexed attacker);

    /// @notice Emitted when a Ghost Permit is registered
    /// @param provider The permit signer
    /// @param poolId The target pool
    /// @param amount The maximum amount authorized
    /// @param deadline The permit expiration
    event GhostPermitRegistered(
        address indexed provider,
        PoolId indexed poolId,
        uint256 amount,
        uint256 deadline
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Represents a Ghost Permit - an off-chain authorization for JIT liquidity
    /// @dev This struct is signed off-chain and verified on-chain via Permit2 Witness
    struct GhostPermit {
        /// @notice The address providing liquidity
        address provider;
        /// @notice The currency being provided (token address, or address(0) for ETH)
        Currency currency;
        /// @notice Maximum amount authorized for this permit
        uint256 amount;
        /// @notice The specific pool this permit is valid for
        PoolId poolId;
        /// @notice Unix timestamp after which the permit is invalid
        uint256 deadline;
        /// @notice Unique nonce to prevent replay attacks
        uint256 nonce;
        /// @notice True if provider is providing dual-sided liquidity (Pro LP)
        bool isDualSided;
    }

    /// @notice Witness data for Permit2 verification
    /// @dev This binds the signature to a specific pool execution context
    struct WitnessData {
        /// @notice The pool ID this signature is valid for
        PoolId poolId;
        /// @notice The Hook address (for additional validation)
        address hook;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Returns the Permit2 contract address
    /// @return The canonical Permit2 address
    function permit2() external view returns (address);

    /// @notice Checks if a Ghost Permit has been used
    /// @param provider The permit provider address
    /// @param nonce The permit nonce
    /// @return True if the permit has been consumed
    function isPermitUsed(address provider, uint256 nonce) external view returns (bool);
}
