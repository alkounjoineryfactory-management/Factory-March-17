import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixInventory() {
    try {
        const pos = await prisma.purchaseOrder.findMany({
            where: { status: { in: ['DELIVERED_FULL', 'DELIVERED_PARTIAL'] } },
            include: { items: true }
        });

        const storeItems = await prisma.storeItem.findMany();
        const storeMapByCode = new Map();
        const storeMapByName = new Map();

        storeItems.forEach(si => {
            if (si.itemCode) storeMapByCode.set(si.itemCode.trim().toLowerCase(), si);
            if (si.name) storeMapByName.set(si.name.trim().toLowerCase(), si);
        });

        let fixedCount = 0;

        for (const po of pos) {
            // See if there's already a transaction for this LPO
            const existingTx = await prisma.storeTransaction.findFirst({
                where: { reference: { contains: po.poNumber } }
            });

            if (!existingTx) {
                console.log('Fixing PO inventory missing for:', po.poNumber);
                let updated = false;
                for (const rItem of po.items) {
                    let targetStoreItem = null;
                    if (rItem.itemCode) {
                        targetStoreItem = storeMapByCode.get(rItem.itemCode.trim().toLowerCase());
                    }

                    if (!targetStoreItem && rItem.itemDescription) {
                        targetStoreItem = storeMapByName.get(rItem.itemDescription.trim().toLowerCase());
                    }

                    if (targetStoreItem && rItem.quantity > 0) {
                        const newStock = targetStoreItem.currentStock + rItem.quantity;
                        console.log(`  Updating ${targetStoreItem.name} stock: ${targetStoreItem.currentStock} -> ${newStock}`);

                        await prisma.storeItem.update({
                            where: { id: targetStoreItem.id },
                            data: { currentStock: newStock }
                        });

                        await prisma.storeTransaction.create({
                            data: {
                                storeItemId: targetStoreItem.id,
                                type: 'IN',
                                quantity: rItem.quantity,
                                reference: `GRN for LPO: ${po.poNumber} (Retroactive Backup Sync)`
                            }
                        });

                        // Local cache update to prevent double-counting if same item is in another PO in loop
                        targetStoreItem.currentStock = newStock;
                        updated = true;
                    }
                }
                if (updated) fixedCount++;
            }
        }
        console.log('Fixed', fixedCount, 'POs that missed inventory updates.');
    } catch (e) {
        console.error("Error during backward fix:", e);
    } finally {
        await prisma.$disconnect();
    }
}

fixInventory();
