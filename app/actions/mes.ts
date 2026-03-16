"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { markAttendance } from "./hr";

export async function getMesScheduleData(dateStr: string) {
    // Determine the week number roughly based on the date
    const targetDate = new Date(dateStr);
    const startOfYear = new Date(targetDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (targetDate.getTime() - startOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

    // Fetch projects with their specific jobCards for the day, and weeklyTasks for the week
    const projects = await prisma.project.findMany({
        orderBy: { name: 'asc' },
        include: {
            jobCards: {
                where: {
                    day: {
                        gte: new Date(`${dateStr}T00:00:00.000Z`),
                        lt: new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000)
                    }
                },
                include: {
                    section: true,
                    machine: { include: { subSection: true } },
                    employee: { include: { subSection: true } },
                    weeklyPlan: { select: { weekNumber: true } }
                },
                orderBy: { startTime: 'asc' }
            },
            weeklyPlans: {
                include: {
                    tasks: {
                        include: {
                            section: true,
                            subSection: true,
                            jobCards: {
                                select: { status: true }
                            }
                        }
                    }
                },
                orderBy: { weekNumber: 'asc' }
            },
            productionOrders: {
                include: {
                    items: {
                        select: { itemCode: true, itemDescription: true, boqRef: true, qty: true, unit: true, carpentryLabourHrs: true, polishLabourHrs: true }
                    }
                }
            }
        }
    });

    // Sort projects so that COMPLETED/FINISHED projects are at the bottom
    const sortedProjects = projects.sort((a, b) => {
        const isAFinished = a.status === 'COMPLETED' || a.status === 'FINISHED';
        const isBFinished = b.status === 'COMPLETED' || b.status === 'FINISHED';

        if (isAFinished && !isBFinished) return 1;
        if (!isAFinished && isBFinished) return -1;
        return 0; // maintain alphabetical order from Prisma
    });

    const targetDateStart = new Date(`${dateStr}T00:00:00.000Z`);
    const targetDateEnd = new Date(targetDateStart.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);

    // Get leaves specifically for the viewing day (for top level schedule view constraints if needed)
    const leavesForDay = await prisma.leaveRequest.findMany({
        where: {
            status: "APPROVED",
            startDate: { lte: targetDateEnd },
            endDate: { gte: targetDateStart }
        },
        select: { employeeId: true }
    });
    const employeesOnLeave = leavesForDay.map(l => l.employeeId);

    // Get ALL approved leaves (or a reasonable window) so the client can dynamically check if a user manually changes the Create Job Card date.
    // We'll fetch leaves from 1 month ago to 3 months in the future.
    const monthAgo = new Date(targetDateStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    const future = new Date(targetDateStart.getTime() + 90 * 24 * 60 * 60 * 1000);
    const allApprovedLeaves = await prisma.leaveRequest.findMany({
        where: {
            status: "APPROVED",
            startDate: { lte: future },
            endDate: { gte: monthAgo }
        },
        select: { employeeId: true, startDate: true, endDate: true }
    });

    const allApprovedMaintenances = await prisma.machineMaintenance.findMany({
        where: {
            status: "APPROVED",
            startDate: { lte: future },
            endDate: { gte: monthAgo }
        },
        select: { machineId: true, startDate: true, endDate: true }
    });

    return { projects: sortedProjects, weekNum, employeesOnLeave, allApprovedLeaves, allApprovedMaintenances };
}

export async function createMesWeeklyTask(formData: FormData) {
    const projectId = formData.get("projectId") as string;
    const sectionId = formData.get("sectionId") as string;
    const subSectionId = formData.get("subSectionId") as string;
    const weekNumber = parseInt(formData.get("weekNumber") as string);
    const description = formData.get("description") as string;
    const assignedTo = formData.get("assignedTo") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;

    // Find or create weekly plan
    let plan = await prisma.weeklyPlan.findFirst({
        where: { projectId, weekNumber }
    });

    if (!plan) {
        plan = await prisma.weeklyPlan.create({
            data: {
                projectId,
                weekNumber,
                title: `Week ${weekNumber}`,
                status: "PENDING"
            }
        });
    }

    // Bug 11 fix: read targetQty from form rather than hardcoding 1
    const targetQtyRaw = formData.get("targetQty") as string;
    const targetQty = (targetQtyRaw && !isNaN(parseInt(targetQtyRaw))) ? parseInt(targetQtyRaw) : 1;

    await prisma.weeklyTask.create({
        data: {
            weeklyPlanId: plan.id,
            description,
            targetQty,
            assignedTo: assignedTo || null,
            startDate: startDateStr ? new Date(`${startDateStr}T12:00:00Z`) : null,
            endDate: endDateStr ? new Date(`${endDateStr}T12:00:00Z`) : null,
            sectionId: sectionId !== "none" ? sectionId : null,
            subSectionId: subSectionId && subSectionId !== "none" ? subSectionId : null,
            status: "PENDING"
        }
    });

    revalidatePath("/admin/schedule");
}

export async function createMesDailyJob(formData: FormData) {
    const projectId = formData.get("projectId") as string;
    const sectionId = formData.get("sectionId") as string;
    const dayStr = formData.get("day") as string;
    const description = formData.get("description") as string;

    const machineIdsStr = formData.get("machineIds") as string;
    const employeeIdsStr = formData.get("employeeIds") as string;

    const machArr = machineIdsStr ? machineIdsStr.split(",") : [];
    const empArr = employeeIdsStr ? employeeIdsStr.split(",") : [];

    const itemCode = formData.get("itemCode") as string;
    const budgetedLabourHrs = parseFloat(formData.get("budgetedLabourHrs") as string) || 0;
    const budgetedMaterialList = formData.get("budgetedMaterialList") as string;
    const assignToIncharge = formData.get("assignToIncharge") as string;

    const targetHours = parseFloat(formData.get("targetHours") as string) || 0;
    const targetQty = parseInt(formData.get("targetQty") as string) || 1;
    const unit = formData.get("unit") as string || "pcs";

    const weeklyTaskId = formData.get("weeklyTaskId") as string;
    const assignedTo = formData.get("assignedTo") as string;
    const extraDetails = formData.get("extraDetails") as string;

    const numJobs = Math.max(1, machArr.length, empArr.length);
    const jobsToCreate = [];

    for (let i = 0; i < numJobs; i++) {
        const mId = machArr[i] || machArr[0] || null;
        const eId = empArr[i] || empArr[0] || null;

        jobsToCreate.push({
            projectId,
            sectionId,
            description,
            day: new Date(`${dayStr}T12:00:00Z`), // noon to prevent timezone shifts
            targetDate: new Date(`${dayStr}T12:00:00Z`), // fallback for legacy
            machineId: mId !== "none" ? mId : null,
            employeeId: eId !== "none" ? eId : null,
            itemCode,
            budgetedLabourHrs,
            budgetedMaterialList,
            assignToIncharge,
            targetHours,
            targetQty,
            unit,
            status: "PENDING",
            weeklyTaskId: weeklyTaskId && weeklyTaskId !== "none" ? weeklyTaskId : null,
            assignedTo: assignedTo || null,
            extraDetails: extraDetails || null
        });
    }

    await prisma.jobCard.createMany({
        data: jobsToCreate
    });

    revalidatePath("/admin/schedule");
}

export async function updateMesJobCardDetails(id: string, formData: FormData) {
    const sectionId = formData.get("sectionId") as string;
    const dayStr = formData.get("day") as string;
    const description = formData.get("description") as string;

    // In edit mode, we only support a single machine/employee selection
    const machineId = formData.get("machineId") as string;
    const employeeId = formData.get("employeeId") as string;

    const itemCode = formData.get("itemCode") as string;
    const budgetedLabourHrs = parseFloat(formData.get("budgetedLabourHrs") as string) || 0;
    const budgetedMaterialList = formData.get("budgetedMaterialList") as string;

    const targetQty = parseInt(formData.get("targetQty") as string) || 1;
    const unit = formData.get("unit") as string || "pcs";

    const weeklyTaskId = formData.get("weeklyTaskId") as string;
    const assignedTo = formData.get("assignedTo") as string;
    const extraDetails = formData.get("extraDetails") as string;

    await prisma.jobCard.update({
        where: { id },
        data: {
            // sectionId is required in DB schema
            sectionId: sectionId && sectionId !== "none" ? sectionId : undefined,
            description: description || undefined,
            day: dayStr ? new Date(`${dayStr}T12:00:00Z`) : undefined,
            targetDate: dayStr ? new Date(`${dayStr}T12:00:00Z`) : undefined,
            machineId: machineId && machineId !== "none" ? machineId : null,
            employeeId: employeeId && employeeId !== "none" ? employeeId : null,
            itemCode: itemCode && itemCode !== "none" ? itemCode : null,
            budgetedLabourHrs,
            budgetedMaterialList: budgetedMaterialList || null,
            targetQty,
            unit,
            weeklyTaskId: weeklyTaskId && weeklyTaskId !== "none" ? weeklyTaskId : null,
            assignedTo: assignedTo || null,
            extraDetails: extraDetails || null
        }
    });

    revalidatePath("/admin/schedule");
}

export async function updateMesJobCardField(jobCardId: string, field: string, value: any) {
    const data: any = {};
    data[field] = value;

    // If we are updating start or end time, recalculate actualHrs
    if (field === 'startTime' || field === 'endTime') {
        const job = await prisma.jobCard.findUnique({ where: { id: jobCardId } });
        if (job) {
            let st = field === 'startTime' ? new Date(value) : job.startTime;
            let et = field === 'endTime' ? new Date(value) : job.endTime;

            if (st && et) {
                const diffMs = et.getTime() - st.getTime();
                const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60)); // Ensure non-negative
                data['actualHrs'] = diffHrs;
                
                // If both start and end time are provided, automatically mark as COMPLETED
                if (job.status !== 'COMPLETED') {
                    data['status'] = 'COMPLETED';
                    data['completedAt'] = et;
                    data['isFinished'] = true;
                    if (!job.actualQty) data['actualQty'] = job.targetQty || 1;
                }
            }
        }
    }

    const updatedJob = await prisma.jobCard.update({
        where: { id: jobCardId },
        data
    });

    // If actual hours were updated and a WorkLog exists, sync it
    if (data['actualHrs'] !== undefined) {
        await prisma.workLog.updateMany({
            where: { jobCardId },
            data: { hoursSpent: data['actualHrs'] }
        });
    }

    revalidatePath("/admin/schedule");
}

