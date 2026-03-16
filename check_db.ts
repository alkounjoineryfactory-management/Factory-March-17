import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.systemSettings.findFirst().then(console.log).finally(() => prisma.$disconnect());
