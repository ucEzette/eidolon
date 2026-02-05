// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

interface IEidolonExecutor {
    function execute(
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData,
        address recipient
    ) external payable returns (BalanceDelta delta);
}

contract VerifyExecution is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    // ADDRESSES FROM PREVIOUS STEPS
    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant HOOK_ADDRESS = 0xa5CC49688cB5026977a2A501cd7dD3daB2C580c8;
    address constant EXECUTOR_ADDRESS = 0x1318783e1b61d173315d566003836dc850B144C2;
    address constant MOCK_USDC = 0x6049396B200058e95AD2C5A4354458ee6d25EAC8;
    address constant WETH_ADDRESS = 0x4200000000000000000000000000000000000006;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // Setup PoolKey
        address token0 = MOCK_USDC < WETH_ADDRESS ? MOCK_USDC : WETH_ADDRESS;
        address token1 = MOCK_USDC < WETH_ADDRESS ? WETH_ADDRESS : MOCK_USDC;
        bool isUSDCToken0 = token0 == MOCK_USDC;
        
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(HOOK_ADDRESS)
        });

        // Params
        bool zeroForOne = isUSDCToken0; // Swap USDC -> WETH
        // Exact Input 10 USDC
        int256 amountSpecified = -10 * 10**6;
        
        // Limits
        uint160 MIN_SQRT_PRICE = 4295128739;
        uint160 MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342;
        
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: amountSpecified,
            sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE + 1 : MAX_SQRT_PRICE - 1
        });

        // 1. Sync
        IPoolManager manager = IPoolManager(POOL_MANAGER);
        manager.sync(Currency.wrap(MOCK_USDC));
        
        // 2. Transfer
        MockERC20(MOCK_USDC).transfer(address(manager), 10 * 10**6);
        
        // 3. Execute
        IEidolonExecutor(EXECUTOR_ADDRESS).execute(key, params, "", deployer);
        
        console2.log("Swap Executed Successfully");

        vm.stopBroadcast();
    }
}
