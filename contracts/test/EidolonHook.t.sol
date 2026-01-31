// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";

import {EidolonHook} from "../src/EidolonHook.sol";
import {IEidolonHook} from "../src/interfaces/IEidolonHook.sol";
import {WitnessLib} from "../src/libraries/WitnessLib.sol";
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";

/// @title EidolonHookMock
/// @notice A mock version of EidolonHook that bypasses address validation for testing
/// @dev Defined before test contract so it can be used in setUp
contract EidolonHookMock is EidolonHook {
    constructor(IPoolManager _poolManager, address _permit2, address _owner, address _treasury) 
        EidolonHook(_poolManager, _permit2, _owner, _treasury) {}
    
    /// @notice Override to skip address validation
    function validateHookAddress(BaseHook) internal pure override {}
}

/// @title EidolonHookTest
/// @notice Unit tests for the EIDOLON Quantum Liquidity Hook
/// @dev Tests hook deployment, permissions, and core functionality
contract EidolonHookTest is Test {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST STATE
    // ═══════════════════════════════════════════════════════════════════════════

    IPoolManager public manager;
    EidolonHook public hook;

    /// @notice Mock Permit2 address for testing
    address public constant MOCK_PERMIT2 = address(0xBEEF);

    /// @notice Test user addresses
    address public provider = makeAddr("provider");
    address public swapper = makeAddr("swapper");

    // ═══════════════════════════════════════════════════════════════════════════
    // SETUP
    // ═══════════════════════════════════════════════════════════════════════════

    function setUp() public {
        // Deploy PoolManager
        manager = IPoolManager(address(new PoolManager(address(0))));
        
        // Deploy hook using mock that bypasses address validation
        // This allows us to test hook logic without needing a valid hook address
        // address(this) is the owner/treasury for testing
        hook = EidolonHook(payable(address(new EidolonHookMock(manager, MOCK_PERMIT2, address(this), address(this)))));
        
        // Fund test accounts
        vm.deal(provider, 100 ether);
        vm.deal(swapper, 100 ether);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test that the hook is deployed with correct state
    function test_hookDeployment() public view {
        assertEq(hook.permit2(), MOCK_PERMIT2, "Permit2 address mismatch");
        assertEq(address(hook.poolManager()), address(manager), "PoolManager address mismatch");
    }

    /// @notice Test that hook permissions are set correctly
    function test_hookPermissions() public view {
        Hooks.Permissions memory permissions = hook.getHookPermissions();
        
        // Should enable beforeSwap and afterSwap
        assertTrue(permissions.beforeSwap, "beforeSwap should be enabled");
        assertTrue(permissions.afterSwap, "afterSwap should be enabled");
        assertTrue(permissions.beforeSwapReturnDelta, "beforeSwapReturnDelta should be enabled");
        
        // Should not enable other hooks
        assertFalse(permissions.beforeInitialize, "beforeInitialize should be disabled");
        assertFalse(permissions.afterInitialize, "afterInitialize should be disabled");
        assertFalse(permissions.beforeAddLiquidity, "beforeAddLiquidity should be disabled");
        assertFalse(permissions.afterAddLiquidity, "afterAddLiquidity should be disabled");
        assertFalse(permissions.beforeRemoveLiquidity, "beforeRemoveLiquidity should be disabled");
        assertFalse(permissions.afterRemoveLiquidity, "afterRemoveLiquidity should be disabled");
        assertFalse(permissions.beforeDonate, "beforeDonate should be disabled");
        assertFalse(permissions.afterDonate, "afterDonate should be disabled");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PERMIT TRACKING TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test that permit nonces are tracked correctly
    function test_permitNonceTracking() public view {
        // Fresh nonce should be unused
        assertFalse(hook.isPermitUsed(provider, 0), "Fresh nonce should be unused");
        assertFalse(hook.isPermitUsed(provider, 1), "Fresh nonce should be unused");
        assertFalse(hook.isPermitUsed(provider, type(uint256).max), "Fresh nonce should be unused");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TIERED FEE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test default tiered fee values
    function test_tieredFeeDefaults() public view {
        assertEq(hook.singleSidedFeeBps(), 2000, "Single-sided fee should be 20%");
        assertEq(hook.dualSidedFeeBps(), 1000, "Dual-sided fee should be 10%");
        assertEq(hook.BPS_DENOMINATOR(), 10000, "BPS denominator should be 10000");
        assertEq(hook.MAX_FEE_BPS(), 5000, "Max fee should be 50%");
    }

    /// @notice Test fee modification via setFees
    function test_setFees() public {
        // Update fees
        hook.setFees(1500, 500);
        assertEq(hook.singleSidedFeeBps(), 1500, "Single fee should be updated to 15%");
        assertEq(hook.dualSidedFeeBps(), 500, "Dual fee should be updated to 5%");
    }

    /// @notice Test setFees reverts if exceeds max
    function test_setFees_revertOnExceedMax() public {
        vm.expectRevert(EidolonHook.FeeTooHigh.selector);
        hook.setFees(5001, 1000);  // 50.01% exceeds max
    }

    /// @notice Test only owner can set fees
    function test_setFees_onlyOwner() public {
        vm.prank(provider);
        vm.expectRevert(EidolonHook.NotOwner.selector);
        hook.setFees(1500, 500);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MEMBERSHIP TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test owner is set correctly on deployment
    function test_ownerIsDeployer() public view {
        assertEq(hook.owner(), address(this), "Owner should be deployer");
        assertEq(hook.treasury(), address(this), "Treasury should be deployer initially");
    }

    /// @notice Test adding membership
    function test_addMembership() public {
        assertFalse(hook.isMember(provider), "Provider should not be member initially");
        
        // Add 30 days membership
        hook.addMembership(provider, 30 days);
        
        assertTrue(hook.isMember(provider), "Provider should be member after adding");
        assertGt(hook.membershipExpiry(provider), block.timestamp, "Expiry should be in future");
    }

    /// @notice Test revoking membership
    function test_revokeMembership() public {
        // Add membership
        hook.addMembership(provider, 30 days);
        assertTrue(hook.isMember(provider), "Should be member");
        
        // Revoke it
        hook.revokeMembership(provider);
        assertFalse(hook.isMember(provider), "Should not be member after revoke");
    }

    /// @notice Test only owner can add membership
    function test_onlyOwnerCanAddMembership() public {
        vm.prank(provider);
        vm.expectRevert(EidolonHook.NotOwner.selector);
        hook.addMembership(swapper, 30 days);
    }

    /// @notice Test treasury update
    function test_setTreasury() public {
        address newTreasury = makeAddr("treasury");
        hook.setTreasury(newTreasury);
        assertEq(hook.treasury(), newTreasury, "Treasury should be updated");
    }

    /// @notice Test ownership transfer
    function test_transferOwnership() public {
        address newOwner = makeAddr("newOwner");
        hook.transferOwnership(newOwner);
        assertEq(hook.owner(), newOwner, "Owner should be transferred");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WITNESS LIB TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test witness hash computation is deterministic
    function test_witnessHashDeterministic() public pure {
        WitnessLib.WitnessData memory witness1 = WitnessLib.WitnessData({
            poolId: bytes32(uint256(1)),
            hook: address(0x1234)
        });
        
        WitnessLib.WitnessData memory witness2 = WitnessLib.WitnessData({
            poolId: bytes32(uint256(1)),
            hook: address(0x1234)
        });
        
        bytes32 hash1 = WitnessLib.hash(witness1);
        bytes32 hash2 = WitnessLib.hash(witness2);
        
        assertEq(hash1, hash2, "Same witness data should produce same hash");
    }

    /// @notice Test witness hash changes with different data
    function test_witnessHashDifferent() public pure {
        WitnessLib.WitnessData memory witness1 = WitnessLib.WitnessData({
            poolId: bytes32(uint256(1)),
            hook: address(0x1234)
        });
        
        WitnessLib.WitnessData memory witness2 = WitnessLib.WitnessData({
            poolId: bytes32(uint256(2)),  // Different pool ID
            hook: address(0x1234)
        });
        
        bytes32 hash1 = WitnessLib.hash(witness1);
        bytes32 hash2 = WitnessLib.hash(witness2);
        
        assertTrue(hash1 != hash2, "Different witness data should produce different hash");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ETH RECEIVE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test that the hook can receive ETH
    function test_receiveEth() public {
        uint256 amount = 1 ether;
        
        // Send ETH to hook
        (bool success,) = address(hook).call{value: amount}("");
        
        assertTrue(success, "Hook should accept ETH");
        assertEq(address(hook).balance, amount, "Hook balance should match sent amount");
    }
}
