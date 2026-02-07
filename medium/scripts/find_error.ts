import { keccak256, toBytes } from 'viem';
import * as fs from 'fs';
import * as path from 'path';

const TARGET_SELECTOR = "0x5212cba1";

function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.json')) {
            try {
                const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                if (content.abi) {
                    content.abi.forEach((item: any) => {
                        if (item.type === 'error') {
                            const signature = `${item.name}(${item.inputs.map((i: any) => i.type).join(',')})`;
                            const selector = keccak256(toBytes(signature)).slice(0, 10);
                            if (selector === TARGET_SELECTOR) {
                                console.log(`MATCH found in ${file}: ${signature} -> ${selector}`);
                            }
                        }
                    });
                }
            } catch (e) { }
        }
    }
}

console.log(`🔍 Searching for selector ${TARGET_SELECTOR}...`);
scanDir('../contracts/out');
console.log("✨ Search complete.");
