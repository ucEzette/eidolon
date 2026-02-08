const { keccak256 } = require("viem");

const signatures = [
    "beforeSwap(address,(address,address,uint24,int24,address),(bool,int256,uint160),bytes)",
    "afterSwap(address,(address,address,uint24,int24,address),(bool,int256,uint160),(int256,int256),bytes)",
    "beforeInitialize(address,(address,address,uint24,int24,address),uint160)",
    "afterInitialize(address,(address,address,uint24,int24,address),uint160,int24)",
    "beforeAddLiquidity(address,(address,address,uint24,int24,address),(int24,int24,int256,bytes32),bytes)",
    "afterAddLiquidity(address,(address,address,uint24,int24,address),(int24,int24,int256,bytes32),(int256,int256),uint128,bytes)",
    "beforeRemoveLiquidity(address,(address,address,uint24,int24,address),(int24,int24,uint128,bytes32),bytes)",
    "afterRemoveLiquidity(address,(address,address,uint24,int24,address),(int24,int24,uint128,bytes32),(int256,int256),bytes)",
    "beforeDonate(address,(address,address,uint24,int24,address),uint256,uint256,bytes)",
    "afterDonate(address,(address,address,uint24,int24,address),uint256,uint256,bytes)",
    "unlock(bytes)"
];

signatures.forEach(sig => {
    const hash = keccak256(Buffer.from(sig));
    const selector = hash.slice(0, 10);
    console.log(`${selector}: ${sig}`);
});
