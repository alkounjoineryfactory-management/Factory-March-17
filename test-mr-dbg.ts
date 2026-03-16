import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const reqs = await prisma.materialRequisition.findMany({ select: { mrNumber: true, status: true, requester: { select: { name: true, username: true } }, project: { select: { name: true } } }});
  console.dir(reqs, { depth: null });
}
main()
