// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

contract DeployRouter is Script {
    // Unichain Sepolia POOL_MANAGER
    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying Router (PoolSwapTest) from:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        PoolSwapTest router = new PoolSwapTest(IPoolManager(POOL_MANAGER));

        vm.stopBroadcast();

        console2.log("=== ROUTER DEPLOYMENT SUCCESSFUL ===");
        console2.log("Router Address:", address(router));
    }
}
