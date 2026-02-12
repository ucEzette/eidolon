// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);
}

contract SeedLiquidity is Script, IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // Contract Addresses
    IPoolManager constant POOL_MANAGER =
        IPoolManager(0x00B036B58a818B1BC34d502D3fE730Db729e62AC);
    address constant HOOK = 0x296bA69b1F79d0eb0Ca812C5cf58FC2f4C0Bb0C8;

    // Token Addresses
    address constant USDC = 0x31d0220469e10c4E71834a79b1f276d740d3768F;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant EI_ETH = 0xe02eb159EB92DD0388eCdB33d0DB0f8831091bE6;

    // Pool Parameters
    uint24 constant FEE = 3000;
    int24 constant TICK_SPACING = 60;

    // Callback data
    struct CallbackData {
        PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        address sender;
    }

    CallbackData internal _pendingData;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Seeding Liquidity from:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // ═══════════════════════════════════════════════════════════════════
        // 1. Initialize WETH/eiETH Pool (if not already initialized)
        // ═══════════════════════════════════════════════════════════════════
        PoolKey memory wethEiethKey = PoolKey({
            currency0: Currency.wrap(WETH),
            currency1: Currency.wrap(EI_ETH),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });

        uint160 sqrtPriceX96 = 79228162514264337593543950336; // 1:1 price

        try POOL_MANAGER.initialize(wethEiethKey, sqrtPriceX96) returns (
            int24 tick
        ) {
            console2.log("WETH/eiETH Pool Initialized! Tick:", tick);
            console2.logBytes32(PoolId.unwrap(wethEiethKey.toId()));
        } catch {
            console2.log("WETH/eiETH Pool already initialized.");
        }

        // ═══════════════════════════════════════════════════════════════════
        // 2. Transfer tokens to PoolManager and add liquidity
        // ═══════════════════════════════════════════════════════════════════

        // USDC/WETH Pool
        _addLiquidityDirect(
            Currency.wrap(USDC),
            Currency.wrap(WETH),
            40e6, // 40 USDC
            0.05e18, // 0.05 WETH
            deployer
        );

        // WETH/eiETH Pool
        _addLiquidityDirect(
            Currency.wrap(WETH),
            Currency.wrap(EI_ETH),
            0.05e18, // 0.05 WETH
            0.1e18, // 0.1 eiETH
            deployer
        );

        vm.stopBroadcast();

        console2.log("=== Liquidity Seeding Complete ===");
    }

    function _addLiquidityDirect(
        Currency currency0,
        Currency currency1,
        uint256 amount0,
        uint256 amount1,
        address sender
    ) internal {
        PoolKey memory key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });

        int24 tickLower = -TICK_SPACING * 10; // -600
        int24 tickUpper = TICK_SPACING * 10; // +600

        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(0);
        uint160 sqrtPriceAX96 = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtPriceBX96 = TickMath.getSqrtPriceAtTick(tickUpper);

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceAX96,
            sqrtPriceBX96,
            amount0,
            amount1
        );

        console2.log("Adding liquidity:", uint256(liquidity));

        // Transfer tokens to PoolManager first
        IERC20(Currency.unwrap(currency0)).transfer(
            address(POOL_MANAGER),
            amount0
        );
        IERC20(Currency.unwrap(currency1)).transfer(
            address(POOL_MANAGER),
            amount1
        );

        // Store callback data
        _pendingData = CallbackData({
            key: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: liquidity,
            sender: sender
        });

        // Unlock and add liquidity
        POOL_MANAGER.unlock(abi.encode(_pendingData));

        console2.log("Liquidity added!");
    }

    function unlockCallback(
        bytes calldata data
    ) external override returns (bytes memory) {
        require(msg.sender == address(POOL_MANAGER), "Only PoolManager");

        CallbackData memory cbData = abi.decode(data, (CallbackData));

        // Sync currencies
        POOL_MANAGER.sync(cbData.key.currency0);
        POOL_MANAGER.sync(cbData.key.currency1);

        // Settle the tokens we transferred
        POOL_MANAGER.settle();
        POOL_MANAGER.settle();

        // Add liquidity
        (BalanceDelta delta, ) = POOL_MANAGER.modifyLiquidity(
            cbData.key,
            ModifyLiquidityParams({
                tickLower: cbData.tickLower,
                tickUpper: cbData.tickUpper,
                liquidityDelta: int256(uint256(cbData.liquidity)),
                salt: bytes32(0)
            }),
            bytes("")
        );

        console2.log("Delta0:", uint256(int256(-delta.amount0())));
        console2.log("Delta1:", uint256(int256(-delta.amount1())));

        return bytes("");
    }
}
