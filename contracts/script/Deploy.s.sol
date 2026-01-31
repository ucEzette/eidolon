// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {EidolonHook} from "../src/EidolonHook.sol";

contract DeployEidolon is Script {
    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying from:", deployer);

        // Calculate required flags
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG | 
            Hooks.AFTER_SWAP_FLAG | 
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        console2.log("Mining salt for flags:", flags);

        // Deploy implementation (optional if using proxy, but we deploy directly for MVP)
        // Construction args: manager, permit2
        bytes memory creationCode = type(EidolonHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(POOL_MANAGER), PERMIT2);

        // Mine salt
        (address hookAddress, bytes32 salt) = HookMiner.find(
            deployer,
            flags,
            creationCode,
            constructorArgs
        );

        console2.log("Mined salt:", vm.toString(salt));
        console2.log("Expected address:", hookAddress);

        vm.startBroadcast(deployerPrivateKey);

        EidolonHook hook = new EidolonHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            PERMIT2
        );

        require(address(hook) == hookAddress, "Hook address mismatch");

        vm.stopBroadcast();

        console2.log("EidolonHook deployed at:", address(hook));
    }
}
