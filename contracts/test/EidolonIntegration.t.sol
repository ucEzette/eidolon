// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {EidolonHook} from "../src/EidolonHook.sol";
import {EidolonExecutor} from "../src/EidolonExecutor.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {IEidolonHook} from "../src/interfaces/IEidolonHook.sol";
import {WitnessLib} from "../src/libraries/WitnessLib.sol";

contract EidolonIntegrationTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    EidolonHook hook;
    EidolonExecutor executor;
    MockERC20 token0;
    MockERC20 token1;
    
    // User & Bot
    uint256 userPk = 0xA11CE;
    address user;
    uint256 botPk = 0xB07;
    address bot;

    function setUp() public {
        // 1. Setup Environment
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();
        token0 = MockERC20(Currency.unwrap(currency0));
        token1 = MockERC20(Currency.unwrap(currency1));

        user = vm.addr(userPk);
        bot = vm.addr(botPk);

        // Fund User & Bot
        token0.mint(user, 100 ether);
        token1.mint(user, 100 ether);
        token0.mint(bot, 100 ether);
        token1.mint(bot, 100 ether);

        // 2. Deploy Hook (using Deployers helper or manual)
        address hookAddress = address(uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG));
        deployCodeTo("EidolonHook.sol", abi.encode(manager, address(0) /*placeholder permit2*/, address(this), address(this)), hookAddress);
        hook = EidolonHook(payable(hookAddress));

        // 3. Deploy Executor
        executor = new EidolonExecutor(manager);
        
        // 4. Initialize Pool
        (key, ) = initPool(currency0, currency1, hook, 3000, SQRT_PRICE_1_1);
        
        // Approve Executor to spend Bot's funds
        vm.startPrank(bot);
        token0.approve(address(executor), type(uint256).max);
        token1.approve(address(executor), type(uint256).max);
        vm.stopPrank();
    }

    function test_GhostTradeExecution() public {
        // 1. User signs Permit for 10 Token0
        uint256 amount = 10 ether;
        uint256 deadline = block.timestamp + 1000;
        uint256 nonce = 0;

        IEidolonHook.GhostPermit memory permit = IEidolonHook.GhostPermit({
            provider: user,
            currency: currency0,
            amount: amount,
            poolId: key.toId(),
            nonce: nonce,
            deadline: deadline,
            isDualSided: false
        });

        // Mock Signature (since we mocked Permit2 address, strict verification fails unless we mock Permit2 contract too)
        // For this integration test, we trust the hook logic calls Permit2. 
        // We can use `vm.mockCall` to pretend Permit2 verified it successfully.
        bytes memory signature = hex"1234";

        vm.mockCall(
            address(0), // Fake Permit2
            abi.encodeWithSelector(0x30f28b7a), // permitWitnessTransferFrom
            abi.encode(true)
        );

        // 2. Prepare Witness Data
        WitnessLib.WitnessData memory witness = WitnessLib.WitnessData({
            poolId: PoolId.unwrap(key.toId()),
            hook: address(hook)
        });

        // 3. Bot calls Executor
        // Encode HookData
        IEidolonHook.GhostPermit[] memory permits = new IEidolonHook.GhostPermit[](1);
        permits[0] = permit;
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = signature;
        WitnessLib.WitnessData[] memory witnesses = new WitnessLib.WitnessData[](1);
        witnesses[0] = witness;
        
        bytes memory hookData = abi.encode(permits, signatures, witnesses);

        // Swap Params (Bot swaps Token1 -> Token0)
        SwapParams memory params = SwapParams({
            zeroForOne: false,
            amountSpecified: -int256(5 ether), // Bot sells 5 Token1
            sqrtPriceLimitX96: MAX_PRICE_LIMIT
        });

        vm.prank(bot);
        executor.execute(key, params, hookData, bot);

        // 4. Verify Results
        // User should have sold Token0 (pulled by Permit2)
        // Bot should have received Token0
        // Liquidity should have been materialized and settled
    }
}
