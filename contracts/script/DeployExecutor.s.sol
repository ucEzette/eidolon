// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {EidolonExecutor} from "../src/EidolonExecutor.sol";

contract DeployExecutor is Script {
    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying Executor from:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        EidolonExecutor executor = new EidolonExecutor(IPoolManager(POOL_MANAGER));

        console2.log("EidolonExecutor deployed at:", address(executor));

        vm.stopBroadcast();
    }
}
