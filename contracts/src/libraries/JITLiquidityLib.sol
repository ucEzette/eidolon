// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SqrtPriceMath} from "@uniswap/v4-core/src/libraries/SqrtPriceMath.sol";
import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";
import {FixedPoint96} from "@uniswap/v4-core/src/libraries/FixedPoint96.sol";

/// @title JITLiquidityLib
/// @notice Helper library to calculate JIT liquidity ranges and amounts
library JITLiquidityLib {
    using SafeCast for uint256;

    /// @notice Calculates the optimal JIT range and liquidity amount
    /// @param key The pool key
    /// @param tickCurrent The current pool tick
    /// @param amount The amount of token to provide
    /// @param isZeroForOne Whether the swap is zeroForOne (X -> Y)
    /// @param currency The currency being provided by the user
    /// @return tickLower The lower tick of the JIT position
    /// @return tickUpper The upper tick of the JIT position
    /// @return liquidity The amount of liquidity to mint
    function calculateJITPosition(
        PoolKey memory key,
        int24 tickCurrent,
        uint256 amount,
        bool isZeroForOne,
        Currency currency
    )
        internal
        pure
        returns (int24 tickLower, int24 tickUpper, uint128 liquidity)
    {
        // JIT STRATEGY:
        // Place liquidity "In Front" of the trade.
        // If Swap is ZeroForOne (Price Down? No.)
        // ZeroForOne: Swapper sells Zero, Buys One.
        // Pool gets Zero, Gives One.
        // Reserves of Zero UP. Reserves of One DOWN.
        // Price (Y/X) goes DOWN. (Since X increases).
        // So Tick goes DOWN.

        // If Tick goes DOWN:
        // We need to provide liquidity in the ticks BELOW current.
        // Liquidity below current tick is composed of Token 1 (Y).
        // So the Provider must have Token 1 (Y).

        // Check input currency matches Strategy:
        // ZeroForOne -> Price Down -> Need Token 1 (Y) -> Provider gave currency1?
        // if user provided currency0, we can't JIT effectively below?
        // Actually, if we provide currency0 below tick, it's inactive (Token 1 only).
        // So User MUST provide Token 1 if ZeroForOne.

        // Validation:
        // if isZeroForOne (Price Down), we assume user provides key.currency1.
        // if !isZeroForOne (Price Up), we assume user provides key.currency0.

        int24 spacing = key.tickSpacing;

        if (isZeroForOne) {
            // Price Moving DOWN.
            // Target Range: [tickCurrent - spacing, tickCurrent] (snapped to spacing)
            // Ideally strictly below current price to be "filled" as price moves through.

            // Snap current tick to spacing
            int24 tickFloor = floor(tickCurrent, spacing);

            // Validation: Only provide Token1 (Y) if Price is moving DOWN (ZeroForOne)
            if (Currency.unwrap(currency) != Currency.unwrap(key.currency1))
                return (0, 0, 0);

            // If we are exactly on boundary, or inside?
            // If inside, we want the range [tickFloor, tickFloor + spacing]?
            // No, if price moves down, it moves from tickCurrent towards tickFloor.
            // It consumes liquidity in the current bin first.
            // So we mint in [tickFloor, tickFloor + spacing].
            // This bin contains BOTH tokens if tickCurrent is strictly inside.
            // But we only want to provide ONE token.
            // Can we?
            // If we provide single sided, we must be "out of range".
            // Since Price is moving DOWN, "out of range" meant "ticks below" are Token1 only.
            // So we mint [tickFloor - spacing, tickFloor].
            // This is strictly below.
            // BUT, the swap might not reach it if it's small!
            // If the swap is small, it stays in current tick.
            // So we MUST mint in current tick.
            // If we mint in current tick, and we only have Token1, but pool needs both...
            // Then we can't mint?
            // Unless Uni V4 allows minting with only one token for current tick? No, it calculates required amounts.

            // APPROACH:
            // We mint in [tickFloor - spacing, tickFloor] (Next Tick).
            // We hope the swap crosses the boundary.
            // If it doesn't, we did not facilitate the swap :(
            // This is the risk of "Single Sided JIT".

            // BUT, if the user authorizes us to be "Lazy Investor", maybe they accept "Fill or Kill"?
            // Or maybe we just provide what we can.

            tickUpper = tickFloor;
            tickLower = tickFloor - spacing;

            // Calculate Liquidity
            uint160 sqrtRatioAX96 = TickMath.getSqrtPriceAtTick(tickLower);
            uint160 sqrtRatioBX96 = TickMath.getSqrtPriceAtTick(tickUpper);

            // L = amount1 / (sqrt(upper) - sqrt(lower))
            // Precision: amount * 2^96 / (sqrtB - sqrtA)
            // Use FullMath for safety
            liquidity = uint128(
                FullMath.mulDiv(
                    amount,
                    FixedPoint96.Q96,
                    sqrtRatioBX96 - sqrtRatioAX96
                )
            );
        } else {
            // Price Moving UP. (OneForZero)
            // Swapper sells One, Buys Zero.
            // Provider must have Zero (Token 0).
            // Target Range: Ticks ABOVE.
            // Liquidity above is composed of Token 0.

            int24 tickFloor = floor(tickCurrent, spacing);
            // Current Tick Bin is [tickFloor, tickFloor + spacing].
            // Next bin is [tickFloor + spacing, tickFloor + 2*spacing].

            // Validation: Only provide Token0 (X) if Price is moving UP (OneForZero)
            if (Currency.unwrap(currency) != Currency.unwrap(key.currency0))
                return (0, 0, 0);

            tickLower = tickFloor + spacing; // The NEXT bin boundary
            tickUpper = tickLower + spacing;

            uint160 sqrtRatioAX96 = TickMath.getSqrtPriceAtTick(tickLower);
            uint160 sqrtRatioBX96 = TickMath.getSqrtPriceAtTick(tickUpper);

            // L = amount0 * sqrt(upper) * sqrt(lower) / (sqrt(upper) - sqrt(lower))
            // Use FullMath to handle 512-bit intermediate overflow
            uint256 intermediate = FullMath.mulDiv(
                sqrtRatioAX96,
                sqrtRatioBX96,
                FixedPoint96.Q96
            );

            liquidity = uint128(
                FullMath.mulDiv(
                    amount,
                    intermediate,
                    sqrtRatioBX96 - sqrtRatioAX96
                )
            );
        }

        // SAFETY: Subtract 1 wei of liquidity to account for rounding up in PoolManager
        // This prevents the case where required amount > instr.amount by 1 wei.
        if (liquidity > 0) liquidity -= 1;
    }

    /// @notice Rounds tick down to nearest spacing
    function floor(
        int24 tick,
        int24 tickSpacing
    ) internal pure returns (int24) {
        int24 compressed = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) compressed--;
        return compressed * tickSpacing;
    }
}
