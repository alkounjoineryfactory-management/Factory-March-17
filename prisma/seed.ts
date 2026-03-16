
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // Cleanup
    await prisma.message.deleteMany()
    await prisma.jobCard.deleteMany()
    await prisma.employee.deleteMany()
    await prisma.machine.deleteMany()
    await prisma.section.deleteMany()
    await prisma.user.deleteMany()
    await prisma.systemSettings.deleteMany()

    // 1. Create Default Admin
    const admin = await prisma.user.create({
        data: {
            username: 'admin',
            password: 'admin', // In production, hash this!
            role: 'ADMIN',
        },
    })
    console.log('Created Admin:', admin.username)

    // 2. Create Sections
    const sections = await Promise.all([
        prisma.section.create({ data: { name: 'Cutting' } }),
        prisma.section.create({ data: { name: 'Assembly' } }),
        prisma.section.create({ data: { name: 'Polishing' } }),
    ])
    console.log('Created Sections')

    // 3. Create Machines
    await prisma.machine.create({ data: { name: 'Cutter A1', sectionId: sections[0].id, status: 'Active' } })
    await prisma.machine.create({ data: { name: 'Polisher P1', sectionId: sections[2].id, status: 'Active' } })
    console.log('Created Machines')

    // 4. Create Employees
    const emp1 = await prisma.employee.create({
        data: {
            name: 'John Worker',
            username: 'john',
            password: '123',
            role: 'Operator',
            sectionId: sections[0].id,
            phoneNumber: '+1234567890'
        }
    })
    const emp2 = await prisma.employee.create({
        data: {
            name: 'Jane Smith',
            username: 'jane',
            password: '123',
            role: 'Supervisor',
            sectionId: sections[1].id,
            phoneNumber: '+0987654321'
        }
    })
    console.log('Created Employees')

    // 5. Create System Settings
    await prisma.systemSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            factoryName: 'Factory Manager Beta',
        }
    })
    console.log('Created System Settings')

    // 6. Create some sample messages
    await prisma.message.create({
        data: {
            content: 'Hello Admin, reporting for duty.',
            senderType: 'EMPLOYEE',
            senderEmpId: emp1.id,
            receiverAdminId: admin.id,
            read: false
        }
    })

    console.log('Seeding finished.')
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
