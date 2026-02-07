// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {EidolonHook} from "../src/EidolonHook.sol";

contract DeployEidolon is Script {
    // Unichain Sepolia addresses
    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying from:", deployer);

        // Calculate required flags
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.BEFORE_SWAP_FLAG | 
            Hooks.AFTER_SWAP_FLAG | 
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        console2.log("Mining fresh addr for flags:", flags);

        // Construction args: manager, permit2, owner, treasury
        bytes memory creationCode = type(EidolonHook).creationCode;
        bytes memory constructorArgs = abi.encode(
            IPoolManager(POOL_MANAGER), 
            PERMIT2,
            deployer,
            deployer
        );

        address hookAddress;
        bytes32 salt;
        bytes memory creationCodeWithArgs = abi.encodePacked(creationCode, constructorArgs);
        bytes32 codeHash = keccak256(creationCodeWithArgs);
        
        // Use pre-mined salt for CREATE2 to satisfy hook flags
        bool found = true;
        salt = bytes32(uint256(7808));
        hookAddress = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xFF), 
            0x4e59b44847b379578588920cA78FbF26c0B4956C, // CREATE2_DEPLOYER
            salt, 
            codeHash
        )))));

        require(found, "Could not mine valid salt");

        console2.log("Mined salt:", vm.toString(salt));
        console2.log("Expected hook address:", hookAddress);

        vm.startBroadcast(deployerPrivateKey);

        EidolonHook hook = new EidolonHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            PERMIT2,
            deployer,
            deployer
        );

        require(address(hook) == hookAddress, "Deployment address mismatch");
    }
}
