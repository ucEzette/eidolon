// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

contract BumpRouter {
    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    function bump(PoolKey memory key, uint160 limit) external payable {
        manager.unlock(abi.encode(key, limit));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "Not Manager");
        
        (PoolKey memory key, uint160 limit) = abi.decode(data, (PoolKey, uint160));

        // Swap eiETH (Currency1) -> WETH (Currency0)
        SwapParams memory params = SwapParams({
            zeroForOne: false, 
            amountSpecified: -100, 
            sqrtPriceLimitX96: limit
        });

        BalanceDelta delta = manager.swap(key, params, new bytes(0));

        // Settlement
        uint128 amount1ToPay = uint128(-delta.amount1());
        if (amount1ToPay > 0) {
            Currency(key.currency1).transfer(address(manager), amount1ToPay);
            manager.settle();
        }

        uint128 amount0ToTake = uint128(delta.amount0());
        if (amount0ToTake > 0) {
            manager.take(key.currency0, tx.origin, amount0ToTake); 
        }
        
        return "";
    }
}
