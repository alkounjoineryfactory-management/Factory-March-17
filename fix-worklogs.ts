import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
    // Find all WorkLogs where hoursSpent != jobCard.actualHrs
    const logs = await prisma.workLog.findMany({
        include: { jobCard: true }
    });
    
    let fixedCount = 0;
    
    for (const log of logs) {
        if (log.jobCard && log.hoursSpent !== log.jobCard.actualHrs) {
            console.log(`Fixing Log ${log.id}: ${log.hoursSpent} -> ${log.jobCard.actualHrs}`);
            await prisma.workLog.update({
                where: { id: log.id },
                data: { hoursSpent: log.jobCard.actualHrs }
            });
            fixedCount++;
        }
        
        // Also if outputQty is mismatched, sync it up if actualQty exists
        if (log.jobCard && log.outputQty !== log.jobCard.actualQty && log.jobCard.actualQty > 0) {
            await prisma.workLog.update({
                where: { id: log.id },
                data: { outputQty: log.jobCard.actualQty }
            });
        }
    }
    
    console.log(`Successfully synced ${fixedCount} WorkLogs with their JobCards.`);
}

run().catch(console.error).finally(() => process.exit(0));
