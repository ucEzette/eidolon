// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

/// @title IEidolonHook
/// @author EIDOLON Protocol
/// @notice Interface for the EIDOLON "Quantum Liquidity" Hook
/// @dev Defines the external API for Ghost Permit verification and JIT liquidity
interface IEidolonHook {
    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS (Gas-efficient revert messages)
    // ═══════════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS (Gas-efficient revert messages)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Thrown when the session has expired or is invalid
    /// @param provider The provider address
    error SessionNotActive(address provider);

    /// @notice Thrown when the Atomic Guard detects potential loss
    /// @param initialBalance The user's balance before the swap
    /// @param finalBalance The user's balance after the swap
    error AtomicGuardViolation(uint256 initialBalance, uint256 finalBalance);

    /// @notice Thrown when insufficient liquidity is provided
    error InsufficientLiquidity();

    /// @notice Thrown when the caller is not the PoolManager
    error OnlyPoolManager();

    /// @notice Thrown when MEV attack is detected (Exorcism feature)
    error MEVDetected();

    /// @notice Thrown when pool is not initialized (Anchor check)
    error PoolNotInitialized();

    /// @notice Thrown when initialization TVL is too low
    error InsufficientAnchorLiquidity();

    /// @notice Thrown when a nonce has already been used
    error InvalidNonce(uint256 nonce);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS (For indexing and UI updates)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when a Session is activated
    /// @param provider The user address
    /// @param expiry The session expiry timestamp
    event SessionActivated(address indexed provider, uint256 expiry);

    /// @notice Emitted when liquidity is successfully "materialized" from a Ghost Session
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

    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Data passed to beforeSwap to instruct "Ghost" execution
    struct GhostInstruction {
        /// @notice The address providing liquidity (must have active session)
        address provider;
        /// @notice The currency being provided (token address, or address(0) for ETH)
        /// @notice The currency being provided (token address, or address(0) for ETH)
        Currency currency;
        /// @notice Amount to pull from provider
        uint256 amount;
        /// @notice Unique nonce to prevent replay attacks
        uint256 nonce;
        /// @notice True if provider is providing dual-sided liquidity (Pro LP)
        bool isDualSided;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Need IAllowanceTransfer structs for external function signature
    // Since we can't easily import them here without cluttering, we can use raw bytes or defined structs if we import Permit2.
    // However, it's better to keep the interface clean or import IAllowanceTransfer.
    // For now, we'll assume the implementation imports it, and here we define the function blindly or use `bytes`.
    // Actually, we can import IAllowanceTransfer in the interface file if needed, or just define the function in the contract.
    // Interfaces should be explicit. Let's import IAllowanceTransfer.

    /// @notice Returns the Permit2 contract address
    /// @return The canonical Permit2 address
    function permit2() external view returns (address);

    /// @notice Checks if a user has an active session
    /// @param provider The user address
    /// @return True if session is active
    function isSessionActive(address provider) external view returns (bool);

    /// @notice Activates a "Ghost Session" for a provider
    /// @param permit The Permit2 PermitSingle struct
    /// @param signature The provider's signature
    function activateSession(
        IAllowanceTransfer.PermitSingle calldata permit,
        bytes calldata signature
    ) external;
}
