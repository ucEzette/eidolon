
import * as fs from 'fs';

const orders: any[] = JSON.parse(fs.readFileSync('all_orders.json', 'utf8'));
const nonces = new Map();

orders.forEach(o => {
    if (nonces.has(o.nonce)) {
        nonces.set(o.nonce, [...nonces.get(o.nonce), o]);
    } else {
        nonces.set(o.nonce, [o]);
    }
});

for (const [nonce, list] of nonces.entries()) {
    if (list.length > 1) {
        console.log(`Duplicate Nonce: ${nonce}`);
        list.forEach((o: any) => console.log(`  - ID: ${o.id.slice(0, 8)} | Type: ${o.type} | Pool: ${o.poolId.slice(0, 8)} | Status: ${o.status}`));
    }
}
