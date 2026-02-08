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

interface IWETH {
    function deposit() external payable;

    function withdraw(uint256) external;

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function approve(address spender, uint256 value) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract EidolonExecutor {
    using CurrencyLibrary for Currency;
    using SafeTransferLib for ERC20;

    IPoolManager public immutable poolManager;
    address public immutable weth;

    constructor(IPoolManager _poolManager, address _weth) {
        poolManager = _poolManager;
        weth = _weth;
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
        bytes memory data = abi.encode(
            CallbackData({
                key: key,
                params: params,
                hookData: hookData,
                sender: msg.sender,
                recipient: recipient
            })
        );

        bytes memory result = poolManager.unlock(data);
        delta = abi.decode(result, (BalanceDelta));
    }

    function unlockCallback(
        bytes calldata data
    ) external returns (bytes memory) {
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

    function wrap() external payable {
        if (msg.value > 0) {
            IWETH(weth).deposit{value: msg.value}();
            ERC20(weth).safeTransfer(msg.sender, msg.value);
        }
    }

    function unwrap(uint256 amount) external {
        if (amount > 0) {
            ERC20(weth).safeTransferFrom(msg.sender, address(this), amount);
            IWETH(weth).withdraw(amount);
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "ETH transfer failed");
        }
    }

    function _settle(
        Currency currency,
        uint128 amount,
        address payer
    ) internal {
        if (currency.isAddressZero()) {
            poolManager.settle{value: amount}();
        } else {
            // Priority 1: Use funds already in the contract (e.g. from Auto-Wrap or provided by Hook)
            uint256 balance = ERC20(Currency.unwrap(currency)).balanceOf(
                address(this)
            );

            if (balance >= amount) {
                // If settling WETH and we have native ETH balance in executor (from msg.value)
                if (
                    Currency.unwrap(currency) == weth &&
                    address(this).balance >= amount &&
                    balance < amount // Only wrap if we don't already have enough WETH
                ) {
                    IWETH(weth).deposit{value: amount}();
                }

                poolManager.sync(currency);
                ERC20(Currency.unwrap(currency)).safeTransfer(
                    address(poolManager),
                    amount
                );
                poolManager.settle();
            } else {
                // Priority 2: Pull funds from swapper and settle
                ERC20(Currency.unwrap(currency)).safeTransferFrom(
                    payer,
                    address(poolManager),
                    amount
                );
                poolManager.sync(currency);
                poolManager.settle();
            }
        }
    }

    function _take(
        Currency currency,
        uint128 amount,
        address recipient
    ) internal {
        poolManager.take(currency, recipient, amount);
    }

    receive() external payable {}
}
