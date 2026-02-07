// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {EidolonHook} from "../src/EidolonHook.sol";

contract DiagnosticDeploy is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        
        bytes memory bytecode = abi.encodePacked(
            type(EidolonHook).creationCode,
            abi.encode(address(1), address(2), deployer, deployer)
        );
        bytes32 codeHash = keccak256(bytecode);
        bytes32 salt = bytes32(0);
        
        address computed = vm.computeCreate2Address(salt, codeHash, CREATE2_DEPLOYER);
        console2.log("Computed address (CREATE2_DEPLOYER):", computed);
        
        address computedEOA = vm.computeCreate2Address(salt, codeHash, deployer);
        console2.log("Computed address (EOA):", computedEOA);
    }
}
