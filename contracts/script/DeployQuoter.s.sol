// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {StateView} from "@uniswap/v4-periphery/src/lens/StateView.sol";
import {V4Quoter} from "@uniswap/v4-periphery/src/lens/V4Quoter.sol";

contract DeployQuoter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Existing PoolManager address
        address POOL_MANAGER = vm.envAddress("POOL_MANAGER");

        console2.log("Deploying Quoter from:", deployer);
        console2.log("Using PoolManager:", POOL_MANAGER);

        vm.startBroadcast(deployerPrivateKey);

        V4Quoter quoter = new V4Quoter(IPoolManager(POOL_MANAGER));

        console2.log("V4Quoter Deployed:", address(quoter));

        vm.stopBroadcast();
    }
}
