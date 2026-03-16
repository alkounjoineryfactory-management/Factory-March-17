import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Starting Migration...");
    
    // Fetch all store items and their transactions
    const items = await prisma.storeItem.findMany();
    
    const projectPOsRaw = await prisma.purchaseOrder.findMany({
        where: { projectId: { not: null } },
        include: { items: true }
    });
    
    const deliveredProjectPOs = projectPOsRaw.filter(po => 
        ['DELIVERED_FULL', 'DELIVERED_PARTIAL', 'PAID'].includes(po.status)
    );
    const projectPONumbers = new Set(projectPOsRaw.map(po => po.poNumber));
    
    const transactions = await prisma.storeTransaction.findMany({
        where: {
            OR: [
                { type: { in: ['TRANSFER_TO_PROJECT', 'TRANSFER_TO_GENERAL'] } },
                { type: 'IN', reference: { startsWith: 'GRN for LPO:' } }
            ]
        }
    });

    for (const item of items) {
        let poStockForProject = 0;
        let netTransfersToProject = 0;
        let grnsForProject = 0;

        const codeLower = item.itemCode?.trim().toLowerCase();
        const nameLower = item.name?.trim().toLowerCase();
        
        // Track project specific quantities
        const projectQuantities = new Map<string, number>();

        // 1. Calculate stock that arrived specifically for this project
        deliveredProjectPOs.forEach(po => {
            if(!po.projectId) return;
            po.items.forEach(poItem => {
                const poCodeLower = poItem.itemCode?.trim().toLowerCase();
                const poDescLower = poItem.itemDescription?.trim().toLowerCase();

                if (
                    (codeLower && poCodeLower && codeLower === poCodeLower) ||
                    (nameLower && poDescLower && nameLower === poDescLower) ||
                    (codeLower && poDescLower && codeLower === poDescLower) ||
                    (nameLower && poCodeLower && nameLower === poCodeLower)
                ) {
                    poStockForProject += poItem.quantity;
                    const currentProjQty = projectQuantities.get(po.projectId) || 0;
                    projectQuantities.set(po.projectId, currentProjQty + poItem.quantity);
                }
            });
        });

        // 2. Tally manual shifts and identify Project GRNs
        transactions.forEach(tx => {
            if (tx.storeItemId === item.id) {
                if (tx.type === 'TRANSFER_TO_PROJECT' && tx.projectId) {
                    netTransfersToProject += tx.quantity; 
                    const currentProjQty = projectQuantities.get(tx.projectId) || 0;
                    projectQuantities.set(tx.projectId, currentProjQty + tx.quantity);
                    
                } else if (tx.type === 'TRANSFER_TO_GENERAL' && tx.projectId) {
                    netTransfersToProject -= tx.quantity; 
                    const currentProjQty = projectQuantities.get(tx.projectId) || 0;
                    projectQuantities.set(tx.projectId, currentProjQty - tx.quantity);
                    
                } else if (tx.type === 'IN' && tx.reference) {
                    const refPoNumber = tx.reference.replace('GRN for LPO:', '').trim();
                    if (projectPONumbers.has(refPoNumber)) {
                        grnsForProject += tx.quantity;
                    }
                }
            }
        });
        
        // Final values for this item
        const generalStock = Math.max(0, item.currentStock - netTransfersToProject - grnsForProject);
        
        console.log(`\nItem: ${item.name}`);
        console.log(`-> Calculating General Stock: ${item.currentStock} - ${netTransfersToProject} (Transfers) - ${grnsForProject} (GRNs) = ${generalStock}`);
        
        // OVERWRITE StoreItem.currentStock
        await prisma.storeItem.update({
            where: { id: item.id },
            data: { currentStock: generalStock }
        });
        
        // CREATE ProjectStock rows
        for (const [projectId, qty] of projectQuantities.entries()) {
            if (qty > 0) {
                console.log(`-> Locking ${qty} to Project: ${projectId}`);
                await prisma.projectStock.upsert({
                    where: {
                        storeItemId_projectId: {
                            storeItemId: item.id,
                            projectId: projectId
                        }
                    },
                    update: { quantity: qty },
                    create: {
                        storeItemId: item.id,
                        projectId: projectId,
                        quantity: qty
                    }
                });
            }
        }
    }
    
    console.log("\nMigration Complete.");
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
