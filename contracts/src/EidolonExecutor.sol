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
import {ISignatureTransfer} from "permit2/src/interfaces/ISignatureTransfer.sol";
import {WitnessLib} from "./libraries/WitnessLib.sol";

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
    ISignatureTransfer public immutable permit2;

    constructor(IPoolManager _poolManager, address _weth, address _permit2) {
        poolManager = _poolManager;
        weth = _weth;
        permit2 = ISignatureTransfer(_permit2);
    }

    struct CallbackData {
        PoolKey key;
        SwapParams params;
        bytes hookData;
        address sender;
        address recipient;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT SWAP — msg.sender pays gas and owns the input tokens
    // ═══════════════════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════════════════
    // GASLESS SWAP — Bot calls on behalf of user, tokens pulled via Permit2
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Execute a swap using a Permit2 witness signature to pull user tokens
    /// @param key The pool key
    /// @param params The swap parameters
    /// @param hookData The hook data (GhostInstructions)
    /// @param owner The user whose tokens are being swapped (permit signer)
    /// @param permitAmount The amount the permit authorizes
    /// @param permitNonce The permit nonce
    /// @param permitDeadline The permit deadline
    /// @param witness The witness data (poolId, hook) that was signed
    /// @param signature The user's Permit2 signature
    function executeGasless(
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData,
        address owner,
        uint256 permitAmount,
        uint256 permitNonce,
        uint256 permitDeadline,
        WitnessLib.WitnessData calldata witness,
        bytes calldata signature
    ) external returns (BalanceDelta delta) {
        // Determine input token from swap direction
        address inputToken = params.zeroForOne
            ? Currency.unwrap(key.currency0)
            : Currency.unwrap(key.currency1);

        // Calculate actual input amount (amountSpecified is negative for exact-input)
        uint256 inputAmount = uint256(-params.amountSpecified);

        // 1. Pull user's tokens into THIS contract via Permit2 witness transfer
        ISignatureTransfer.PermitTransferFrom
            memory permitTransfer = ISignatureTransfer.PermitTransferFrom({
                permitted: ISignatureTransfer.TokenPermissions({
                    token: inputToken,
                    amount: permitAmount
                }),
                nonce: permitNonce,
                deadline: permitDeadline
            });

        ISignatureTransfer.SignatureTransferDetails
            memory transferDetails = ISignatureTransfer
                .SignatureTransferDetails({
                    to: address(this),
                    requestedAmount: inputAmount
                });

        bytes32 witnessHash = WitnessLib.hash(witness);

        permit2.permitWitnessTransferFrom(
            permitTransfer,
            transferDetails,
            owner,
            witnessHash,
            WitnessLib.WITNESS_TYPE_STRING,
            signature
        );

        // 2. Execute the swap — sender is address(this) so _settle uses our balance
        bytes memory data = abi.encode(
            CallbackData({
                key: key,
                params: params,
                hookData: hookData,
                sender: address(this),
                recipient: owner
            })
        );

        bytes memory result = poolManager.unlock(data);
        delta = abi.decode(result, (BalanceDelta));

        // 3. Return any leftover input tokens to the user
        uint256 remaining = ERC20(inputToken).balanceOf(address(this));
        if (remaining > 0) {
            ERC20(inputToken).safeTransfer(owner, remaining);
        }
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
            // Priority 1: Use funds already in the contract (e.g. from Permit2 pull or Auto-Wrap)
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
