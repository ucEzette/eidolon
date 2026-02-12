// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

contract SignPermit is Script {
    bytes32 constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    bytes32 constant DOMAIN_SEPARATOR =
        0x2a1fda83efdd0b06cf1a15e7ee9aa85aa7a1612ae5af0c599ecc6609e6afafa1;

    function run() external {
        uint256 ownerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address owner = vm.addr(ownerPrivateKey);
        address spender = 0x68faEBF19FA57658d37bF885F5377f735FE97D70;
        uint256 value = 29999996;
        uint256 nonce = 2;
        uint256 deadline = type(uint256).max;

        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonce, deadline)
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        console2.log("v:", v);
        console2.log("r:");
        console2.logBytes32(r);
        console2.log("s:");
        console2.logBytes32(s);
    }
}
