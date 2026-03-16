import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const sections = await prisma.section.findMany()
    const machines = await prisma.machine.findMany()
    const employees = await prisma.employee.findMany()

    console.log("Sections count:", sections.length)
    console.log("Machines count:", machines.length)
    console.log("Employees count:", employees.length)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
