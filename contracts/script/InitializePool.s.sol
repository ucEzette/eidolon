// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract InitializePool is Script {
    using PoolIdLibrary for PoolKey;

    function run() external {
        address POOL_MANAGER = vm.envAddress("POOL_MANAGER");
        address HOOK = vm.envAddress("EIDOLON_HOOK");
        address USDC = vm.envAddress("USDC");
        address WETH = vm.envAddress("WETH");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        // Initial price: 1:1 for testing
        uint160 sqrtPriceX96 = 79228162514264337593543950336;

        try IPoolManager(POOL_MANAGER).initialize(key, sqrtPriceX96) returns (
            int24 tick
        ) {
            console2.log("Pool Initialized! Tick:", tick);
            console2.log("Pool ID:");
            console2.logBytes32(PoolId.unwrap(key.toId()));
        } catch {
            console2.log("Pool might already be initialized or failed.");
        }

        vm.stopBroadcast();
    }
}
