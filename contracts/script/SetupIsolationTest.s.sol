// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";

contract LiquidityHelper {
    IPoolManager manager;
    
    constructor(IPoolManager _manager) {
        manager = _manager;
    }
    
    struct CallbackData {
        PoolKey key;
        ModifyLiquidityParams params;
        address payer;
    }
    
    function addLiquidity(PoolKey memory key, ModifyLiquidityParams memory params) external payable {
        bytes memory data = abi.encode(CallbackData(key, params, msg.sender));
        manager.unlock(data);
    }
    
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        CallbackData memory cb = abi.decode(data, (CallbackData));
        (BalanceDelta delta,) = manager.modifyLiquidity(cb.key, cb.params, "");
        
        int128 amount0 = delta.amount0();
        if (amount0 < 0) {
            Currency c0 = cb.key.currency0;
            if (c0.isAddressZero()) {
                manager.settle{value: uint128(-amount0)}();
            } else {
                manager.sync(c0);
                MockERC20(Currency.unwrap(c0)).transferFrom(cb.payer, address(manager), uint128(-amount0));
                manager.settle();
            }
        }
        
        int128 amount1 = delta.amount1();
        if (amount1 < 0) {
            Currency c1 = cb.key.currency1;
             if (c1.isAddressZero()) {
                manager.settle{value: uint128(-amount1)}();
            } else {
                manager.sync(c1);
                MockERC20(Currency.unwrap(c1)).transferFrom(cb.payer, address(manager), uint128(-amount1));
                manager.settle();
            }
        }
        
        return "";
    }
}

contract SetupIsolationTest is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant HOOK_ADDRESS = 0xa5CC49688cB5026977a2A501cd7dD3daB2C580c8; 
    address constant WETH_ADDRESS = 0x4200000000000000000000000000000000000006;
    
    uint24 constant LP_FEE = 3000;
    int24 constant TICK_SPACING = 60;
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock USDC
        MockERC20 mockUSDC = new MockERC20("Mock USDC", "mUSDC", 6);
        console2.log("MockUSDC Deployed:", address(mockUSDC));
        
        // 2. Mint tokens to deployer (Bot)
        mockUSDC.mint(deployer, 1000000 * 10**18); // Mint plenty (1M scaled by 18 to be safe, though decimals=6)
        
        
        // 3. Create Pool Key
        address token0 = address(mockUSDC) < WETH_ADDRESS ? address(mockUSDC) : WETH_ADDRESS;
        address token1 = address(mockUSDC) < WETH_ADDRESS ? WETH_ADDRESS : address(mockUSDC);
        
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK_ADDRESS)
        });
        
        IPoolManager manager = IPoolManager(POOL_MANAGER);
        try manager.initialize(key, SQRT_PRICE_1_1) {
            console2.log("Pool Initialized");
        } catch {
            console2.log("Pool already initialized");
        }
        
        // 4. Add Liquidity Helper
        LiquidityHelper helper = new LiquidityHelper(manager);
        
        // Approvals (Deployer -> Helper)
        mockUSDC.approve(address(helper), type(uint256).max);
        MockERC20(WETH_ADDRESS).approve(address(helper), type(uint256).max);

        // Add Liquidity: Use small amount to fit in 0.05 ETH
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -887220,
            tickUpper: 887220,
            liquidityDelta: 1000000, // 1e6 units (tiny, fits in 0.05 ETH)
            salt: bytes32(0)
        });
        
        helper.addLiquidity(key, params);
        console2.log("Liquidity Added");

        vm.stopBroadcast();
    }
}
