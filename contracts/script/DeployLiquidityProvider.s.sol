// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {LiquidityProvider} from "../src/LiquidityProvider.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract DeployLiquidityProvider is Script {
    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;

    function run() external returns (LiquidityProvider) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        LiquidityProvider provider = new LiquidityProvider(
            IPoolManager(POOL_MANAGER)
        );

        console2.log("LiquidityProvider deployed at:", address(provider));

        vm.stopBroadcast();

        return provider;
    }
}
