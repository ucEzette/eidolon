// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
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

    IPoolManager public immutable poolManager;
    address public owner;

    struct AddLiquidityParams {
        PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0;
        uint256 amount1;
        address provider;
    }

    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        uint128 liquidity,
        int256 delta0,
        int256 delta1
    );

    error OnlyPoolManager();
    error OnlyOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
        owner = msg.sender;
    }

    /// @notice Add liquidity to a pool with exact amounts
    /// @param key The pool key
    /// @param tickLower Lower tick bound
    /// @param tickUpper Upper tick bound
    /// @param amount0 Amount of token0 to add
    /// @param amount1 Amount of token1 to add
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
        AddLiquidityParams memory params = AddLiquidityParams({
            key: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0: amount0,
            amount1: amount1,
            provider: msg.sender
        });

        // Unlock and execute
        poolManager.unlock(abi.encode(params));
    }

    /// @notice Simplified function to add liquidity with default tick range
    /// @param currency0 First currency
    /// @param currency1 Second currency
    /// @param fee Pool fee
    /// @param tickSpacing Pool tick spacing
    /// @param hook Pool hook address
    /// @param amount0 Amount of token0
    /// @param amount1 Amount of token1
    function addLiquiditySimple(
        address currency0,
        address currency1,
        uint24 fee,
        int24 tickSpacing,
        address hook,
        uint256 amount0,
        uint256 amount1
    ) external {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(currency0),
            currency1: Currency.wrap(currency1),
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(hook)
        });

        // Default tick range: ±10 tick spacings around current price
        int24 tickLower = -tickSpacing * 10;
        int24 tickUpper = tickSpacing * 10;

        // Transfer tokens from sender
        if (amount0 > 0) {
            ERC20(currency0).safeTransferFrom(
                msg.sender,
                address(this),
                amount0
            );
        }
        if (amount1 > 0) {
            ERC20(currency1).safeTransferFrom(
                msg.sender,
                address(this),
                amount1
            );
        }

        AddLiquidityParams memory params = AddLiquidityParams({
            key: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0: amount0,
            amount1: amount1,
            provider: msg.sender
        });

        poolManager.unlock(abi.encode(params));
    }

    /// @inheritdoc IUnlockCallback
    function unlockCallback(
        bytes calldata data
    ) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();

        AddLiquidityParams memory params = abi.decode(
            data,
            (AddLiquidityParams)
        );

        // Calculate liquidity from amounts
        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(0);
        uint160 sqrtPriceAX96 = TickMath.getSqrtPriceAtTick(params.tickLower);
        uint160 sqrtPriceBX96 = TickMath.getSqrtPriceAtTick(params.tickUpper);

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceAX96,
            sqrtPriceBX96,
            params.amount0,
            params.amount1
        );

        // 1. Add liquidity first (this tells the pool what we owe)
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

        // 2. Settle the currencies we owe
        // delta.amount0() is negative when we owe tokens
        // V4 settlement order: sync (saves reservesBefore) → transfer → settle (calculates paid)
        if (delta.amount0() < 0) {
            uint256 amountOwed = uint256(-int256(delta.amount0()));
            poolManager.sync(params.key.currency0); // Saves current balance as reservesBefore
            ERC20(Currency.unwrap(params.key.currency0)).safeTransfer(
                address(poolManager),
                amountOwed
            );
            poolManager.settle(); // Calculates paid = balanceNow - reservesBefore
        }

        if (delta.amount1() < 0) {
            uint256 amountOwed = uint256(-int256(delta.amount1()));
            poolManager.sync(params.key.currency1);
            ERC20(Currency.unwrap(params.key.currency1)).safeTransfer(
                address(poolManager),
                amountOwed
            );
            poolManager.settle();
        }

        emit LiquidityAdded(
            keccak256(abi.encode(params.key)),
            params.provider,
            liquidity,
            delta.amount0(),
            delta.amount1()
        );

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
