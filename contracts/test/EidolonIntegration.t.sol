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
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {EidolonHook} from "../src/EidolonHook.sol";
import {EidolonExecutor} from "../src/EidolonExecutor.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {IEidolonHook} from "../src/interfaces/IEidolonHook.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

contract MockWETH is MockERC20 {
    constructor() MockERC20("Wrapped ETH", "WETH", 18) {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
}

contract EidolonIntegrationTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    EidolonHook hook;
    EidolonExecutor executor;
    MockERC20 token0;
    MockERC20 token1;
    MockWETH weth;

    // User & Bot
    uint256 userPk = 0xA11CE;
    address user;
    uint256 botPk = 0xB07;
    address bot;

    // Mock Permit2
    address constant MOCK_PERMIT2 = address(0xCAFE);

    function setUp() public {
        // 1. Setup Environment
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();
        token0 = MockERC20(Currency.unwrap(currency0));
        token1 = MockERC20(Currency.unwrap(currency1));
        weth = new MockWETH();

        user = vm.addr(userPk);
        bot = vm.addr(botPk);

        // Fund User & Bot
        token0.mint(user, 100 ether);
        token1.mint(user, 100 ether);
        token0.mint(bot, 100 ether);
        token1.mint(bot, 100 ether);

        // 2. Deploy Hook (using Deployers helper or manual)
        address hookAddress = address(
            uint160(
                Hooks.BEFORE_INITIALIZE_FLAG |
                    Hooks.BEFORE_SWAP_FLAG |
                    Hooks.AFTER_SWAP_FLAG |
                    Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG |
                    Hooks.AFTER_INITIALIZE_FLAG
            )
        );
        deployCodeTo(
            "EidolonHook.sol",
            abi.encode(manager, MOCK_PERMIT2, address(this), address(this)),
            hookAddress
        );
        hook = EidolonHook(payable(hookAddress));

        // 3. Deploy Executor
        executor = new EidolonExecutor(manager, address(weth));

        // 4. Initialize Pool
        (key, ) = initPool(currency0, currency1, hook, 3000, SQRT_PRICE_1_1);

        // 5. Add Base Liquidity (Anchor)
        // Since we enabled strict checks, verify we have base liquidity?
        // initPool might add some? No, initPool just initializes.
        // We need to modifyLiquidity to add base liquidity.
        // But the check in beforeSwap is `poolManager.getLiquidity`.
        // If we don't add liquidity, swap will fail hook check.
        // But for this test, we might want to test that specific flow or just skip it?
        // Let's add liquidity.
        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 10 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        // Approve Executor to spend Bot's funds
        vm.startPrank(bot);
        token0.approve(address(executor), type(uint256).max);
        token1.approve(address(executor), type(uint256).max);
        vm.stopPrank();
    }

    function test_GhostTradeExecution() public {
        // 1. Activate Session
        // Mock Permit2.permit call
        // We don't need to actually call it if we mock the returndata?
        // Actually, internal call `PERMIT2.permit` must succeed.
        vm.mockCall(
            MOCK_PERMIT2,
            abi.encodeWithSignature(
                "permit(address,((address,uint160,uint48,uint48),address,uint256),bytes)"
            ),
            ""
        );

        // 5. Add Base Liquidity (Anchor)
        token0.approve(address(modifyLiquidityRouter), type(uint256).max);
        token1.approve(address(modifyLiquidityRouter), type(uint256).max);
        token0.mint(address(this), 100 ether);
        token1.mint(address(this), 100 ether);

        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 10 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        // 1. Activate Session
        IAllowanceTransfer.PermitDetails memory details = IAllowanceTransfer
            .PermitDetails({
                token: Currency.unwrap(currency0),
                amount: 100 ether,
                expiration: uint48(block.timestamp + 1000),
                nonce: 0
            });

        IAllowanceTransfer.PermitSingle memory permit = IAllowanceTransfer
            .PermitSingle({
                details: details,
                spender: address(hook),
                sigDeadline: block.timestamp + 1000
            });

        bytes memory signature = hex"1234";

        vm.prank(user);
        hook.activateSession(permit, signature);

        // 2. Prepare Ghost Instruction
        // User provides Currency0 (if Bot sells Currency1 -> ZeroForOne=false -> Swap 1 for 0?
        // If Bot sells 1 (In), asks for 0 (Out).
        // Hook needs to provide 0 (Out) to Bot.
        // So Hook pulls 0 from User.
        uint256 amount = 10 ether;

        IEidolonHook.GhostInstruction[]
            memory instructions = new IEidolonHook.GhostInstruction[](1);
        instructions[0] = IEidolonHook.GhostInstruction({
            provider: user,
            currency: currency0, // Providing Token0
            amount: amount,
            nonce: 0,
            isDualSided: false
        });

        bytes memory hookData = abi.encode(instructions);

        // 3. Mock Permit2 TransferFrom
        vm.mockCall(
            MOCK_PERMIT2,
            abi.encodeWithSignature(
                "transferFrom(address,address,uint160,address)"
            ),
            ""
        );

        // 4. Mock Transfer from User to Hook (since Permit2 is mocked and won't actually move funds)
        // We need the Hook to have funds to send to Swapper.
        // So we mint to Hook? Or assume TransferFrom works?
        // If TransferFrom is mocked, Hook doesn't get funds.
        // Then `ERC20.safeTransfer` (Hook -> Swapper) will fail.
        // Solution: Mint to Hook beforehand or deal to it.
        deal(Currency.unwrap(currency0), address(hook), amount);

        // Swap Params (Bot sells Token1 -> buys Token0)
        // OneForZero -> zeroForOne = false
        SwapParams memory params = SwapParams({
            zeroForOne: false,
            amountSpecified: -int256(5 ether), // Bot sells 5 Token1
            sqrtPriceLimitX96: MAX_PRICE_LIMIT
        });

        vm.prank(bot);
        // We expect Executor to call swap.
        // Executor code: swap(params, hookData)
        executor.execute(key, params, hookData, bot);

        // 5. Verify Results
        // Session should be active
        assertTrue(hook.isSessionActive(user));
    }
}
