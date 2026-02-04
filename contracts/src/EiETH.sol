// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "solmate/src/tokens/ERC20.sol";

contract EiETH is ERC20 {
    constructor() ERC20("Eidolon ETH", "eiETH", 18) {
        _mint(msg.sender, 21_000_000 * 1e18);
    }
}
