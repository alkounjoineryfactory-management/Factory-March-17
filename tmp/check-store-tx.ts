import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const txs = await prisma.storeTransaction.findMany({
    where: { type: 'IN' },
    take: 10,
    orderBy: { date: 'desc' },
    include: {
        storeItem: true,
        project: true
    }
  })
  
  console.log("Recent IN Transactions:");
  console.dir(txs, { depth: null });

  const transfers = await prisma.storeTransaction.findMany({
    where: { type: { in: ['TRANSFER_TO_PROJECT', 'TRANSFER_TO_GENERAL'] } }
  })

  console.log("\nTransfers:");
  console.dir(transfers, { depth: null });

  const projectPOs = await prisma.purchaseOrder.findMany({
    where: { projectId: { not: null } },
    select: { poNumber: true }
  })
  
  console.log("\nProject PO Numbers:");
  console.log(projectPOs.map(po => po.poNumber));
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
