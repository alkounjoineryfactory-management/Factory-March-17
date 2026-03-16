import { prisma } from "./lib/prisma";
import { getStoreItems } from "./app/actions/store";

async function main() {
    const res = await getStoreItems({ limit: 5 });
    if (res.items) {
        res.items.forEach((item: any) => {
            console.log(`\nItem: ${item.name} (${item.itemCode})`);
            console.log(`General Stock: ${item.currentStock}`);
            console.log(`Project Stock Calc: ${item.projectStock}`);
            console.log(`Total Physical: ${item.totalPhysicalStock}`);
        });
    }
}
main();
