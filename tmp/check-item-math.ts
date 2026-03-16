import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const items = await prisma.storeItem.findMany({
    include: {
      transactions: {
        orderBy: { date: 'asc' }
      }
    }
  });

  const projectPOs = await prisma.purchaseOrder.findMany({
    where: {
        projectId: { not: null },
        status: { in: ['DELIVERED_FULL', 'DELIVERED_PARTIAL', 'PAID'] }
    },
    include: { items: true }
  });

  for (const item of items) {
    if (item.currentStock > 0) {
        console.log(`\n\n--- ITEM: ${item.itemCode} - ${item.name} ---`);
        console.log(`Reported Physical currentStock: ${item.currentStock}`);
        
        let calculatedProjectStock = 0;
        let poReceiptCount = 0;
        
        projectPOs.forEach(po => {
            po.items.forEach(poItem => {
                const poCodeLower = poItem.itemCode?.trim().toLowerCase();
                const poDescLower = poItem.itemDescription?.trim().toLowerCase();
                const codeLower = item.itemCode?.trim().toLowerCase();
                const nameLower = item.name?.trim().toLowerCase();

                if (
                    (codeLower && poCodeLower && codeLower === poCodeLower) ||
                    (nameLower && poDescLower && nameLower === poDescLower) ||
                    (codeLower && poDescLower && codeLower === poDescLower) ||
                    (nameLower && poCodeLower && nameLower === poCodeLower)
                ) {
                    calculatedProjectStock += poItem.quantity;
                    poReceiptCount += poItem.quantity;
                    console.log(`  [+] PO Match: ${po.poNumber} added +${poItem.quantity} (Total PO: ${poReceiptCount})`);
                }
            });
        });

        item.transactions.forEach(tx => {
            if (tx.type === 'TRANSFER_TO_PROJECT') {
                calculatedProjectStock += tx.quantity;
                console.log(`  [+] TRANSFER_TO_PROJECT: +${tx.quantity}`);
            } else if (tx.type === 'TRANSFER_TO_GENERAL') {
                calculatedProjectStock -= tx.quantity;
                console.log(`  [-] TRANSFER_TO_GENERAL: -${tx.quantity}`);
            }
        });

        console.log(`Raw Calculated Project Stock: ${calculatedProjectStock}`);
        console.log(`Capped Project Stock: ${Math.min(calculatedProjectStock, item.currentStock)}`);
        console.log(`Resulting General Stock: ${Math.max(0, item.currentStock - Math.min(calculatedProjectStock, item.currentStock))}`);

        console.log(`\nRaw Transactions Ledger for ${item.name}:`);
        item.transactions.forEach(tx => {
           console.log(`   ${tx.date.toISOString()} | ${tx.type.padEnd(20)} | Qty: ${tx.quantity} | Ref: ${tx.reference}`);
        });
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
