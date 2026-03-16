import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
    const settings = await prisma.systemSettings.findUnique({
        where: { id: "default" }
    });

    console.log("Settings standard hours:");
    console.log(`Sun(0): ${settings?.workHoursSunday}`);
    console.log(`Mon(1): ${settings?.workHoursMonday}`);
    console.log(`Tue(2): ${settings?.workHoursTuesday}`);
    console.log(`Wed(3): ${settings?.workHoursWednesday}`);
    console.log(`Thu(4): ${settings?.workHoursThursday}`);
    console.log(`Fri(5): ${settings?.workHoursFriday}`);
    console.log(`Sat(6): ${settings?.workHoursSaturday}`);
}

run().catch(console.error).finally(() => process.exit(0));
