
const { keccak256, encodeAbiParameters, encodePacked, getAddress } = require('viem');
const fs = require('fs');

const POOL_MANAGER = '0x00B036B58a818B1BC34d502D3fE730Db729e62AC';
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const DEPLOYER = '0x68faEBF19FA57658d37bF885F5377f735FE97D70';
const CREATE2_DEPLOYER = '0x4e59b44847b379578588920cA78FbF26c0B4956C';

const flags = BigInt(0x20c8);
const mask = BigInt(0x3fff);

async function run() {
    const buildInfo = JSON.parse(fs.readFileSync('../contracts/out/EidolonHook.sol/EidolonHook.json', 'utf8'));
    const bytecode = buildInfo.bytecode.object;
    const constructorArgs = encodeAbiParameters(
        [{ type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' }],
        [POOL_MANAGER, PERMIT2, DEPLOYER, DEPLOYER]
    );
    const codeHash = keccak256(encodePacked(['bytes', 'bytes'], [bytecode, constructorArgs]));

    console.log('Mining...');
    for (let i = 0; i < 1000000; i++) {
        const salt = encodeAbiParameters([{ type: 'uint256' }], [BigInt(i)]);
        const addr = getAddress('0x' + keccak256(encodePacked(['bytes1', 'address', 'bytes32', 'bytes32'], ['0xff', CREATE2_DEPLOYER, salt, codeHash])).slice(-40));
        if ((BigInt(addr) & mask) === flags) {
            console.log('Found salt:', i);
            console.log('Full salt:', salt);
            console.log('Address:', addr);
            process.exit(0);
        }
    }
    console.log('Not found in 1M iterations');
}

run().catch(console.error);
