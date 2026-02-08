// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {EidolonHook} from "../src/EidolonHook.sol";
import {EidolonExecutor} from "../src/EidolonExecutor.sol";

contract DeployAll is Script {
    // Foundry's CREATE2_DEPLOYER
    address constant CREATE2_DEPLOYER =
        0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address POOL_MANAGER = vm.envAddress("POOL_MANAGER");
        address PERMIT2 = vm.envAddress("PERMIT2");
        address WETH = vm.envAddress("WETH");

        console2.log("Deploying All Contracts from:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy EidolonHook
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG |
                Hooks.AFTER_SWAP_FLAG |
                Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG |
                Hooks.BEFORE_INITIALIZE_FLAG
        );

        bytes memory creationCode = type(EidolonHook).creationCode;
        bytes memory constructorArgs = abi.encode(
            IPoolManager(POOL_MANAGER),
            PERMIT2,
            deployer,
            deployer
        );

        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            creationCode,
            constructorArgs
        );

        EidolonHook hook = new EidolonHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            PERMIT2,
            deployer,
            deployer
        );

        require(address(hook) == hookAddress, "Hook address mismatch");
        console2.log("EidolonHook Deployed:", address(hook));

        // 2. Deploy EidolonExecutor
        EidolonExecutor executor = new EidolonExecutor(
            IPoolManager(POOL_MANAGER),
            WETH
        );
        console2.log("EidolonExecutor Deployed:", address(executor));

        vm.stopBroadcast();
    }
}
