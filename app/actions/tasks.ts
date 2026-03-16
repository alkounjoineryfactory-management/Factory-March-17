"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "../actions";

export async function getMyAssignedTasks() {
    try {
        const user = await getCurrentAdmin();
        if (!user) {
            return {
                daily: [],
                weekly: [],
                monthly: []
            };
        }

        const now = new Date();

        // Boundaries for Today
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);

        // Boundaries for Current Week (Mon-Sun roughly)
        const day = now.getDay();
        const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Boundaries for Current Month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        // Fetch Weekly Phase Tasks assigned to this user
        // We grep match the name or username because `assignedTo` is a comma separated string
        const allWeeklyTasks = await prisma.weeklyTask.findMany({
            where: {
                assignedTo: { contains: user.username }
            },
            include: {
                weeklyPlan: {
                    include: {
                        project: { select: { name: true, projectNumber: true } }
                    }
                },
                section: { select: { name: true } },
                jobCards: {
                    include: {
                        employee: true,
                        machine: true,
                        project: { select: { name: true, projectNumber: true } },
                        section: { select: { name: true } }
                    },
                    orderBy: {
                        day: 'asc'
                    }
                }
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        // Fetch Daily Job Cards assigned to this user
        const allDailyJobs = await prisma.jobCard.findMany({
            where: {
                OR: [
                    { assignedTo: { contains: user.username } }
                ]
            },
            include: {
                project: { select: { name: true, projectNumber: true } },
                section: { select: { name: true } },
                employee: true,
                machine: true
            },
            orderBy: {
                day: 'asc'
            }
        });

        // Bin the tasks into Daily, Weekly, Monthly

        // Filter out jobs that already belong to an assigned phase task
        const assignedTaskIds = new Set(allWeeklyTasks.map(t => t.id));
        const standaloneJobs = allDailyJobs.filter(j => !j.weeklyTaskId || !assignedTaskIds.has(j.weeklyTaskId));

        // 1. Daily: Standalone JobCards where day is today
        const dailyJobs = standaloneJobs.filter(j => j.day >= startOfToday && j.day <= endOfToday);

        // 2. Weekly: We want WeeklyTasks that fall in this week OR standalone JobCards that fall in this week
        const weeklyPhaseTasks = allWeeklyTasks.filter(t => {
            if (t.startDate && t.endDate) {
                return t.startDate <= endOfWeek && t.endDate >= startOfWeek;
            }
            return t.status !== "COMPLETED";
        });
        const weeklyJobs = standaloneJobs.filter(j => j.day >= startOfWeek && j.day <= endOfWeek);

        // 3. Monthly: Everything in this month
        const monthlyPhaseTasks = allWeeklyTasks.filter(t => {
            if (t.startDate && t.endDate) {
                return t.startDate <= endOfMonth && t.endDate >= startOfMonth;
            }
            return t.status !== "COMPLETED";
        });
        const monthlyJobs = standaloneJobs.filter(j => j.day >= startOfMonth && j.day <= endOfMonth);

        return {
            daily: {
                jobs: dailyJobs
            },
            weekly: {
                tasks: weeklyPhaseTasks,
                jobs: weeklyJobs
            },
            monthly: {
                tasks: monthlyPhaseTasks,
                jobs: monthlyJobs
            }
        };

    } catch (error) {
        console.error("Failed to fetch assigned tasks:", error);
        throw new Error("Failed to load tasks");
    }
}
