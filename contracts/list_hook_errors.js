
const fs = require('fs');
const { keccak256, toBytes } = require('viem');

const artifactPath = 'out/EidolonHook.sol/EidolonHook.json';
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

console.log("Scanning EidolonHook ABI for errors...");

artifact.abi.forEach(item => {
    if (item.type === 'error') {
        const signature = `${item.name}(${item.inputs.map(i => i.type).join(',')})`;
        const selector = keccak256(toBytes(signature)).slice(0, 10);
        console.log(`${selector} -> ${signature}`);
    }
});
