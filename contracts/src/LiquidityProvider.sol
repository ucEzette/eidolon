// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";

/// @title LiquidityProvider
/// @notice Helper contract to add liquidity to Uniswap V4 pools via IUnlockCallback
contract LiquidityProvider is IUnlockCallback {
    using CurrencyLibrary for Currency;
    using SafeTransferLib for ERC20;
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    IPoolManager public immutable poolManager;
    address public owner;

    // Track user liquidity per pool
    mapping(address => mapping(bytes32 => uint128)) public userLiquidity;

    struct CallbackData {
        PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0;
        uint256 amount1;
        address provider;
        uint128 liquidityToRemove; // For removal
        bool isAdd;
    }

    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        uint128 liquidity,
        int256 delta0,
        int256 delta1
    );

    event LiquidityRemoved(
        bytes32 indexed poolId,
        address indexed provider,
        uint128 liquidity,
        int256 delta0,
        int256 delta1
    );

    error OnlyPoolManager();
    error OnlyOwner();
    error InsufficientLiquidity();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
        owner = msg.sender;
    }

    /// @notice Add liquidity to a pool with exact amounts
    function addLiquidity(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0,
        uint256 amount1
    ) external {
        // Transfer tokens from sender to this contract
        if (amount0 > 0) {
            ERC20(Currency.unwrap(key.currency0)).safeTransferFrom(
                msg.sender,
                address(this),
                amount0
            );
        }
        if (amount1 > 0) {
            ERC20(Currency.unwrap(key.currency1)).safeTransferFrom(
                msg.sender,
                address(this),
                amount1
            );
        }

        // Encode callback data
        CallbackData memory params = CallbackData({
            key: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0: amount0,
            amount1: amount1,
            provider: msg.sender,
            liquidityToRemove: 0,
            isAdd: true
        });

        // Unlock and execute
        poolManager.unlock(abi.encode(params));
    }

    /// @notice Remove liquidity from a pool
    function removeLiquidity(
        PoolKey calldata key,
        uint128 liquidity,
        int24 tickLower,
        int24 tickUpper
    ) external {
        PoolId poolId = key.toId();
        if (userLiquidity[msg.sender][PoolId.unwrap(poolId)] < liquidity)
            revert InsufficientLiquidity();

        // Update tracking immediately (optimistic)
        userLiquidity[msg.sender][PoolId.unwrap(poolId)] -= liquidity;

        CallbackData memory params = CallbackData({
            key: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0: 0,
            amount1: 0,
            provider: msg.sender,
            liquidityToRemove: liquidity,
            isAdd: false
        });

        poolManager.unlock(abi.encode(params));
    }

    /// @inheritdoc IUnlockCallback
    function unlockCallback(
        bytes calldata data
    ) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();

        CallbackData memory params = abi.decode(data, (CallbackData));
        PoolId poolId = params.key.toId();

        if (params.isAdd) {
            // --- ADD LIQUIDITY ---

            // Calculate theoretical liquidity for amount0/amount1 for event logging?
            // Actually, for modifyLiquidity, we need to KNOW the liquidity amount to add.
            // But we only have amounts. We can use LiquidityAmounts to estimate.

            (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(poolId);
            uint160 sqrtPriceAX96 = TickMath.getSqrtPriceAtTick(
                params.tickLower
            );
            uint160 sqrtPriceBX96 = TickMath.getSqrtPriceAtTick(
                params.tickUpper
            );

            // If pool is uninitialized, sqrtPriceX96 is 0. We can't add liquidity easily without init.
            // Assuming initialized.

            uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
                sqrtPriceX96,
                sqrtPriceAX96,
                sqrtPriceBX96,
                params.amount0,
                params.amount1
            );

            // Add liquidity
            (BalanceDelta delta, ) = poolManager.modifyLiquidity(
                params.key,
                ModifyLiquidityParams({
                    tickLower: params.tickLower,
                    tickUpper: params.tickUpper,
                    liquidityDelta: int256(uint256(liquidity)),
                    salt: bytes32(0)
                }),
                bytes("")
            );

            // Track for user
            userLiquidity[params.provider][PoolId.unwrap(poolId)] += liquidity;

            // Settle debts
            if (delta.amount0() < 0) {
                poolManager.sync(params.key.currency0);
                ERC20(Currency.unwrap(params.key.currency0)).safeTransfer(
                    address(poolManager),
                    uint256(-int256(delta.amount0()))
                );
                poolManager.settle();
            }
            if (delta.amount1() < 0) {
                poolManager.sync(params.key.currency1);
                ERC20(Currency.unwrap(params.key.currency1)).safeTransfer(
                    address(poolManager),
                    uint256(-int256(delta.amount1()))
                );
                poolManager.settle();
            }

            // Refund excess tokens to provider
            uint256 balance0 = ERC20(Currency.unwrap(params.key.currency0))
                .balanceOf(address(this));
            if (balance0 > 0) {
                ERC20(Currency.unwrap(params.key.currency0)).safeTransfer(
                    params.provider,
                    balance0
                );
            }

            uint256 balance1 = ERC20(Currency.unwrap(params.key.currency1))
                .balanceOf(address(this));
            if (balance1 > 0) {
                ERC20(Currency.unwrap(params.key.currency1)).safeTransfer(
                    params.provider,
                    balance1
                );
            }

            emit LiquidityAdded(
                PoolId.unwrap(poolId),
                params.provider,
                liquidity,
                delta.amount0(),
                delta.amount1()
            );
        } else {
            // --- REMOVE LIQUIDITY ---

            (BalanceDelta delta, ) = poolManager.modifyLiquidity(
                params.key,
                ModifyLiquidityParams({
                    tickLower: params.tickLower,
                    tickUpper: params.tickUpper,
                    liquidityDelta: -int256(uint256(params.liquidityToRemove)),
                    salt: bytes32(0)
                }),
                bytes("")
            );

            // Take owed tokens (delta > 0 means we receive)
            if (delta.amount0() > 0) {
                poolManager.take(
                    params.key.currency0,
                    params.provider, // Send directly to user
                    uint256(int256(delta.amount0()))
                );
            }
            if (delta.amount1() > 0) {
                poolManager.take(
                    params.key.currency1,
                    params.provider, // Send directly to user
                    uint256(int256(delta.amount1()))
                );
            }

            emit LiquidityRemoved(
                PoolId.unwrap(poolId),
                params.provider,
                params.liquidityToRemove,
                delta.amount0(),
                delta.amount1()
            );
        }

        return bytes("");
    }

    /// @notice Rescue any stuck tokens
    function rescue(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        ERC20(token).safeTransfer(to, amount);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
