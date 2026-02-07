
import * as fs from 'fs';

const orders: any[] = JSON.parse(fs.readFileSync('all_orders.json', 'utf8'));
const settledSwaps = orders.filter((o: any) => o.type === 'swap' && o.status === 'Settled');
console.log(JSON.stringify(settledSwaps, null, 2));
