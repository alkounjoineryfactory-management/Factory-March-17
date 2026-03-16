import { prisma } from "./lib/prisma";

async function main() {
    const items = await prisma.storeItem.findMany({
        take: 3,
        select: {
            itemCode: true,
            name: true,
            projectStocks: true
        }
    });
    console.dir(items, { depth: null });
}
main()
