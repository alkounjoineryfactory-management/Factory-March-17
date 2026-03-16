import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting backfill...");
    const employees = await prisma.employee.findMany();

    for (const emp of employees) {
        if (emp.username) continue; // Skip if already set

        // Generate unique-ish username
        const username = emp.name.toLowerCase().replace(/\s+/g, '') + "_" + emp.id.substring(0, 4);

        await prisma.employee.update({
            where: { id: emp.id },
            data: {
                username: username,
                password: "1234" // Default password
            }
        });
        console.log(`Updated ${emp.name} -> ${username}`);
    }
    console.log("Backfill complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
