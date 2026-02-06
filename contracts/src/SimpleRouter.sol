// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

contract SimpleRouter {
    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    struct RouterSwapParams {
        PoolKey key;
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
        bytes hookData;
    }

    function swap(RouterSwapParams calldata params) external payable {
        manager.unlock(abi.encode(params, msg.sender));
    }

    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick) {
        return manager.initialize(key, sqrtPriceX96);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "Not Manager");
        
        (RouterSwapParams memory p, address payer) = abi.decode(data, (RouterSwapParams, address));

        SwapParams memory sp = SwapParams({
            zeroForOne: p.zeroForOne,
            amountSpecified: p.amountSpecified,
            sqrtPriceLimitX96: p.sqrtPriceLimitX96
        });

        BalanceDelta delta = manager.swap(p.key, sp, p.hookData);

        // Determine Delta
        int256 delta0 = delta.amount0();
        int256 delta1 = delta.amount1();

        // Settle Negatives (Input)
        if (delta0 < 0) {
            _settle(p.key.currency0, uint256(-delta0), payer);
        }
        if (delta1 < 0) {
            _settle(p.key.currency1, uint256(-delta1), payer);
        }

        // Take Positives (Output)
        if (delta0 > 0) {
             manager.take(p.key.currency0, payer, uint256(delta0));
        }
        if (delta1 > 0) {
             manager.take(p.key.currency1, payer, uint256(delta1));
        }
        
        return "";
    }

    function _settle(Currency currency, uint256 amount, address payer) internal {
        if (currency.isAddressZero()) {
            manager.settle{value: amount}();
        } else {
            // Pull from payer (requires approval)
            // Or assume payer transferred to THIS contract?
            // To be simple: Assume payer transferred to THIS contract.
            // But we can't pull from payer easily unless we use TransferFrom.
            // Let's assume payer is EOA and they transferred to US in the same tx?
            // Or they use `router.transfer(..., value)` (for native).
            // For ERC20, they must approve Router. Router uses transferFrom.
            
            // Simpler: Router pulls from msg.sender (payer).
            // Payer approved Router.
            // Contract uses transferFrom(payer, address(manager), amount).
            // Wait, manager expects funds to be IN manager.
            // So default is transfer to manager.
            
            // NOTE: Currency library might not have transferFrom wrapper.
            // Use low level call or interface.
            // I'll assume ERC20 interface.
            (bool success, ) = Currency.unwrap(currency).call(
                abi.encodeWithSelector(0x23b872dd, payer, address(manager), amount)
            );
            require(success, "TransferFrom failed");
            manager.settle();
        }
    }
    
    receive() external payable {}
}
