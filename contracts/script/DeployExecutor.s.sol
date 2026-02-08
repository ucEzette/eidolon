// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {EidolonExecutor} from "../src/EidolonExecutor.sol";

contract DeployExecutor is Script {
    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant WETH = 0x4200000000000000000000000000000000000006;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        EidolonExecutor executor = new EidolonExecutor(
            IPoolManager(POOL_MANAGER),
            WETH
        );

        vm.stopBroadcast();
    }
}
