// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {LiquidityProvider} from "../src/LiquidityProvider.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);

    function balanceOf(address) external view returns (uint256);
}

contract AddLiquidity is Script {
    uint24 constant FEE = 3000;
    int24 constant TICK_SPACING = 60;

    function run() external {
        address LIQUIDITY_PROVIDER = vm.envAddress("LIQUIDITY_PROVIDER");
        address POOL_MANAGER = vm.envAddress("POOL_MANAGER");
        address HOOK = vm.envAddress("EIDOLON_HOOK");
        address USDC = vm.envAddress("USDC");
        address WETH = vm.envAddress("WETH");
        address EI_ETH = vm.envAddress("eiETH");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Adding Liquidity from:", deployer);
        console2.log("USDC Balance:", IERC20(USDC).balanceOf(deployer));
        console2.log("WETH Balance:", IERC20(WETH).balanceOf(deployer));
        console2.log("eiETH Balance:", IERC20(EI_ETH).balanceOf(deployer));

        vm.startBroadcast(deployerPrivateKey);

        LiquidityProvider provider = LiquidityProvider(LIQUIDITY_PROVIDER);
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);

        // ═══════════════════════════════════════════════════════════════════
        // 1. Approve tokens for LiquidityProvider
        // ═══════════════════════════════════════════════════════════════════
        IERC20(USDC).approve(LIQUIDITY_PROVIDER, type(uint256).max);
        IERC20(WETH).approve(LIQUIDITY_PROVIDER, type(uint256).max);
        IERC20(EI_ETH).approve(LIQUIDITY_PROVIDER, type(uint256).max);
        console2.log("Tokens approved");

        // ═══════════════════════════════════════════════════════════════════
        // 2. Initialize WETH/eiETH Pool (if not already initialized)
        // ═══════════════════════════════════════════════════════════════════
        PoolKey memory wethEiethKey = PoolKey({
            currency0: Currency.wrap(WETH),
            currency1: Currency.wrap(EI_ETH),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });

        uint160 sqrtPriceX96 = 79228162514264337593543950336; // 1:1 price

        try poolManager.initialize(wethEiethKey, sqrtPriceX96) returns (
            int24 tick
        ) {
            console2.log("WETH/eiETH Pool Initialized! Tick:", tick);
        } catch {
            console2.log("WETH/eiETH Pool already initialized.");
        }

        // 2b. Initialize USDC/WETH Pool
        PoolKey memory usdcWethKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });

        try poolManager.initialize(usdcWethKey, sqrtPriceX96) returns (
            int24 tick
        ) {
            console2.log("USDC/WETH Pool Initialized! Tick:", tick);
        } catch {
            console2.log("USDC/WETH Pool already initialized.");
        }

        // ═══════════════════════════════════════════════════════════════════
        // 3. Add Liquidity to WETH/eiETH Pool
        // ═══════════════════════════════════════════════════════════════════
        console2.log("Adding liquidity to WETH/eiETH pool...");
        provider.addLiquiditySimple(
            WETH,
            EI_ETH,
            FEE,
            TICK_SPACING,
            HOOK,
            0.05e18, // 0.05 WETH
            0.1e18 // 0.1 eiETH
        );
        console2.log("WETH/eiETH liquidity added!");

        // ═══════════════════════════════════════════════════════════════════
        // 4. Add Liquidity to USDC/WETH Pool
        // ═══════════════════════════════════════════════════════════════════
        console2.log("Adding liquidity to USDC/WETH pool...");
        provider.addLiquiditySimple(
            USDC,
            WETH,
            FEE,
            TICK_SPACING,
            HOOK,
            40e6, // 40 USDC
            0.05e18 // 0.05 WETH
        );
        console2.log("USDC/WETH liquidity added!");

        vm.stopBroadcast();

        console2.log("=== Liquidity Addition Complete ===");
    }
}