export async function markMesWeeklyTaskComplete(id: string) {
    await prisma.weeklyTask.update({
        where: { id },
        data: { status: 'COMPLETED' }
    });
    revalidatePath('/admin/schedule');
}

export async function deleteMesJobCard(id: string) {
    // Delete associated work logs first to prevent foreign key constraints
    await prisma.workLog.deleteMany({ where: { jobCardId: id } });

    // Now delete the job card
    await prisma.jobCard.delete({ where: { id } });

    revalidatePath('/admin/schedule');
}

export async function deleteMesWeeklyTask(id: string) {
    // Disconnect job cards linked to this weekly task
    await prisma.jobCard.updateMany({
        where: { weeklyTaskId: id },
        data: { weeklyTaskId: null }
    });

    // Now delete the task
    await prisma.weeklyTask.delete({ where: { id } });

    revalidatePath('/admin/schedule');
}

export async function getWeeklyJobCards(dateStr: string) {
    const targetDate = new Date(dateStr);

    // JS dates, get Day: 0 (Sun) - 6 (Sat)
    // Find previous Monday (or current if Mon)
    const day = targetDate.getDay();
    const diffToMonday = targetDate.getDate() - day + (day === 0 ? -6 : 1);

    const startOfWeek = new Date(targetDate.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return await prisma.jobCard.findMany({
        where: {
            day: {
                gte: startOfWeek,
                lte: endOfWeek
            }
        },
        include: {
            project: { select: { name: true } },
            employee: true,
            section: true,
            machine: true
        },
        orderBy: { day: 'asc' }
    });
}

export async function completeMesJobCard(id: string) {
    const job = await prisma.jobCard.findUnique({ where: { id } });
    if (!job || job.status === 'COMPLETED') return; // Prevent duplicate completion

    let actualHrs = job.actualHrs;
    const endTime = job.endTime || new Date(); // Use existing end time if provided, otherwise default to now
    const startTimeToUse = job.startTime || new Date(endTime.getTime() - 8 * 3600000); // default to 8 hours prior

    if (job.startTime) {
        const diffMs = endTime.getTime() - job.startTime.getTime();
        actualHrs = Math.max(0, diffMs / (1000 * 60 * 60));
    }

    // Bug 10 fix: use null-coalescing so actualQty=0 (no output) is preserved, not overridden by targetQty
    const qtyToDeduct = job.actualQty != null ? job.actualQty : (job.targetQty ?? 1);

    await prisma.$transaction(async (tx) => {
        await tx.jobCard.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                endTime,
                actualHrs,
                actualQty: qtyToDeduct, // Set actualQty to targetQty if missing upon completion
                completedAt: endTime,
                isFinished: true
            }
        });

        // Deduct inventory if itemCode matches a StoreItem
        if (job.itemCode) {
            const storeItem = await tx.storeItem.findFirst({
                where: { itemCode: job.itemCode }
            });

            if (storeItem) {
                await tx.storeTransaction.create({
                    data: {
                        storeItemId: storeItem.id,
                        type: "OUT",
                        quantity: qtyToDeduct,
                        reference: `Job Completion REF-${job.id.slice(-6).toUpperCase()}`
                    }
                });

                await tx.storeItem.update({
                    where: { id: storeItem.id },
                    data: { currentStock: { decrement: qtyToDeduct } }
                });
            }
        }

        // Create WorkLog for HR Analytics
        if (job.employeeId) {
            await tx.workLog.create({
                data: {
                    jobCardId: id,
                    employeeId: job.employeeId,
                    hoursSpent: actualHrs,
                    outputQty: qtyToDeduct,
                    date: endTime
                }
            });
        }
    });

    if (job.employeeId) {
        await markAttendance({
            employeeId: job.employeeId,
            date: endTime,
            status: "PRESENT",
            checkIn: startTimeToUse,
            checkOut: endTime
        });
    }

    revalidatePath("/admin/schedule");
}

