import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const items = await prisma.storeItem.findMany();
  
  const projectPOs = await prisma.purchaseOrder.findMany({
    where: {
        projectId: { not: null },
        status: { in: ['DELIVERED_FULL', 'DELIVERED_PARTIAL', 'PAID'] }
    },
    include: { items: true }
  });

  const transfers = await prisma.storeTransaction.findMany({
      where: {
          type: { in: ['TRANSFER_TO_PROJECT', 'TRANSFER_TO_GENERAL'] }
      }
  });

  const poStockMap: Record<string, number> = {};

  items.forEach(item => {
      let poStock = 0;
      projectPOs.forEach(po => {
          po.items.forEach(poItem => {
              const codeLower = item.itemCode?.trim().toLowerCase();
              const nameLower = item.name?.trim().toLowerCase();
              const poCodeLower = poItem.itemCode?.trim().toLowerCase();
              const poDescLower = poItem.itemDescription?.trim().toLowerCase();

              if (
                  (codeLower && poCodeLower && codeLower === poCodeLower) ||
                  (nameLower && poDescLower && nameLower === poDescLower) ||
                  (codeLower && poDescLower && codeLower === poDescLower) ||
                  (nameLower && poCodeLower && nameLower === poCodeLower)
              ) {
                  poStock += poItem.quantity;
              }
          });
      });
      poStockMap[item.id] = poStock;
  });

  console.log("\n--- SIMULATION LOGIC ---");
  for (const item of items) {
      if (item.currentStock > 0 || poStockMap[item.id] > 0) {
        
        // Let's assume 'currentStock' is exactly what is physically on the General shelf currently.
        // It does NOT include historical Project quantities unless they were manually transferred in.
        const generalPhysical = item.currentStock;
        
        // Let's assume 'Project Stock' is the sum of all historical Project POs PLUS manual transfers TO project MINUS transfers FROM project
        let explicitlyTransferredToProject = 0;
        
        transfers.forEach(tx => {
            if (tx.storeItemId === item.id) {
                if (tx.type === 'TRANSFER_TO_PROJECT') {
                    explicitlyTransferredToProject += tx.quantity;
                } else if (tx.type === 'TRANSFER_TO_GENERAL') {
                    explicitlyTransferredToProject -= tx.quantity;
                }
            }
        });

        // The user says: "actual project stock is 7 and general stock is 1"
        // This implies the LPO data (7) is pure project stock, 
        // and the current stock (1) is pure general stock. 
        // They are separate physical buckets entirely.
        
        const trueProjectStock = (poStockMap[item.id] || 0) + explicitlyTransferredToProject;
        const trueGeneralStock = item.currentStock - explicitlyTransferredToProject; // Since they pull from the general DB currentStock 
        
        console.log(`\nItem: ${item.itemCode} - ${item.name}`);
        console.log(`  DB currentStock (Raw): ${item.currentStock}`);
        console.log(`  Historic Project PO Quantities: ${poStockMap[item.id] || 0}`);
        console.log(`  Net Manual Transfers to Project: ${explicitlyTransferredToProject}`);
        console.log(`-----------------------------------`);
        console.log(`  CALCULATED PROJECT STOCK: ${trueProjectStock}`);
        console.log(`  CALCULATED GENERAL STOCK: ${Math.max(0, trueGeneralStock)}`);
      }
  }

}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
