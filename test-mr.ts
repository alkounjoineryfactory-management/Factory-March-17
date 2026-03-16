import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const requisitions = await prisma.materialRequisition.findMany({
            include: {
                requester: true,
                project: true,
                items: true,
                quotations: {
                    include: {
                        vendor: true,
                        items: {
                            include: {
                                materialRequisitionItem: true
                            }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' },
        });
    console.log("Success:", requisitions.length);
  } catch(e) {
    console.error("Error:", e);
  }
}
main()