export async function bulkCompleteMesJobCards(updates: { id: string, startTime: string | null, endTime: string | null, actualQty: number, remarks: string, status: string }[]) {
    const jobIds = updates.map(u => u.id);
    const jobs = await prisma.jobCard.findMany({ where: { id: { in: jobIds } } });
    const jobMap = new Map(jobs.map(j => [j.id, j]));

    const usersToMarkAttendance = new Map<string, { date: Date, checkIn: Date, checkOut: Date }>();

    await prisma.$transaction(async (tx) => {
        for (const update of updates) {
            const job = jobMap.get(update.id);
            if (!job) continue;

            let actualHrs = 0;
            const startTimeToUse = update.startTime ? new Date(update.startTime) : job.startTime;
            const endTimeToUse = update.endTime ? new Date(update.endTime) : (job.endTime || new Date()); // Preserve job.endTime if no update sent

            if (startTimeToUse && endTimeToUse) {
                const diffMs = endTimeToUse.getTime() - new Date(startTimeToUse).getTime();
                actualHrs = Math.max(0, diffMs / (1000 * 60 * 60));
            }

            const wasNotCompleted = job.status !== 'COMPLETED';
            const isNowCompleted = update.status === 'COMPLETED';
            // Bug 10 fix: actualQty may be legitimately 0 (zero output) — use null-coalescing not ||.
            const qtyToDeduct = update.actualQty != null ? update.actualQty : (job.targetQty ?? 1);

            await tx.jobCard.update({
                where: { id: update.id },
                data: {
                    status: update.status, 
                    startTime: update.startTime ? new Date(update.startTime) : undefined,
                    endTime: update.endTime ? new Date(update.endTime) : undefined,
                    actualQty: update.actualQty,
                    actualHrs: actualHrs > 0 ? actualHrs : undefined,
                    remarks: update.remarks,
                    completedAt: isNowCompleted && wasNotCompleted ? endTimeToUse : job.completedAt,
                    isFinished: isNowCompleted ? true : job.isFinished
                }
            });

            // If job transitioned to COMPLETED
            if (isNowCompleted && wasNotCompleted) {
                // Deduct inventory
                if (job.itemCode) {
                    const storeItem = await tx.storeItem.findFirst({
                        where: { itemCode: job.itemCode }
                    });

                    if (storeItem) {
                        await tx.storeTransaction.create({
                            data: {
                                storeItemId: storeItem.id,
                                type: "OUT",
                                quantity: qtyToDeduct,
                                reference: `Job Completion REF-${job.id.slice(-6).toUpperCase()}`
                            }
                        });

                        await tx.storeItem.update({
                            where: { id: storeItem.id },
                            data: { currentStock: { decrement: qtyToDeduct } }
                        });
                    }
                }

                // Create WorkLog
                if (job.employeeId) {
                    await tx.workLog.create({
                        data: {
                            jobCardId: job.id,
                            employeeId: job.employeeId,
                            hoursSpent: actualHrs,
                            outputQty: qtyToDeduct,
                            date: endTimeToUse
                        }
                    });

                    usersToMarkAttendance.set(job.employeeId, {
                        date: endTimeToUse,
                        checkIn: startTimeToUse || new Date(endTimeToUse.getTime() - 8 * 3600000),
                        checkOut: endTimeToUse
                    });
                }
            }
        }
    });

    for (const [employeeId, att] of Array.from(usersToMarkAttendance.entries())) {
        await markAttendance({
            employeeId,
            date: att.date,
            status: "PRESENT",
            checkIn: att.checkIn,
            checkOut: att.checkOut
        });
    }

    revalidatePath("/admin/schedule");
}

