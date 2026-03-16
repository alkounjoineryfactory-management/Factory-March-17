"use server";

import { prisma } from "@/lib/prisma";

// 1. KPI Dashboard Data
export async function getReportsDashboardData() {
    const totalActiveProjects = await prisma.project.count({
        where: { status: "ACTIVE" }
    });

    const totalProductionOrders = await prisma.productionOrder.count();

    const weeklyTasksPending = await prisma.weeklyTask.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } }
    });

    // Total labor hours logged today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const logsToday = await prisma.workLog.aggregate({
        _sum: { hoursSpent: true },
        where: {
            date: {
                gte: startOfToday,
                lte: endOfToday
            }
        }
    });

    return {
        totalActiveProjects,
        totalProductionOrders,
        weeklyTasksPending,
        laborHoursToday: logsToday._sum.hoursSpent || 0
    };
}

// 2. Projects Report Tab
export async function getProjectsReport() {
    return await prisma.project.findMany({
        orderBy: { startingDate: 'desc' },
        include: {
            jobCards: {
                select: { status: true }
            }
        }
    });
}

// 3. Production Orders Report Tab
export async function getProductionOrdersReport() {
    return await prisma.productionOrder.findMany({
        orderBy: { date: 'desc' },
        include: {
            project: { select: { name: true } },
            items: true
        }
    });
}

// 4. Weekly Tasks Report Tab
export async function getWeeklyTasksReport() {
    return await prisma.weeklyTask.findMany({
        orderBy: { startDate: 'desc' },
        include: {
            weeklyPlan: {
                include: {
                    project: { select: { name: true } }
                }
            },
            section: { select: { name: true } }
        }
    });
}

// 5. Daily Job Cards Report Tab
export async function getDailyJobCardsReport() {
    return await prisma.jobCard.findMany({
        orderBy: { day: 'desc' },
        include: {
            project: { select: { name: true } },
            employee: { select: { name: true } },
            machine: { select: { name: true } },
            section: { select: { name: true } }
        }
    });
}
