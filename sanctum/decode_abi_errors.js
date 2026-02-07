/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const { keccak256, toBytes } = require('viem');

const artifactPath = '../contracts/out/PoolManager.sol/PoolManager.json';
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

console.log("Scanning ABI for errors...");

artifact.abi.forEach(item => {
    if (item.type === 'error') {
        const signature = `${item.name}(${item.inputs.map(i => i.type).join(',')})`;
        const selector = keccak256(toBytes(signature)).slice(0, 10);

        if (['0x9e4d7cc7', '0x90bfb865', '0x486aa307'].includes(selector)) {
            console.log(`MATCH: ${selector} -> ${signature}`);
        }
        console.log(`${selector} -> ${signature}`);
    }
});