export async function getResourceActivity(resourceId: string, resourceType: "EMPLOYEE" | "MACHINE" | "STAFF") {
    try {
        let jobCards: any[] = [];

        if (resourceType === "STAFF") {
            const user = await prisma.user.findUnique({ where: { id: resourceId } });
            if (user) {
                jobCards = await prisma.jobCard.findMany({
                    where: {
                        OR: [
                            { assignedTo: { contains: user.username } },
                            { assignedTo: { contains: user.name || "NON_EXISTENT_NAME" } }
                        ]
                    },
                    include: {
                        project: { select: { name: true, projectNumber: true } },
                        section: { select: { name: true } },
                        weeklyPlan: { select: { weekNumber: true, title: true } }
                    },
                    orderBy: { day: 'desc' }
                });
            }
        } else {
            jobCards = await prisma.jobCard.findMany({
                where: resourceType === "EMPLOYEE"
                    ? { employeeId: resourceId }
                    : { machineId: resourceId },
                include: {
                    project: { select: { name: true, projectNumber: true } },
                    section: { select: { name: true } },
                    weeklyPlan: { select: { weekNumber: true, title: true } }
                },
                orderBy: { day: 'desc' }
            });
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const active = jobCards.filter(j => j.status !== 'COMPLETED' && new Date(j.day) >= startOfToday && new Date(j.day) <= now);
        const upcoming = jobCards.filter(j => j.status === 'PENDING' && new Date(j.day) > now);
        const overdue = jobCards.filter(j => j.status !== 'COMPLETED' && new Date(j.day) < startOfToday);
        const history = jobCards.filter(j => j.status === 'COMPLETED');

        // Calculate a basic efficiency or stats if needed
        const totalCompletedHours = history.reduce((sum, j) => sum + (j.actualHrs || 0), 0);
        const totalAssignedHours = jobCards.reduce((sum, j) => sum + (j.targetHours || 0), 0);

        return {
            active,
            upcoming,
            overdue,
            history,
            stats: {
                totalCompletedHours,
                totalAssignedHours,
                jobsCompleted: history.length,
                jobsPending: active.length + upcoming.length + overdue.length
            }
        };
    } catch (error) {
        console.error("Failed to fetch resource activity:", error);
        throw new Error("Failed to fetch resource activity");
    }
}
