
import * as fs from 'fs';

const orders: any[] = JSON.parse(fs.readFileSync('all_orders.json', 'utf8'));
const targetPool = "0xdf3ebc2dbf48d8d04e00deb19ff13231c5ae3025709aab4a5bb26f5010b0261f";

const found = orders.filter((o: any) => o.poolId === targetPool);
console.log(JSON.stringify(found, null, 2));
