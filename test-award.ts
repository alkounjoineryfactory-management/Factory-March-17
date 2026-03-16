import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const po = await prisma.purchaseOrder.findFirst({
    where: { poNumber: "PO-5426" },
    include: { items: true }
  });
  console.dir(po, { depth: null });
  
  if (po?.mrId) {
     const quotes = await prisma.quotation.findMany({
       where: { mrId: po.mrId },
       include: { items: true, materialRequisition: { include: { items: true } } }
     });
     console.dir(quotes, { depth: null });
  }
}
main()
