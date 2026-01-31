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
        SINGLE_SIDED,   // Lazy Investor - 20% fee
        DUAL_SIDED      // Pro LP - 10% fee
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

    /// @notice Tracks used permit nonces to prevent replay attacks
    /// @dev provider => nonce => used
    mapping(address => mapping(uint256 => bool)) private _usedNonces;

    /// @notice Tracks active materializations for atomic settlement
    /// @dev poolId => provider => MaterializationState
    struct MaterializationState {
        uint256 amount;
        uint256 initialBalance;
        Currency currency;
        ProviderType providerType;
        bool active;
    }
    mapping(bytes32 => mapping(address => MaterializationState)) private _materializations;

    /// @notice Protocol fee accumulator
    /// @dev currency => accumulated fees
    mapping(Currency => uint256) public protocolFees;

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
    event FeesWithdrawn(Currency indexed currency, address indexed to, uint256 amount);
    
    /// @notice Emitted when treasury address is updated
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    
    /// @notice Emitted when ownership is transferred
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    
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
    constructor(
        IPoolManager _poolManager,
        address _permit2
    ) BaseHook(_poolManager) {
        PERMIT2 = ISignatureTransfer(_permit2);
        owner = msg.sender;
        treasury = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Add or extend membership for a provider (fee exemption)
    /// @param provider The provider address
    /// @param duration Duration in seconds to add to membership
    function addMembership(address provider, uint256 duration) external onlyOwner {
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
    function withdrawFees(Currency currency, uint256 amount) external onlyOwner {
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
    function setFees(uint16 newSingleSidedFeeBps, uint16 newDualSidedFeeBps) external onlyOwner {
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
    /// @dev Validates Ghost Permit(s) and materializes JIT liquidity
    ///      Supports MULTI-PROVIDER aggregation: hookData can contain multiple permits
    /// @param sender The address initiating the swap
    /// @param key The pool being swapped on
    /// @param params The swap parameters
    /// @param hookData Encoded array of (GhostPermit, signature, witness) tuples
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

        PoolId poolId = key.toId();
        bytes32 poolIdBytes = PoolId.unwrap(poolId);

        // ═══════════════════════════════════════════════════════════════════════
        // THE EXORCISM: Anti-MEV Defense
        // ═══════════════════════════════════════════════════════════════════════
        
        SwapContext storage ctx = _swapContexts[poolIdBytes];
        bool isSameBlock = ctx.blockNumber == block.number;
        
        if (isSameBlock) {
            ctx.swapCount++;
            if (ctx.swapCount >= 3 && ctx.lastSender != sender) {
                emit ExorcismTriggered(poolId, sender);
                revert MEVDetected();
            }
        } else {
            ctx.blockNumber = block.number;
            ctx.swapCount = 1;
            // Clear active providers from previous block
            delete _activeProviders[poolIdBytes];
        }
        ctx.lastSender = sender;

        // ═══════════════════════════════════════════════════════════════════════
        // MULTI-PROVIDER AGGREGATION: Decode and process all permits
        // ═══════════════════════════════════════════════════════════════════════
        
        // Decode array of permit bundles
        (
            GhostPermit[] memory permits,
            bytes[] memory signatures,
            WitnessLib.WitnessData[] memory witnesses
        ) = abi.decode(hookData, (GhostPermit[], bytes[], WitnessLib.WitnessData[]));

        // Process each provider's permit
        for (uint256 i = 0; i < permits.length; i++) {
            GhostPermit memory permit = permits[i];
            bytes memory signature = signatures[i];
            WitnessLib.WitnessData memory witness = witnesses[i];

            // ═══════════════════════════════════════════════════════════════════
            // VALIDATION: The Shield - per provider
            // ═══════════════════════════════════════════════════════════════════

            // 1. Check permit hasn't expired
            if (block.timestamp > permit.deadline) {
                continue; // Skip expired permits, don't fail entire swap
            }

            // 2. Check permit hasn't been used (replay protection)
            if (_usedNonces[permit.provider][permit.nonce]) {
                continue; // Skip used permits
            }

            // 3. Validate witness matches current pool context
            if (witness.poolId != poolIdBytes) {
                continue; // Skip mismatched pool permits
            }

            // 4. Validate witness hook address
            if (witness.hook != address(this)) {
                continue; // Skip invalid hook permits
            }

            // ═══════════════════════════════════════════════════════════════════
            // EFFECTS: Update state before external calls
            // ═══════════════════════════════════════════════════════════════════

            // Mark nonce as used
            _usedNonces[permit.provider][permit.nonce] = true;

            // Record materialization state for afterSwap settlement
            uint256 initialBalance = permit.currency.balanceOfSelf();
            _materializations[poolIdBytes][permit.provider] = MaterializationState({
                amount: permit.amount,
                initialBalance: initialBalance,
                currency: permit.currency,
                providerType: permit.isDualSided ? ProviderType.DUAL_SIDED : ProviderType.SINGLE_SIDED,
                active: true
            });

            // Track this provider for afterSwap processing
            _activeProviders[poolIdBytes].push(permit.provider);
            
            // Credit bot kill if this is a protective materialization
            if (isSameBlock && ctx.swapCount >= 2) {
                botKillCount[permit.provider]++;
            }

            // ═══════════════════════════════════════════════════════════════════
            // INTERACTIONS: External calls (Permit2)
            // ═══════════════════════════════════════════════════════════════════

            // Pull funds from provider via Permit2 with Witness verification
            _pullFundsWithWitness(permit, signature, witness);

            // Emit materialization event
            emit LiquidityMaterialized(permit.provider, poolId, permit.amount, 0);
        }

        return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /// @notice Internal hook called after a swap executes
    /// @dev Settles all active providers, takes protocol fee, and returns funds
    ///      Supports MULTI-PROVIDER: processes all providers tracked in beforeSwap
    /// @param sender The address that initiated the swap
    /// @param key The pool that was swapped on
    /// @param params The swap parameters
    /// @param delta The balance changes from the swap
    /// @param hookData The same hookData from beforeSwap (unused - we use _activeProviders)
    /// @return selector The function selector
    /// @return afterSwapDelta The delta to apply after the swap
    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
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
            MaterializationState storage state = _materializations[poolIdBytes][provider];

            // Skip if no active materialization (shouldn't happen, but safety check)
            if (!state.active) {
                continue;
            }

            uint256 currentBalance = state.currency.balanceOfSelf();
            
            // ATOMIC GUARD: Ensure no loss occurred for this provider
            if (currentBalance < state.initialBalance) {
                revert AtomicGuardViolation(state.initialBalance, currentBalance);
            }

            uint256 profit = currentBalance - state.initialBalance;
            
            // Calculate protocol fee based on provider type and membership
            uint16 feeBps = _getProviderFee(provider, state.providerType);
            uint256 protocolFee = (profit * feeBps) / BPS_DENOMINATOR;
            uint256 providerProfit = profit - protocolFee;

            // Accumulate protocol fees
            if (protocolFee > 0) {
                protocolFees[state.currency] += protocolFee;
            }

            // Clear materialization state
            state.active = false;

            // Return funds + profit to provider
            uint256 returnAmount = currentBalance - protocolFee;
            if (returnAmount > 0) {
                _returnFunds(provider, state.currency, returnAmount);
            }

            // Emit settlement event with actual fees earned
            emit LiquidityMaterialized(provider, poolId, state.amount, providerProfit);
        }

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

    /// @notice Gets the protocol fee for a provider based on type and membership
    /// @param provider The provider address
    /// @param providerType The type of liquidity provision
    /// @return The fee in basis points
    function _getProviderFee(address provider, ProviderType providerType) internal view returns (uint16) {
        // Subscribers pay no fees
        if (isMember(provider)) {
            return 0;
        }
        
        // Tiered fees based on provider type
        if (providerType == ProviderType.DUAL_SIDED) {
            return dualSidedFeeBps;  // Pro LP
        }
        
        return singleSidedFeeBps;  // Lazy Investor
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
