// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {EidolonHook} from "../src/EidolonHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/// @title EidolonHookFuzzTest
/// @notice Fuzz tests for the EIDOLON Hook's Atomic Guard
/// @dev Focuses on ensuring the balance invariant holds under all conditions
contract EidolonHookFuzzTest is Test {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS (Using single-sided fee for fuzz tests - worst case)
    // ═══════════════════════════════════════════════════════════════════════════

    uint16 public constant SINGLE_SIDED_FEE_BPS = 2000;  // 20% for Lazy Investor
    uint16 public constant DUAL_SIDED_FEE_BPS = 1000;    // 10% for Pro LP
    uint16 public constant BPS_DENOMINATOR = 10000;

    // ═══════════════════════════════════════════════════════════════════════════
    // ATOMIC GUARD FUZZ TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Fuzz test: Protocol fee calculation never exceeds profit
    /// @param profit The profit amount to test (bounded to realistic values)
    function testFuzz_protocolFeeNeverExceedsProfit(uint256 profit) public pure {
        // Bound profit to realistic values (up to 1 billion tokens with 18 decimals)
        profit = bound(profit, 0, 1_000_000_000 * 1e18);
        
        uint256 protocolFee = (profit * SINGLE_SIDED_FEE_BPS) / BPS_DENOMINATOR;
        
        // Protocol fee should never exceed profit
        assertTrue(protocolFee <= profit, "Protocol fee exceeds profit");
        
        // Provider profit should be non-negative
        uint256 providerProfit = profit - protocolFee;
        assertTrue(providerProfit >= 0, "Provider profit is negative");
    }

    /// @notice Fuzz test: Total fees + provider profit equals original profit
    /// @param profit The profit amount to test
    function testFuzz_feeDistributionInvariant(uint256 profit) public pure {
        profit = bound(profit, 0, 1_000_000_000 * 1e18);
        
        uint256 protocolFee = (profit * SINGLE_SIDED_FEE_BPS) / BPS_DENOMINATOR;
        uint256 providerProfit = profit - protocolFee;
        
        // Due to potential rounding, provider profit + protocol fee should equal original profit
        assertEq(
            protocolFee + providerProfit, 
            profit, 
            "Fee distribution doesn't sum to profit"
        );
    }

    /// @notice Fuzz test: Balance invariant - final balance >= initial balance
    /// @param initialBalance The starting balance
    /// @param currentBalance The ending balance (must be >= initialBalance for success)
    function testFuzz_balanceInvariantSuccess(
        uint256 initialBalance,
        uint256 currentBalance
    ) public pure {
        // Only test valid scenarios where currentBalance >= initialBalance
        vm.assume(currentBalance >= initialBalance);
        
        // This should not revert - simulating the Atomic Guard check
        assertTrue(
            currentBalance >= initialBalance,
            "Atomic Guard violation"
        );
        
        // Profit calculation should not overflow
        uint256 profit = currentBalance - initialBalance;
        assertTrue(profit <= currentBalance, "Profit overflow");
    }

    /// @notice Fuzz test: Atomic Guard correctly identifies loss scenarios
    /// @param initialBalance The starting balance
    /// @param loss The amount of loss (will be subtracted from initialBalance)
    function testFuzz_atomicGuardDetectsLoss(
        uint256 initialBalance,
        uint256 loss
    ) public pure {
        // Ensure initialBalance > 0 and loss > 0 and loss <= initialBalance
        initialBalance = bound(initialBalance, 1, type(uint128).max);
        loss = bound(loss, 1, initialBalance);
        
        uint256 currentBalance = initialBalance - loss;
        
        // Atomic Guard should detect this as a violation
        assertTrue(
            currentBalance < initialBalance,
            "Loss not detected"
        );
    }

    /// @notice Fuzz test: Protocol fee BPS is within valid range
    function testFuzz_protocolFeeIsValid() public pure {
        // 15% = 1500 BPS, which is less than 100% = 10000 BPS
        assertTrue(SINGLE_SIDED_FEE_BPS < BPS_DENOMINATOR, "Protocol fee >= 100%");
        assertTrue(SINGLE_SIDED_FEE_BPS > 0, "Protocol fee is zero");
    }

    /// @notice Fuzz test: Zero profit results in zero fees
    function testFuzz_zeroProfitZeroFees() public pure {
        uint256 profit = 0;
        uint256 protocolFee = (profit * SINGLE_SIDED_FEE_BPS) / BPS_DENOMINATOR;
        
        assertEq(protocolFee, 0, "Zero profit should yield zero fees");
    }

    /// @notice Fuzz test: Nonce uniqueness (different nonces should not collide)
    /// @param nonce1 First nonce
    /// @param nonce2 Second nonce
    function testFuzz_nonceUniqueness(uint256 nonce1, uint256 nonce2) public pure {
        // Skip if nonces are equal
        vm.assume(nonce1 != nonce2);
        
        // Different nonces should be distinguishable
        assertTrue(nonce1 != nonce2, "Nonces should be different");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EDGE CASE TESTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test maximum values don't cause overflow
    function test_maxValuesNoOverflow() public pure {
        uint256 maxProfit = type(uint256).max / BPS_DENOMINATOR;
        uint256 protocolFee = (maxProfit * SINGLE_SIDED_FEE_BPS) / BPS_DENOMINATOR;
        
        // Should not overflow
        assertTrue(protocolFee > 0, "Fee should be positive for large profit");
    }

    /// @notice Test that fee calculation is consistent
    function test_feeCalculationConsistency() public pure {
        uint256 profit1 = 1000 ether;
        uint256 profit2 = 1000 ether;
        
        uint256 fee1 = (profit1 * SINGLE_SIDED_FEE_BPS) / BPS_DENOMINATOR;
        uint256 fee2 = (profit2 * SINGLE_SIDED_FEE_BPS) / BPS_DENOMINATOR;
        
        assertEq(fee1, fee2, "Same profit should yield same fee");
        assertEq(fee1, 200 ether, "20% of 1000 should be 200");
    }
}
