import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const pos = await prisma.purchaseOrder.findMany({
    include: { items: true }
  });
  
  for (const po of pos) {
    if (po.mrId && po.items.some(i => i.unitPrice === 0)) {
        console.log(`Fixing PO ${po.poNumber}...`);
        // find the selected quote for this MR
        const quote = await prisma.quotation.findFirst({
            where: { mrId: po.mrId, isSelected: true },
            include: { items: { include: { materialRequisitionItem: true } } }
        });
        if (quote) {
            for (const poItem of po.items) {
                // find corresponding quote item by name or quantity
                const match = quote.items.find(qi => qi.materialRequisitionItem.itemDescription === poItem.itemDescription);
                if (match) {
                    await prisma.purchaseOrderItem.update({
                        where: { id: poItem.id },
                        data: {
                            unitPrice: match.unitPrice,
                            totalPrice: match.totalPrice
                        }
                    });
                    console.log(`Updated ${poItem.itemDescription}: ${match.unitPrice} * ${poItem.quantity} = ${match.totalPrice}`);
                }
            }
        }
    }
  }
}
main()
