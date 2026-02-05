// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";

contract EidolonExecutor {
    using CurrencyLibrary for Currency;
    using SafeTransferLib for ERC20;

    IPoolManager public immutable poolManager;

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    struct CallbackData {
        PoolKey key;
        SwapParams params;
        bytes hookData;
        address sender;
        address recipient;
    }

    function execute(
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData,
        address recipient
    ) external payable returns (BalanceDelta delta) {
        bytes memory data = abi.encode(CallbackData({
            key: key,
            params: params,
            hookData: hookData,
            sender: msg.sender,
            recipient: recipient
        }));

        bytes memory result = poolManager.unlock(data);
        delta = abi.decode(result, (BalanceDelta));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");

        CallbackData memory cb = abi.decode(data, (CallbackData));
        
        // SWAP call to PoolManager with HOOK DATA (JIT trigger)
        BalanceDelta delta = poolManager.swap(cb.key, cb.params, cb.hookData);

        // DELTA HANDLING
        // amount0: delta for token0. Neg = user pays, Pos = user receives.
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();

        if (amount0 > 0) {
            _take(cb.key.currency0, uint128(amount0), cb.recipient);
        }
        if (amount1 > 0) {
            _take(cb.key.currency1, uint128(amount1), cb.recipient);
        }
        if (amount0 < 0) {
            _settle(cb.key.currency0, uint128(-amount0), cb.sender);
        }
        if (amount1 < 0) {
            _settle(cb.key.currency1, uint128(-amount1), cb.sender);
        }

        return abi.encode(delta);
    }

    function _settle(Currency currency, uint128 amount, address payer) internal {
        if (currency.isAddressZero()) {
            poolManager.settle{value: amount}();
        } else {
            // Funds transferred by Hook
            poolManager.settle();
        }
    }

    function _take(Currency currency, uint128 amount, address recipient) internal {
        poolManager.take(currency, recipient, amount);
    }
    
    receive() external payable {}
}
