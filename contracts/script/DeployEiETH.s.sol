// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {EiETH} from "../src/EiETH.sol";

contract DeployEiETH is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        EiETH token = new EiETH();

        vm.stopBroadcast();
    }
}
