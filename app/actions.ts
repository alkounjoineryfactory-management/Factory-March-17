"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { join } from "path";
import { stat, readdir } from "fs/promises";
import { markAttendance } from "@/app/actions/hr";

export async function createWeeklyPlan(formData: FormData) {
    const projectId = formData.get("projectId") as string;
    const weekNumberStr = formData.get("weekNumber") as string;
    const title = formData.get("title") as string;

    if (!projectId || !weekNumberStr) {
        throw new Error("Missing required fields");
    }

    await prisma.weeklyPlan.create({
        data: {
            projectId,
            weekNumber: parseInt(weekNumberStr),
            title: title || `Week ${weekNumberStr}`,
            status: "PENDING"
        }
    });

    revalidatePath("/admin");
}




export async function createJobCard(formData: FormData) {
    const projectId = formData.get("projectId") as string;
    let weeklyPlanId = formData.get("weeklyPlanId") as string;

    // Quick Assign Fields
    const weekNumberStr = formData.get("weekNumber") as string;
    const description = formData.get("description") as string;

    const sectionId = formData.get("sectionId") as string;
    const targetDateStr = formData.get("targetDate") as string;
    const targetHoursStr = formData.get("targetHours") as string;
    const targetQtyStr = formData.get("targetQty") as string;

    // Bulk Assignment Logic
    let employeeIds = formData.getAll("employeeIds") as string[];
    if (employeeIds.length === 0) {
        const singleEmp = formData.get("employeeId") as string;
        if (singleEmp && singleEmp !== "none") employeeIds.push(singleEmp);
    }

    let machineIds = formData.getAll("machineIds") as string[];
    if (machineIds.length === 0) {
        const singleMachine = formData.get("machineId") as string;
        if (singleMachine && singleMachine !== "none") machineIds.push(singleMachine);
    }

    if (!projectId || !description || !sectionId || !targetDateStr) {
        throw new Error("Missing required fields");
    }

    // Logic Update: Enforce Machine-Operator Link
    if (machineIds.length > 0 && employeeIds.length === 0) {
        throw new Error("Please select an Operator for the selected Machine(s).");
    }

    // FIX 1: Weekly Task Linking (If coming from Quick Assign)
    // If we have weekNumber but no explicit weeklyPlanId/weeklyTaskId, we need to resolve them
    let weeklyTaskId: string | undefined;

    if (weekNumberStr) {
        let weekNum: number;

        if (weekNumberStr === "new") {
            const maxWeek = await prisma.weeklyPlan.findFirst({
                where: { projectId },
                orderBy: { weekNumber: 'desc' }
            });
            weekNum = (maxWeek?.weekNumber || 0) + 1;
        } else {
            weekNum = parseInt(weekNumberStr);
        }

        if (!isNaN(weekNum)) {
            // 1. Find or Create Weekly Plan
            let plan = await prisma.weeklyPlan.findFirst({
                where: { projectId, weekNumber: weekNum }
            });

            if (!plan) {
                plan = await prisma.weeklyPlan.create({
                    data: {
                        projectId,
                        weekNumber: weekNum,
                        title: `Week ${weekNum}`,
                        status: "PENDING"
                    }
                });
            }
            weeklyPlanId = plan.id;

            // 2. Find or Create Weekly Task (Group by description)
            let wTask = await prisma.weeklyTask.findFirst({
                where: { weeklyPlanId: plan.id, description: description }
            });

            if (!wTask) {
                wTask = await prisma.weeklyTask.create({
                    data: {
                        weeklyPlanId: plan.id,
                        description: description,
                        targetQty: parseInt(targetQtyStr) || 1, // Initial guess
                        unit: "pcs"
                    }
                });
            }
            weeklyTaskId = wTask.id;
        }
    }


    // FIX 2: Date Timezone Issue
    // 'targetDateStr' is likely "YYYY-MM-DD". new Date("YYYY-MM-DD") is UTC.
    // When displayed in local browser (e.g. Asia/Qatar), UTC midnight might be "Previous Day".
    // We want the DATE part to be preserved exactly as claimed.
    // Best way: Append "T12:00:00" to force it to noon, avoiding midnight shifts.
    // Or just store it as is if it's already a full date object? 
    // Assuming string is "2024-02-14", new Date("2024-02-14") -> 2024-02-14T00:00:00.000Z
    // If user is in +3 GMT, that's 03:00 AM local. That shouldn't shift *back* to 13th?
    // Wait, if user sends "2024-02-14", and server is UTC, it stores 2024-02-14T00:00:00Z.
    // If client is -5 GMT (US), created at 00:00Z is 19:00 prev day.
    // Qatar is +3. So 00:00Z is 03:00 AM same day. So normally it shouldn't be an issue for Qatar.
    // BUT if the user is testing from a timezone BEHIND UTC? (e.g. US). 
    // SAFEST FIX: Append T12:00:00 to ensure we are in the middle of the day.

    // Check if it already has time?
    const safeDateStr = targetDateStr.includes("T") ? targetDateStr : `${targetDateStr}T12:00:00`;


    const baseData = {
        projectId,
        weeklyPlanId: weeklyPlanId && weeklyPlanId !== "none" ? weeklyPlanId : null,
        weeklyTaskId: weeklyTaskId, // Link the task!
        sectionId,
        description,
        targetDate: new Date(safeDateStr),
        // Bug fix: set `day` so getMesScheduleData/getFactoryStatus daily-view queries find this job.
        // Use the same date as targetDate, normalised to noon UTC to avoid timezone-midnight shifts.
        day: new Date(safeDateStr),
        targetHours: parseFloat(targetHoursStr) || 0,
        targetQty: parseInt(targetQtyStr) || 1,
        status: "PENDING",
    };

    const promises = [];

    // Cartesian Product or Single Creation
    // Cartesian Product or Single Creation
    if (employeeIds.length === 0 && machineIds.length === 0) {
        // No assignment, just create one
        promises.push(prisma.jobCard.create({ data: { ...baseData } }));
    } else if (employeeIds.length > 0) {
        // Assign to Employees
        for (const empId of employeeIds) {
            if (machineIds.length > 0) {
                // Assign Employee to EACH Machine (Cartesian)
                for (const machId of machineIds) {
                    promises.push(prisma.jobCard.create({
                        data: { ...baseData, employeeId: empId, machineId: machId }
                    }));
                }
            } else {
                // Assign Employee (No Machine)
                promises.push(prisma.jobCard.create({
                    data: { ...baseData, employeeId: empId }
                }));
            }
        }
    } else {
        // No Employees, but Multiple Machines (create one per machine)
        for (const machId of machineIds) {
            promises.push(prisma.jobCard.create({
                data: { ...baseData, machineId: machId }
            }));
        }
    }

    await Promise.all(promises);

    // Revalidate paths to ensure UI updates immediately
    revalidatePath('/admin/availability');
    revalidatePath('/admin/schedule');

    revalidatePath("/admin");
    revalidatePath("/admin/schedule");
    revalidatePath("/kiosk");

    return { success: true, count: promises.length, message: `${promises.length} Job Cards created successfully.` };
}

export async function createProject(formData: FormData) {
    const name = formData.get("name") as string;
    const client = formData.get("client") as string;
    const deadlineStr = formData.get("deadline") as string;

    if (!name) throw new Error("Project name is required");

    await prisma.project.create({
        data: {
            name,
            client,
            deadline: deadlineStr ? new Date(deadlineStr) : null,
            status: "ACTIVE"
        }
    });
    revalidatePath("/admin");
}

export async function markSectionComplete(projectId: string, sectionId: string) {
    // Finds all job cards for this project and section that are not completed
    // and marks them as completed.
    await prisma.jobCard.updateMany({
        where: {
            projectId,
            sectionId,
            isFinished: false
        },
        data: {
            isFinished: true,
            status: "COMPLETED"
        }
    });

    revalidatePath("/admin/projects");
}

export async function submitWorkLog(formData: FormData) {
    const jobCardId = formData.get("jobCardId") as string;
    const employeeId = formData.get("employeeId") as string;
    const hoursSpentStr = formData.get("hoursSpent") as string;
    const outputQtyStr = formData.get("outputQty") as string;
    const completeJob = formData.get("completeJob") === "true";

    if (!jobCardId || !employeeId || !hoursSpentStr || !outputQtyStr) {
        throw new Error("Missing required fields: Employee ID is mandatory.");
    }

    await prisma.workLog.create({
        data: {
            jobCardId,
            employeeId,
            hoursSpent: parseFloat(hoursSpentStr),
            outputQty: parseInt(outputQtyStr),
        },
    });

    if (completeJob) {
        await prisma.jobCard.update({
            where: { id: jobCardId },
            data: { status: "COMPLETED" },
        });
    }

    revalidatePath("/kiosk");
    revalidatePath("/admin");
}

export async function getMachines() {
    return await prisma.machine.findMany({
        orderBy: { name: 'asc' },
        include: { section: true },
    })
}

export async function getEmployees() {
    return await prisma.employee.findMany({
        orderBy: { name: 'asc' },
        include: { section: true },
    })
}

export async function getSections() {
    return await prisma.section.findMany({
        orderBy: { name: 'asc' },
        include: {
            subSections: true,
            machines: true,
            employees: true,
            incharges: true,
            foremen: true
        },
    })
}

export async function getProjects() {
    return await prisma.project.findMany({
        where: { status: "ACTIVE" },
        orderBy: { deadline: 'asc' },
        include: {
            weeklyPlans: {
                orderBy: { weekNumber: 'asc' }
            }
        }
    })
}

export async function getEmployeesBySection(sectionId: string) {
    return await prisma.employee.findMany({
        where: { sectionId }
    });
}

// --- Resource Management Actions ---

export async function createSection(formData: FormData) {
    const name = formData.get("name") as string;
    if (!name) throw new Error("Name required");
    await prisma.section.create({ data: { name } });
    revalidatePath("/admin/settings");
}

export async function deleteSection(id: string) {
    // Note: This might fail if there are related machines/jobs. 
    // For a real app, handle cascading or blocking.
    try {
        await prisma.section.delete({ where: { id } });
        revalidatePath("/admin/settings");
    } catch (e) {
        console.error("Failed to delete section", e);
        throw new Error("Cannot delete section with active dependencies.");
    }
}

export async function createMachine(formData: FormData) {
    const name = formData.get("name") as string;
    const sectionId = formData.get("sectionId") as string;
    if (!name || !sectionId) throw new Error("Name and Section required");
    await prisma.machine.create({ data: { name, sectionId } });
    revalidatePath("/admin/settings");
}

export async function deleteMachine(id: string) {
    await prisma.machine.delete({ where: { id } });
    revalidatePath("/admin/settings");
}

export async function createEmployee(formData: FormData) {
    const name = formData.get("name") as string;
    const sectionId = formData.get("sectionId") as string;
    const role = formData.get("role") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const phoneNumber = formData.get("phoneNumber") as string; // Optional

    if (!name || !sectionId || !username || !password) throw new Error("Name, Section, Username and Password required");

    try {
        await prisma.employee.create({
            data: {
                name,
                sectionId,
                role: role || "Worker",
                username,
                password,
                phoneNumber
            }
        });
        revalidatePath("/admin/settings");
    } catch (e: any) {
        if (e.code === 'P2002') {
            throw new Error("Username already taken");
        }
        throw e;
    }
}

// --- Chat System Refactor ---

export async function getConversations() {
    const adminId = (await cookies()).get("adminId")?.value;
    if (!adminId) return [];

    // 1. Fetch Employees and Admins in parallel
    const [employees, otherAdmins] = await Promise.all([
        prisma.employee.findMany({ orderBy: { name: 'asc' } }),
        prisma.user.findMany({
            where: { id: { not: adminId } },
            orderBy: { username: 'asc' }
        })
    ]);

    const employeeIds = employees.map(e => e.id);
    const otherAdminIds = otherAdmins.map(a => a.id);

    // 2. Batch-fetch ALL messages relevant to this admin in two queries
    //    (last message per conversation + unread count) — avoids N+1.
    const [allEmpMessages, allAdminMessages] = await Promise.all([
        prisma.message.findMany({
            where: {
                OR: [
                    { senderAdminId: adminId, receiverEmpId: { in: employeeIds } },
                    { senderEmpId: { in: employeeIds }, receiverAdminId: adminId }
                ]
            },
            orderBy: { createdAt: 'desc' }
        }),
        otherAdminIds.length > 0
            ? prisma.message.findMany({
                where: {
                    OR: [
                        { senderAdminId: adminId, receiverAdminId: { in: otherAdminIds } },
                        { senderAdminId: { in: otherAdminIds }, receiverAdminId: adminId }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            })
            : Promise.resolve([])
    ]);

    // 3. Aggregate in JS memory (O(N) with a Map)
    const conversations = [];

    for (const emp of employees) {
        const empMsgs = allEmpMessages.filter(
            m => m.receiverEmpId === emp.id || m.senderEmpId === emp.id
        );
        const lastMsg = empMsgs[0] ?? null; // Already sorted desc
        const unread = empMsgs.filter(m => m.senderEmpId === emp.id && !m.read).length;

        conversations.push({
            id: emp.id,
            name: emp.name,
            type: 'EMPLOYEE',
            lastMessage: lastMsg,
            unreadCount: unread,
            avatar: emp.name.substring(0, 2).toUpperCase()
        });
    }

    for (const admin of otherAdmins) {
        const adminMsgs = allAdminMessages.filter(
            m =>
                (m.senderAdminId === adminId && m.receiverAdminId === admin.id) ||
                (m.senderAdminId === admin.id && m.receiverAdminId === adminId)
        );
        const lastMsg = adminMsgs[0] ?? null;
        const unread = adminMsgs.filter(m => m.senderAdminId === admin.id && !m.read).length;

        conversations.push({
            id: admin.id,
            name: `${admin.username} (${admin.role})`,
            type: 'ADMIN',
            lastMessage: lastMsg,
            unreadCount: unread,
            avatar: admin.username.substring(0, 2).toUpperCase()
        });
    }

    // Sort by most-recent message
    return conversations.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA;
    });
}

export async function getMessages(targetId: string, targetType: "ADMIN" | "EMPLOYEE" = "EMPLOYEE") {
    // Determine who is asking (Admin or Employee)
    const adminId = (await cookies()).get("adminId")?.value;
    const employeeId = (await cookies()).get("employeeId")?.value;

    if (adminId) {
        // Admin View
        if (targetType === "EMPLOYEE") {
            return await prisma.message.findMany({
                where: {
                    OR: [
                        { senderAdminId: adminId, receiverEmpId: targetId },
                        { senderEmpId: targetId, receiverAdminId: adminId }
                    ]
                },
                orderBy: { createdAt: 'asc' }
            });
        } else {
            // Admin <-> Admin
            return await prisma.message.findMany({
                where: {
                    OR: [
                        { senderAdminId: adminId, receiverAdminId: targetId },
                        { senderAdminId: targetId, receiverAdminId: adminId }
                    ]
                },
                orderBy: { createdAt: 'asc' }
            });
        }
    } else if (employeeId) {
        // Employee View (can only chat with Admins)
        // targetId is the Admin ID they are chatting with
        // Actually, Kiosk usually has a fixed "Chat with Admin" button, 
        // but now we want to support multiple admins.
        // If targetId is provided, use it.

        return await prisma.message.findMany({
            where: {
                OR: [
                    { senderEmpId: employeeId, receiverAdminId: targetId },
                    { senderAdminId: targetId, receiverEmpId: employeeId }
                ]
            },
            orderBy: { createdAt: 'asc' }
        });
    }
    return [];
}

export async function sendMessage(
    targetId: string,
    targetType: "ADMIN" | "EMPLOYEE",
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
) {
    const adminId = (await cookies()).get("adminId")?.value;
    const employeeId = (await cookies()).get("employeeId")?.value;

    if (adminId) {
        // Sending as Admin
        const data: any = {
            content,
            attachmentUrl,
            attachmentType,
            senderType: "ADMIN",
            senderAdminId: adminId,
            read: false,
            createdAt: new Date()
        };

        if (targetType === "EMPLOYEE") {
            data.receiverType = "EMPLOYEE";
            data.receiverEmpId = targetId;
        } else {
            data.receiverType = "ADMIN";
            data.receiverAdminId = targetId;
        }

        await prisma.message.create({ data });
        revalidatePath("/admin/messages");
    } else if (employeeId) {
        // Sending as Employee (to Admin)
        const data: any = {
            content,
            attachmentUrl,
            attachmentType,
            senderType: "EMPLOYEE",
            senderEmpId: employeeId,
            receiverType: "ADMIN",
            receiverAdminId: targetId, // Must be an Admin ID
            read: false,
            createdAt: new Date()
        };

        await prisma.message.create({ data });
        revalidatePath("/kiosk");
    }
}

export async function markMessagesAsRead(targetId: string, targetType: "ADMIN" | "EMPLOYEE") {
    const adminId = (await cookies()).get("adminId")?.value;
    const employeeId = (await cookies()).get("employeeId")?.value;

    if (adminId) {
        // Admin reading
        if (targetType === "EMPLOYEE") {
            await prisma.message.updateMany({
                where: { senderEmpId: targetId, receiverAdminId: adminId, read: false },
                data: { read: true, readAt: new Date() }
            });
        } else {
            // Admin reading Admin
            await prisma.message.updateMany({
                where: { senderAdminId: targetId, receiverAdminId: adminId, read: false },
                data: { read: true, readAt: new Date() }
            });
        }
    } else if (employeeId) {
        // Employee reading (from Admin)
        await prisma.message.updateMany({
            where: { senderAdminId: targetId, receiverEmpId: employeeId, read: false },
            data: { read: true, readAt: new Date() }
        });
    }
}


export async function getTotalUnreadCount() {
    const adminId = (await cookies()).get("adminId")?.value;
    if (!adminId) return 0;

    return await prisma.message.count({
        where: {
            receiverAdminId: adminId,
            read: false
        }
    });
}

export async function deleteEmployee(id: string) {
    await prisma.employee.delete({ where: { id } });
    revalidatePath("/admin/settings");
}

export async function resetEmployeePassword(formData: FormData) {
    const id = formData.get("id") as string;
    const password = formData.get("password") as string;

    if (!id || !password) throw new Error("ID and Password required");

    await prisma.employee.update({
        where: { id },
        data: { password }
    });

    revalidatePath("/admin/settings");
}

// --- Production Scheduler Actions ---

export async function createWeeklyTask(formData: FormData) {
    const weeklyPlanId = formData.get("weeklyPlanId") as string;
    const description = formData.get("description") as string;
    const targetQtyStr = formData.get("targetQty") as string;
    const unit = formData.get("unit") as string;

    if (!weeklyPlanId || !description) throw new Error("Plan and Description required");

    await prisma.weeklyTask.create({
        data: {
            weeklyPlanId,
            description,
            targetQty: parseInt(targetQtyStr) || 0,
            unit: unit || "pcs"
        }
    });
    revalidatePath("/admin/schedule");
}

export async function createJobCardFromTask(formData: FormData) {
    const weeklyTaskId = formData.get("weeklyTaskId") as string;
    const sectionId = formData.get("sectionId") as string;
    const machineId = formData.get("machineId") as string;
    const employeeId = formData.get("employeeId") as string;
    const targetQtyStr = formData.get("targetQty") as string;
    const dateStr = formData.get("date") as string;

    if (!weeklyTaskId || !sectionId || !employeeId) throw new Error("Task, Section, and Employee required");

    // Fetch the parent task to get project info
    const task = await prisma.weeklyTask.findUnique({
        where: { id: weeklyTaskId },
        include: { weeklyPlan: true }
    });

    if (!task) throw new Error("Task not found");

    await prisma.jobCard.create({
        data: {
            projectId: task.weeklyPlan.projectId,
            weeklyPlanId: task.weeklyPlanId,
            weeklyTaskId: task.id,
            sectionId,
            machineId: (machineId && machineId !== "none") ? machineId : null,
            employeeId, // Mandatory for assignment
            description: task.description, // Inherit description or allow override? Prompt implies simple assignment.
            targetDate: new Date(dateStr || new Date()),
            targetHours: 0, // Not specified in prompt, default to 0
            targetQty: parseInt(targetQtyStr) || 0,
            status: "PENDING"
        }
    });
    revalidatePath("/admin/schedule");
    revalidatePath("/kiosk");
    revalidatePath("/admin");
}

export async function getWeeklyPlansWithTasks(projectId?: string) {
    const where: any = { status: { not: "COMPLETED" } };
    if (projectId) {
        where.projectId = projectId;
    }

    return await prisma.weeklyPlan.findMany({
        where,
        include: {
            project: true,
            tasks: {
                include: {
                    jobCards: true // To calculate progress if needed
                }
            }
        },
        orderBy: { weekNumber: 'asc' }
    });
}


export async function getDailyAssignments(dateStr: string) {
    // dateStr expected in "YYYY-MM-DD" format
    // Create start and end of day based on the STRING date, assuming it represents a local day
    // We want to capture everything that falls within that calendar day.

    const startOfDay = new Date(`${dateStr}T00:00:00.000`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999`);

    return await prisma.jobCard.findMany({
        where: {
            targetDate: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        select: {
            id: true,
            description: true,
            targetQty: true,
            unit: true,
            status: true,
            actualQty: true,
            actualHrs: true,
            startedAt: true,
            completedAt: true,
            sectionId: true,
            machineId: true,
            employeeId: true,
            projectId: true,
            targetDate: true,
            budgetedLabourHrs: true,
            extraDetails: true,
            itemCode: true,
            isFinished: true,
            section: { select: { id: true, name: true } },
            machine: { select: { id: true, name: true } },
            employee: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } }
        },
        orderBy: { section: { name: 'asc' } }
    });
}

// --- Real-time Kiosk Actions ---

export async function startJob(jobCardId: string) {
    const job = await prisma.jobCard.findUnique({
        where: { id: jobCardId },
        select: { machineId: true, startTime: true }
    });

    // Update Job Status
    await prisma.jobCard.update({
        where: { id: jobCardId },
        data: {
            status: "IN_PROGRESS",
            startedAt: new Date(), // Updated to ensure timestamp is saved
            startTime: job?.startTime ? undefined : new Date() // Only set if first time starting
        }
    });

    // Toggle Machine Status if assigned
    if (job?.machineId) {
        await prisma.machine.update({
            where: { id: job.machineId },
            data: { status: "RUNNING" }
        });
    }

    revalidatePath("/kiosk");
    revalidatePath("/admin");
    revalidatePath("/admin/schedule");
}

export async function finishJob(jobCardId: string, qtyProduced: number, isFinished: boolean) {
    // 1. Get the JobCard to find the "startedAt" time and employee
    const job = await prisma.jobCard.findUnique({
        where: { id: jobCardId },
        select: { startedAt: true, actualQty: true, machineId: true, employeeId: true }
    });

    if (!job || !job.startedAt) {
        throw new Error("Job was never started!");
    }

    // 2. Calculate Duration (in hours)
    const endTime = new Date();
    const durationMs = endTime.getTime() - new Date(job.startedAt).getTime();
    const hoursWorked = durationMs / (1000 * 60 * 60); // Convert milliseconds to hours

    // 3. Create a PERMANENT WorkLog (This is for Reports)
    if (job.employeeId) {
        await prisma.workLog.create({
            data: {
                jobCardId: jobCardId,
                employeeId: job.employeeId,
                hoursSpent: hoursWorked, // Correct field name from schema
                outputQty: qtyProduced,
                date: endTime
            }
        });
        
        // 3.5 Mark HR Attendance as PRESENT for the day
        await markAttendance({
            employeeId: job.employeeId,
            date: endTime,
            status: "PRESENT",
            checkIn: new Date(job.startedAt),
            checkOut: endTime
        });
    }

    // 4. Update the JobCard
    await prisma.jobCard.update({
        where: { id: jobCardId },
        data: {
            status: isFinished ? "COMPLETED" : "PENDING", // If not finished, go back to Pending
            startedAt: null, // Reset timer so they can start again tomorrow
            actualQty: { increment: qtyProduced }, // Add to total
            completedAt: isFinished ? endTime : null,
            isFinished: isFinished,
            endTime: isFinished ? endTime : undefined, // Set end time when completely finished
            actualHrs: { increment: hoursWorked } // Sync incremented actual hours to the schedule view
        }
    });

    // 5. Update Machine Status Logic
    if (job.machineId) {
        await prisma.machine.update({
            where: { id: job.machineId },
            data: { status: "IDLE" }
        });
    }

    revalidatePath('/kiosk');
    revalidatePath('/admin');
    revalidatePath("/admin/schedule");
}

export async function getWorkerHistory(employeeId: string, filterDate?: Date) {
    const startOfDay = filterDate ? new Date(filterDate) : undefined;
    if (startOfDay) startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = filterDate ? new Date(filterDate) : undefined;
    if (endOfDay) endOfDay.setHours(23, 59, 59, 999);

    return await prisma.jobCard.findMany({
        where: {
            employeeId: employeeId,
            status: "COMPLETED",
            ...(filterDate && {
                completedAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            })
        },
        include: {
            project: true,
            weeklyPlan: true,
            logs: true // Include work logs to calculate actual hours
        },
        orderBy: { completedAt: 'desc' }
    });
}

// --- Reporting Module Actions ---

export async function getProjectReport(projectId?: string, startDate?: Date, endDate?: Date) {
    const whereClause = projectId && projectId !== "all" ? { projectId } : {};

    const logWhere: any = {};
    if (startDate && endDate) {
        logWhere.date = {
            gte: startDate,
            lte: endDate
        };
    }

    const jobCards = await prisma.jobCard.findMany({
        where: whereClause,
        include: {
            project: true,
            weeklyPlan: true,
            section: true,
            employee: true,
            logs: {
                where: logWhere
            }
        }
    });

    // 1. Summary
    let totalHours = 0;
    let totalQty = 0;
    let totalTasks = jobCards.length;
    let completedTasks = 0;

    // 2. Breakdowns
    const weeklyMap = new Map<number, { hours: number, qty: number }>();
    const sectionMap = new Map<string, { totalHours: number, machineHours: number }>();
    const employeeMap = new Map<string, { name: string, totalHours: number, tasksCompleted: number, targetHoursCompleted: number }>();

    for (const job of jobCards) {
        // Calculate hours for this job (prefer logs sum, fallback to 0 or manual tracking if exists)
        // Schema definition: JobCard has targetHours. WorkLog has hoursSpent.
        const jobActualHours = job.logs.reduce((sum, log) => sum + log.hoursSpent, 0);
        totalHours += jobActualHours;

        // Calculate Qty
        // Use logs for quantity to respect date filtering
        const jobQty = job.logs.reduce((sum, log) => sum + log.outputQty, 0);

        // If NO date filter is applied, we might want to fallback to job.actualQty if logs are missing?
        // But for consistency, let's stick to logs if we assume logs are the source of truth.
        // However, if the user hasn't historically logged everything, this might be 0.
        // Given the prompt "If NOT provided, fetch everything (as before)", logic should be consistent.
        // Previously: const jobQty = job.actualQty || 0;
        // To be safe and respect the "Filtered" requirement: Use logs.

        totalQty += jobQty;

        if (job.status === "COMPLETED") {
            completedTasks++;
        }

        // --- Weekly Breakdown ---
        // Group by weeklyPlan.weekNumber. If no weeklyPlan, maybe group by date? 
        // Requirement says "Weekly Breakdown". Let's use weeklyPlan.weekNumber if available, else 0 or separate bucket.
        const weekNum = job.weeklyPlan?.weekNumber || 0;
        const weekEntry = weeklyMap.get(weekNum) || { hours: 0, qty: 0 };
        weekEntry.hours += jobActualHours;
        weekEntry.qty += jobQty;
        weeklyMap.set(weekNum, weekEntry);

        // --- Section Breakdown ---
        const sectionName = job.section.name;
        const sectionEntry = sectionMap.get(sectionName) || { totalHours: 0, machineHours: 0 };
        sectionEntry.totalHours += jobActualHours;
        if (job.machineId) {
            sectionEntry.machineHours += jobActualHours;
        }
        sectionMap.set(sectionName, sectionEntry);

        // --- Employee Stats ---
        if (job.employeeId && job.employee) {
            const empId = job.employeeId;
            const empEntry = employeeMap.get(empId) || {
                name: job.employee.name,
                totalHours: 0,
                tasksCompleted: 0,
                targetHoursCompleted: 0
            };

            // Hours worked by this employee on this job
            const empLogs = job.logs.filter(l => l.employeeId === empId);
            const empHours = empLogs.length > 0
                ? empLogs.reduce((s, l) => s + l.hoursSpent, 0)
                : 0;
            // Previous fallback: (job.logs.length === 0 ? jobActualHours : 0);
            // With filtering, if no logs match, hours are 0. Correct.

            empEntry.totalHours += empHours;

            // Tasks Completed Logic:
            // If we are filtering by date, do we credit "Task Completed" if it was completed in that range?
            // "completedAt" is on JobCard. 
            // The prompt says "Summary ... recalculated based ONLY on filtered data". 
            // But "Tasks Completed" relies on job status. 
            // If I filter Last Month, and job completed Today, should it count? 
            // Probably not. But user prompt specifically said "Total Hours, Efficiency". 
            // I'll update "Efficiency" logic but keep "Tasks Completed" as "Active/Completed Jobs having logs in this period"? 
            // Or just leave it. The prompt didn't explicitly ask to change Task Count logic, just "Summary (Total Hours, Efficiency)".
            // I will stick to minimal invasion.

            if (job.status === "COMPLETED") {
                empEntry.tasksCompleted++;
                empEntry.targetHoursCompleted += job.targetHours;
            }
            employeeMap.set(empId, empEntry);
        }
    }

    // Transform Maps to Arrays
    const weeklyBreakdown = Array.from(weeklyMap.entries())
        .map(([weekNumber, data]) => ({
            weekNumber,
            hoursWorked: data.hours,
            qtyProduced: data.qty
        }))
        .sort((a, b) => a.weekNumber - b.weekNumber);

    const sectionBreakdown = Array.from(sectionMap.entries())
        .map(([sectionName, data]) => ({
            sectionName,
            totalHours: data.totalHours,
            machineUsageHours: data.machineHours
        }));

    const employeeStats = Array.from(employeeMap.values())
        .map(e => {
            // Efficiency: (Target Hours / Actual Hours) * 100
            // Prepare for division by zero
            let efficiency = 0;
            if (e.totalHours > 0) {
                // Modified Efficiency Logic: 
                // If we are filtering, comparing "Total Target Hours of Completed Jobs" to "Partial Actual Hours" is skewed.
                // But without intricate "Earned Hours" calc per log, this is best effort.
                efficiency = (e.targetHoursCompleted / e.totalHours) * 100;
            } else if (e.tasksCompleted > 0) {
                efficiency = e.targetHoursCompleted > 0 ? 100 : 0;
            }

            return {
                workerName: e.name,
                totalHours: e.totalHours,
                tasksCompleted: e.tasksCompleted,
                efficiency: Math.round(efficiency)
            };
        });

    return {
        summary: {
            totalHours,
            totalQty, // Now filtered
            totalTasks,
            completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        weeklyBreakdown,
        sectionBreakdown,
        employeeStats
    };
}

// --- Resource Availability Action ---

export async function getFactoryStatus() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const employees = await prisma.employee.findMany({
        include: {
            section: true,
            subSection: true,
            leaveRequests: {
                where: {
                    status: "APPROVED",
                    startDate: { lte: endOfToday },
                    endDate: { gte: startOfToday }
                }
            },
            jobCards: {
                where: {
                    OR: [
                        { status: "IN_PROGRESS" },
                        { status: "PENDING", day: { gte: startOfToday, lte: endOfToday } }
                    ]
                },
                include: { project: true }
            }
        },
        orderBy: { name: 'asc' }
    });
    const machines = await prisma.machine.findMany({
        include: {
            section: true,
            subSection: true,
            maintenances: {
                where: {
                    status: "APPROVED",
                    startDate: { lte: endOfToday },
                    endDate: { gte: startOfToday }
                }
            },
            jobCards: {
                where: {
                    OR: [
                        { status: "IN_PROGRESS" },
                        { status: "PENDING", day: { gte: startOfToday, lte: endOfToday } }
                    ]
                },
                include: { project: true, employee: true }
            }
        },
        orderBy: { name: 'asc' }
    });
    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' }
    });
    const allPendingOrActiveJobCards = await prisma.jobCard.findMany({
        where: {
            OR: [
                { status: "IN_PROGRESS" },
                { status: "PENDING", day: { gte: startOfToday, lte: endOfToday } }
            ]
        },
        include: { project: true }
    });

    const employeeStatus = employees.map(emp => {
        const activeJob = emp.jobCards.find(j => j.status === "IN_PROGRESS");
        const pendingJob = emp.jobCards.find(j => j.status === "PENDING");
        const isOnLeave = emp.leaveRequests && emp.leaveRequests.length > 0;
        const displayJob = activeJob || pendingJob;

        let currentStatus = "AVAILABLE";
        if (isOnLeave) currentStatus = "ON_LEAVE";
        else if (activeJob) currentStatus = "BUSY";
        else if (pendingJob) currentStatus = "ASSIGNED";

        return {
            id: emp.id,
            name: emp.name,
            employeeCode: emp.employeeCode,
            section: emp.section.name,
            subSection: emp.subSection?.name || null,
            status: currentStatus,
            currentTask: displayJob ? {
                projectName: displayJob.project.name,
                taskName: displayJob.description,
                startedAt: displayJob.startedAt
            } : null
        };
    });

    const machineStatus = machines.map(mach => {
        const activeJob = mach.jobCards.find(j => j.status === "IN_PROGRESS");
        const pendingJob = mach.jobCards.find(j => j.status === "PENDING");
        const isUnderMaintenance = mach.maintenances && mach.maintenances.length > 0;
        const isBusy = activeJob || mach.status === "RUNNING";
        const displayJob = activeJob || pendingJob;

        let currentStatus = "AVAILABLE";
        if (isUnderMaintenance) currentStatus = "MAINTENANCE";
        else if (isBusy) currentStatus = "BUSY";
        else if (pendingJob) currentStatus = "ASSIGNED";

        return {
            id: mach.id,
            name: mach.name,
            machineNumber: mach.machineNumber,
            section: mach.section.name,
            subSection: mach.subSection?.name || null,
            status: currentStatus,
            currentTask: displayJob ? {
                projectName: displayJob.project.name,
                taskName: displayJob.description,
                operatorName: displayJob.employee?.name || "Unknown"
            } : null
        };
    });

    const staffStatus = users.map(user => {
        // Find jobs assigned to this user via exact token match on comma-separated assignedTo
        const userJobs = allPendingOrActiveJobCards.filter(j => {
            if (!j.assignedTo) return false;
            const assignees = j.assignedTo.split(",").map((s: string) => s.trim());
            return assignees.includes(user.username) || (user.name ? assignees.includes(user.name) : false);
        });
        const activeJob = userJobs.find(j => j.status === "IN_PROGRESS");
        const pendingJob = userJobs.find(j => j.status === "PENDING");
        const displayJob = activeJob || pendingJob;

        let currentStatus = "AVAILABLE";
        if (activeJob) currentStatus = "BUSY";
        else if (pendingJob) currentStatus = "ASSIGNED";

        return {
            id: user.id,
            name: user.name || user.username,
            employeeCode: user.username, // Reuse employeeCode field for username display in UI
            section: user.role, // Reuse section field for role display
            subSection: null,
            status: currentStatus,
            currentTask: displayJob ? {
                projectName: displayJob.project?.name || "No Project",
                taskName: displayJob.description || "General Task",
                startedAt: displayJob.startedAt
            } : null
        };
    });

    return {
        employees: employeeStatus,
        machines: machineStatus,
        staff: staffStatus
    };
}

// --- Weekly Resource Timeline Action ---

// --- Weekly Resource Timeline Action ---

export async function getWeeklyResourceSchedule(startDateStr: string, endDateStr: string) {
    // startDateStr and endDateStr should be "YYYY-MM-DD"
    // We treat them as UTC midnight for database comparison
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Adjust endDate to include the full day (set to 23:59:59.999 or just add 1 day and use lt)
    // Actually, if we use LTE and exact date match, we might miss times.
    // Better: Start = YYYY-MM-DDT00:00:00Z, End = YYYY-MM-DDT23:59:59Z
    // But simplistic approach:
    const queryEndDate = new Date(endDate);
    queryEndDate.setHours(23, 59, 59, 999);

    // Helper to format stored date as YYYY-MM-DD
    // Note: stored targetDate is UTC. We want to bucket it by its date string.
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Generate array of dates between start and end using strings
    const dates: string[] = [];
    let curr = new Date(startDate);

    while (curr <= endDate) {
        dates.push(formatDate(curr));
        curr.setDate(curr.getDate() + 1);
    }

    // Fetch Resources
    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
    });
    const employees = await prisma.employee.findMany({
        orderBy: { name: 'asc' },
        include: {
            section: true,
            subSection: true,
            leaveRequests: {
                where: {
                    status: "APPROVED",
                    startDate: { lte: queryEndDate },
                    endDate: { gte: startDate }
                }
            },
            jobCards: {
                where: {
                    targetDate: {
                        gte: startDate,
                        lte: queryEndDate
                    }
                },
                include: {
                    project: true
                }
            }
        }
    });

    const machines = await prisma.machine.findMany({
        orderBy: { name: 'asc' },
        include: {
            section: true,
            subSection: true,
            maintenances: {
                where: {
                    status: "APPROVED",
                    startDate: { lte: queryEndDate },
                    endDate: { gte: startDate }
                }
            },
            jobCards: {
                where: {
                    targetDate: {
                        gte: startDate,
                        lte: queryEndDate
                    }
                },
                include: {
                    project: true,
                    employee: true
                }
            }
        },
    });

    // Process Employees
    const employeeResources = employees.map(emp => {
        const schedule: Record<string, any[]> = {};

        // Initialize empty arrays for all dates
        dates.forEach(date => schedule[date] = []);

        // Fill with leaves
        emp.leaveRequests.forEach(leave => {
            let currTime = new Date(leave.startDate);
            const endTime = new Date(leave.endDate);
            // Ignore time portion for matching dates, use UTC to prevent timezone offset bugs
            currTime.setUTCHours(0, 0, 0, 0);
            endTime.setUTCHours(23, 59, 59, 999);

            while (currTime <= endTime) {
                const dateStr = formatDate(currTime);
                if (schedule[dateStr]) {
                    schedule[dateStr].push({
                        taskId: "leave",
                        projectName: "ON LEAVE",
                        taskName: "Approved Leave",
                        hours: 8,
                        status: "ON_LEAVE"
                    });
                }
                currTime.setUTCDate(currTime.getUTCDate() + 1);
            }
        });

        // Fill with tasks
        emp.jobCards.forEach(job => {
            const dateKey = formatDate(job.targetDate);
            const actualHours = job.actualHrs; // actualHrs is the source of truth (same as Reports/Schedule views)
            const plannedHours = job.budgetedLabourHrs || job.targetHours || 0;

            if (schedule[dateKey]) {
                schedule[dateKey].push({
                    taskId: job.id,
                    projectName: job.project?.name || "Unknown",
                    taskName: job.description,
                    hours: plannedHours,
                    actualHours: Math.round(actualHours * 10) / 10, // Round to 1 decimal
                    status: job.status,
                    isFinished: job.isFinished || job.status === 'COMPLETED'
                });
            }
        });

        return {
            id: emp.id,
            name: emp.name,
            type: "EMPLOYEE",
            section: emp.section?.name ?? "Unknown",
            sectionId: emp.section?.id ?? "",
            subSection: emp.subSection?.name || null,
            schedule
        };
    });

    // Process Machines
    const machineResources = machines.map(mach => {
        const schedule: Record<string, any[]> = {};

        dates.forEach(date => schedule[date] = []);

        // Fill with maintenance
        mach.maintenances.forEach(maintenance => {
            let currTime = new Date(maintenance.startDate);
            const endTime = new Date(maintenance.endDate);
            // Ignore time portion for matching dates, use UTC to prevent timezone offset bugs
            currTime.setUTCHours(0, 0, 0, 0);
            endTime.setUTCHours(23, 59, 59, 999);

            while (currTime <= endTime) {
                const dateStr = formatDate(currTime);
                if (schedule[dateStr]) {
                    schedule[dateStr].push({
                        taskId: "maintenance",
                        projectName: "MAINTENANCE",
                        taskName: maintenance.type.replace('_', ' '),
                        hours: 24, // Block whole day
                        status: "MAINTENANCE"
                    });
                }
                currTime.setUTCDate(currTime.getUTCDate() + 1);
            }
        });

        mach.jobCards.forEach(job => {
            const dateKey = formatDate(job.targetDate);
            const actualHours = job.actualHrs; // actualHrs is the source of truth
            const plannedHours = job.budgetedLabourHrs || job.targetHours || 0;

            if (schedule[dateKey]) {
                schedule[dateKey].push({
                    taskId: job.id,
                    projectName: job.project?.name || "Unknown",
                    taskName: job.description,
                    hours: plannedHours,
                    actualHours: Math.round(actualHours * 10) / 10,
                    status: job.status,
                    operatorName: job.employee?.name || "Unassigned"
                });
            }
        });

        return {
            id: mach.id,
            name: mach.name,
            type: "MACHINE",
            section: mach.section?.name ?? "Unknown",
            sectionId: mach.section?.id ?? "",
            subSection: mach.subSection?.name || null,
            schedule
        };
    });

    // Fetch all job cards in the date range that have an assignedTo field
    const assignedJobs = await prisma.jobCard.findMany({
        where: {
            assignedTo: { not: null },
            targetDate: { gte: startDate, lte: queryEndDate }
        },
        include: {
            project: true
        }
    });

    // Process Staff (Users)
    const staffResources = users.map(user => {
        const schedule: Record<string, any[]> = {};
        dates.forEach(date => schedule[date] = []);

        // Filter jobs assigned to this specific user
        const userName = user.name || "";
        const userHandle = user.username || "";
        
        const userJobs = assignedJobs.filter(job => {
            const assignees = job.assignedTo ? job.assignedTo.split(",").map(s => s.trim()) : [];
            return assignees.includes(userName) || assignees.includes(userHandle);
        });

        if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return null; // Exclude admins from staff timeline as requested

        userJobs.forEach(job => {
            const dateKey = formatDate(job.targetDate);
            const actualHours = job.actualHrs; // actualHrs is the source of truth
            const plannedHours = job.budgetedLabourHrs || job.targetHours || 0;

            if (schedule[dateKey]) {
                schedule[dateKey].push({
                    taskId: job.id,
                    projectName: job.project?.name || "Unknown",
                    taskName: job.description,
                    hours: plannedHours,
                    actualHours: Math.round(actualHours * 10) / 10,
                    status: job.status,
                    isFinished: job.isFinished || job.status === 'COMPLETED',
                    operatorName: userName
                });
            }
        });

        return {
            id: user.id,
            name: user.name || user.username,
            type: "STAFF",
            section: user.role, // Group by role
            sectionId: user.role, // Use role as section ID
            subSection: null,
            schedule
        };
    }).filter(Boolean) as any[];

    return {
        dates,
        resources: [...employeeResources, ...machineResources, ...staffResources]
    };
}



// Refactored for All-Time Section-Wise Report
export async function getProjectPipeline() {
    // Fetch Sections dynamically
    const sections = await prisma.section.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    const projects = await prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            projectNumber: true,
            name: true,
            client: true,
            amount: true,
            startingDate: true,
            deadline: true,
            location: true,
            locationLink: true,
            status: true,
            blankBoqUrl: true,
            idDrawingUrl: true,
            threeDDrawingUrl: true,
            otherAttachmentUrl: true,
            materialsDetailsUrl: true,
            jobCards: {
                select: {
                    id: true,
                    sectionId: true,
                    actualHrs: true,
                    description: true,
                    status: true,
                    targetDate: true,
                    targetQty: true,
                    isFinished: true,
                    employee: { select: { id: true, name: true } }
                }
            },
            productionOrders: {
                include: { items: true }
            }
        }
    });

    const pipelineData = projects.map(project => {
        const stages: Record<string, any> = {};

        // Iterate through DYNAMIC sections
        // ... (preserving lines 1341 to 1400)
        sections.forEach(section => {
            const stageName = section.name;
            const stageJobs = project.jobCards.filter(job => job.sectionId === section.id);

            // 1. Determine Status
            let status = "PENDING";
            if (stageJobs.length > 0) {
                const allFinished = stageJobs.every(job => job.isFinished || job.status === "COMPLETED");
                status = allFinished ? "COMPLETED" : "IN_PROGRESS";
            }

            // 2. Aggregate Employee Data & Hours
            // Use job.actualHrs as the source of truth — this is the same field the Reports and Schedule views
            // display. Some jobs have actualHrs set via admin schedule (startTime/endTime diff) without a
            // corresponding WorkLog record, so summing logs alone misses those hours.
            const employeeMap = new Map<string, { name: string, hours: number }>();
            let sectionTotalHours = 0;

            stageJobs.forEach(job => {
                const jobHours = job.actualHrs || 0;
                sectionTotalHours += jobHours;

                if (job.employee && jobHours > 0) {
                    const empId = job.employee.id;
                    const existing = employeeMap.get(empId) || { name: job.employee.name, hours: 0 };
                    existing.hours += jobHours;
                    employeeMap.set(empId, existing);
                }
            });

            // Convert Map to Array
            const workers = Array.from(employeeMap.values()).map(w => ({
                name: w.name,
                hours: Math.round(w.hours * 10) / 10 // Round to 1 decimal
            }));

            stages[stageName] = {
                status,
                workers,
                totalHours: Math.round(sectionTotalHours * 10) / 10,
                jobCardCount: stageJobs.length,
                jobs: stageJobs.map(job => ({
                    id: job.id,
                    description: job.description,
                    status: job.status,
                    employeeName: job.employee?.name,
                    employeeId: job.employee?.id,
                    targetDate: job.targetDate.toISOString().split('T')[0],
                    targetQty: job.targetQty,
                    isFinished: job.isFinished || job.status === "COMPLETED"
                }))
            };
        });

        // Get the first available Production Order PDF URL (for fallback mostly)
        const autoProductionOrdersUrl = project.productionOrders.find(po => po.pdfDrawingUrl)?.pdfDrawingUrl || null;

        return {
            id: project.id,
            projectNumber: project.projectNumber,
            name: project.name,
            client: project.client,
            amount: project.amount,
            startingDate: project.startingDate,
            deadline: project.deadline,
            location: project.location,
            locationLink: project.locationLink,
            status: project.status,
            blankBoqUrl: project.blankBoqUrl,
            idDrawingUrl: project.idDrawingUrl,
            threeDDrawingUrl: project.threeDDrawingUrl,
            otherAttachmentUrl: project.otherAttachmentUrl,
            materialsDetailsUrl: project.materialsDetailsUrl,
            productionOrdersUrl: autoProductionOrdersUrl,
            productionOrders: project.productionOrders,
            stages
        };
    });

    // Sort to ensure COMPLETED projects appear below ACTIVE ones
    pipelineData.sort((a, b) => {
        if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
        if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1;
        return 0;
    });

    return pipelineData;
}

import { getISOWeek, getYear } from "date-fns";

export async function getProjectGanttData() {
    const projects = await prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            jobCards: {
                select: {
                    targetDate: true,
                    section: { select: { name: true } }
                }
            }
        }
    });

    const ganttData = projects.map(project => {
        const timeline: Record<string, string[]> = {};

        project.jobCards.forEach(job => {
            const date = new Date(job.targetDate);
            const weekNum = getISOWeek(date);
            const year = getYear(date);
            const weekKey = `${year}-W${weekNum}`;

            if (!timeline[weekKey]) {
                timeline[weekKey] = [];
            }

            // Add section name if not already present
            if (!timeline[weekKey].includes(job.section.name)) {
                timeline[weekKey].push(job.section.name);
            }
        });

        // Sort sections for consistency?
        Object.keys(timeline).forEach(key => {
            timeline[key].sort();
        });

        return {
            id: project.id,
            name: project.name,
            timeline
        };
    });

    return ganttData;
}

export async function createBatchSchedule(formData: FormData) {
    const projectId = formData.get("projectId") as string;
    const taskName = formData.get("description") as string;
    const sectionId = formData.get("sectionId") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const dailyHours = parseFloat(formData.get("hoursPerJob") as string) || 8;
    // count is used to multiply if no resources selected, OR we implied one job per resource per day. 
    // The prompt says "multiple employee or multiple machine". 
    // If resources are selected, we create 1 job per resource per day.

    const employeeIds = formData.getAll("employeeIds") as string[];
    const machineIds = formData.getAll("machineIds") as string[];

    if (!projectId || !taskName || !sectionId || !startDateStr || !endDateStr) {
        throw new Error("Missing required fields for batch schedule");
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const weekNumberStr = formData.get("weekNumber") as string;

    // 1. Resolve Weekly Plan (Find or Create)
    let weekNum: number;
    // Check if weekNumber input is present and not "auto"
    if (weekNumberStr && weekNumberStr !== "auto") {
        weekNum = parseInt(weekNumberStr);
    } else {
        weekNum = getISOWeek(startDate);
    }

    const year = getYear(startDate); // Not distinguishing year in schema yet? Schema likely just has weekNumber. 
    // Assuming weekNumber implies current year or we just trust the number.
    // Ideally we should have year, but let's stick to weekNumber for now as per schema logic seen before.

    let plan = await prisma.weeklyPlan.findFirst({
        where: { projectId, weekNumber: weekNum }
    });

    if (!plan) {
        plan = await prisma.weeklyPlan.create({
            data: {
                projectId,
                weekNumber: weekNum,
                title: `Week ${weekNum}`,
                status: "PENDING"
            }
        });
    }
    const weeklyPlanId = plan.id;

    // 2. Find or Create Weekly Task
    let task = await prisma.weeklyTask.findFirst({
        where: { weeklyPlanId, description: taskName }
    });

    // Estimate total target
    // If specific resources selected: (days * resources). If no resources (just placeholders?): (days * count)
    // The UI currently has "Jobs to Create" (count). 
    // If resources are selected, we ignore "count" and use resource count.
    // If NO resources selected (unassigned), we use "count".

    const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    let resourceCount = employeeIds.length + machineIds.length;
    if (resourceCount === 0) {
        resourceCount = parseInt(formData.get("count") as string) || 1;
    }

    const totalTarget = resourceCount * dayCount; // SimpleQty assume 1 per job

    if (!task) {
        task = await prisma.weeklyTask.create({
            data: {
                weeklyPlanId,
                description: taskName,
                targetQty: totalTarget,
                unit: "pcs"
            }
        });
    }

    // 3. Loop and Create Job Cards
    const jobCardsData = [];
    const loopDate = new Date(startDate);

    while (loopDate <= endDate) {
        const targetDate = new Date(loopDate);
        // Fix for timezone potentially: Add noon time to ensure it stays on the day
        // targetDate.setHours(12, 0, 0, 0); 

        if (employeeIds.length > 0 || machineIds.length > 0) {
            // Assign to specific resources
            for (const empId of employeeIds) {
                jobCardsData.push({
                    projectId,
                    weeklyPlanId,
                    weeklyTaskId: task.id,
                    sectionId,
                    employeeId: empId,
                    description: taskName,
                    targetDate: new Date(targetDate), // Clone
                    targetHours: dailyHours,
                    targetQty: 1, // Default 1 per batch job
                    status: "PENDING"
                });
            }
            for (const machId of machineIds) {
                jobCardsData.push({
                    projectId,
                    weeklyPlanId,
                    weeklyTaskId: task.id,
                    sectionId,
                    machineId: machId,
                    description: taskName,
                    targetDate: new Date(targetDate),
                    targetHours: dailyHours,
                    targetQty: 1,
                    status: "PENDING"
                });
            }
        } else {
            // Create Unassigned placeholders based on "count"
            const count = parseInt(formData.get("count") as string) || 1;
            for (let i = 0; i < count; i++) {
                jobCardsData.push({
                    projectId,
                    weeklyPlanId,
                    weeklyTaskId: task.id,
                    sectionId,
                    description: taskName,
                    targetDate: new Date(targetDate),
                    targetHours: dailyHours,
                    targetQty: 1,
                    status: "PENDING"
                });
            }
        }

        loopDate.setDate(loopDate.getDate() + 1);
    }

    if (jobCardsData.length > 0) {
        await prisma.jobCard.createMany({
            data: jobCardsData
        });
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/admin");
}

export async function deleteWeeklyTask(taskId: string) {
    if (!taskId) throw new Error("Task ID required");

    // 1. Delete associated JobCards first (simulating cascade)
    await prisma.jobCard.deleteMany({
        where: { weeklyTaskId: taskId }
    });

    // 2. Delete the WeeklyTask
    await prisma.weeklyTask.delete({
        where: { id: taskId }
    });

    revalidatePath("/admin/schedule");
}

export async function deleteJobCard(jobCardId: string) {
    if (!jobCardId) throw new Error("Job Card ID required");

    // Delete associated work logs first (if strict cascade isn't set in DB, but usually cascade handles it. 
    // Schema says logs have relation. Let's rely on cascade or delete manually if needed.
    // Looking at schema: WorkLog has relation to JobCard. 
    // If we assume DB handles generic cascade, we just delete JobCard.
    // If not, we should delete logs. Safe to delete logs.
    await prisma.workLog.deleteMany({ where: { jobCardId } });

    await prisma.jobCard.delete({
        where: { id: jobCardId }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/schedule");
}

export async function updateJobCard(formData: FormData) {
    const id = formData.get("id") as string;
    const status = formData.get("status") as string;
    const employeeId = formData.get("employeeId") as string;
    const targetQty = parseInt(formData.get("targetQty") as string);
    const targetDateStr = formData.get("targetDate") as string;

    if (!id) throw new Error("Job Card ID required");

    const data: any = {};
    if (status) data.status = status;
    if (employeeId && employeeId !== "unassigned") data.employeeId = employeeId;
    if (employeeId === "unassigned") data.employeeId = null;
    if (!isNaN(targetQty)) data.targetQty = targetQty;
    if (targetDateStr) data.targetDate = new Date(targetDateStr);

    await prisma.jobCard.update({
        where: { id },
        data
    });

    revalidatePath("/admin");
    revalidatePath("/admin/schedule");
}


// --- Admin Authentication Actions ---

export async function loginAdmin(formData: FormData) {
    // SECURITY TODO (Bug 8): Passwords are stored and compared as plaintext.
    // Migrate to bcrypt: run a one-time script to hash all existing passwords,
    // then replace `user.password !== password` with `await bcrypt.compare(password, user.hash)`.
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
        return { error: "Username and Password required" };
    }

    const user = await prisma.user.findUnique({
        where: { username }
    });

    if (!user || user.password !== password) {
        return { error: "Invalid credentials" };
    }

    // Set cookie
    (await cookies()).set("adminId", user.id, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    redirect("/admin");
}

export async function logoutAdmin() {
    (await cookies()).delete("adminId");
    redirect("/admin/login");
}

export async function toggleProjectStatus(projectId: string, newStatus: string) {
    if (!projectId) throw new Error("Project ID required");

    await prisma.project.update({
        where: { id: projectId },
        data: { status: newStatus }
    });

    revalidatePath("/admin/projects");
}

export async function updateAdminPassword(formData: FormData) {
    // SECURITY TODO (Bug 8): Passwords stored as plaintext — see loginAdmin note above.
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const adminId = (await cookies()).get("adminId")?.value;
    if (!adminId) return { error: "Not authenticated" };

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: "All fields are required" };
    }

    if (newPassword !== confirmPassword) {
        return { error: "New passwords do not match" };
    }

    // Enforce a minimum password length as a basic strength gate
    if (newPassword.length < 8) {
        return { error: "New password must be at least 8 characters" };
    }

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.password !== currentPassword) {
        return { error: "Incorrect current password" };
    }

    await prisma.user.update({
        where: { id: adminId },
        data: { password: newPassword }
    });

    return { success: true };
}



export async function getCurrentAdmin() {
    const adminId = (await cookies()).get("adminId")?.value;
    if (!adminId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { id: adminId },
            select: { id: true, username: true, role: true }
        });
        return user;
    } catch (e) {
        return null;
    }
}

export async function getAdminUsers() {
    return await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, username: true, role: true, name: true, phoneNumber: true, address: true, createdAt: true, basicSalary: true }
    });
}

export async function createAdminUser(formData: FormData) {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string || "ADMIN";
    const name = formData.get("name") as string || null;
    const phoneNumber = formData.get("phoneNumber") as string || null;
    const address = formData.get("address") as string || null;
    const basicSalaryStr = formData.get("basicSalary") as string;
    const basicSalary = basicSalaryStr ? parseFloat(basicSalaryStr) : 0;

    const adminId = (await cookies()).get("adminId")?.value;
    if (!adminId) return { error: "Not authenticated" };

    if (!username || !password) return { error: "Username and password required" };

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return { error: "Username already exists" };

    await prisma.user.create({
        data: { username, password, role, name, phoneNumber, address, basicSalary }
    });

    revalidatePath("/admin/settings");
    return { success: true };
}

export async function updateAdminUser(formData: FormData) {
    const id = formData.get("id") as string;
    const role = formData.get("role") as string;
    const name = formData.get("name") as string || null;
    const phoneNumber = formData.get("phoneNumber") as string || null;
    const address = formData.get("address") as string || null;
    const basicSalaryStr = formData.get("basicSalary") as string;
    const basicSalary = basicSalaryStr ? parseFloat(basicSalaryStr) : 0;

    const adminId = (await cookies()).get("adminId")?.value;
    if (!adminId) return { error: "Not authenticated" };
    if (!id) return { error: "User ID required" };

    try {
        await prisma.user.update({
            where: { id },
            data: { role, name, phoneNumber, address, basicSalary }
        });
        revalidatePath("/admin/settings");
        revalidatePath("/admin/hr");
        revalidatePath("/admin/financial-reports");
        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to update user" };
    }
}

export async function deleteAdminUser(formData: FormData) {
    const targetUserId = formData.get("id") as string;
    const currentAdminId = (await cookies()).get("adminId")?.value;

    if (!currentAdminId) return { error: "Not authenticated" };
    if (!targetUserId) return { error: "Target User ID required" };
    if (targetUserId === currentAdminId) return { error: "Cannot delete yourself" };

    await prisma.user.delete({ where: { id: targetUserId } });

    revalidatePath("/admin/settings");
    return { success: true };
}


// --- System Settings & Branding ---

export async function getSystemSettings() {
    let settings = await prisma.systemSettings.findUnique({
        where: { id: "default" }
    });

    if (!settings) {
        settings = await prisma.systemSettings.create({
            data: {
                id: "default",
                factoryName: "Factory Manager",
            }
        });
    }

    return settings;
}

export async function updateSystemSettings(formData: FormData) {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("adminId")?.value;

    if (!adminId) throw new Error("Not authenticated");

    const adminUser = await prisma.user.findUnique({
        where: { id: adminId }
    });

    // Allow ADMIN, SUPER_ADMIN, and FACTORY_MANAGER to modify settings
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "FACTORY_MANAGER"];
    if (!adminUser || !allowedRoles.includes(adminUser.role)) {
        throw new Error("Unauthorized: Insufficient privileges to modify settings");
    }

    const factoryName = formData.get("factoryName") as string;
    const logoUrl = formData.get("logoUrl") as string;
    const faviconUrl = formData.get("faviconUrl") as string;
    const resourceLink = formData.get("resourceLink") as string;
    const themeMode = formData.get("themeMode") as string;
    const primaryColor = formData.get("primaryColor") as string;
    const geminiApiKey = formData.get("geminiApiKey") as string;
    const kioskJobStartEndEnabled = formData.get("kioskJobStartEndEnabled") === "true";
    
    // Working hours
    const workHoursMonday = formData.has("workHoursMonday") ? parseFloat(formData.get("workHoursMonday") as string) : undefined;
    const workHoursTuesday = formData.has("workHoursTuesday") ? parseFloat(formData.get("workHoursTuesday") as string) : undefined;
    const workHoursWednesday = formData.has("workHoursWednesday") ? parseFloat(formData.get("workHoursWednesday") as string) : undefined;
    const workHoursThursday = formData.has("workHoursThursday") ? parseFloat(formData.get("workHoursThursday") as string) : undefined;
    const workHoursFriday = formData.has("workHoursFriday") ? parseFloat(formData.get("workHoursFriday") as string) : undefined;
    const workHoursSaturday = formData.has("workHoursSaturday") ? parseFloat(formData.get("workHoursSaturday") as string) : undefined;
    const workHoursSunday = formData.has("workHoursSunday") ? parseFloat(formData.get("workHoursSunday") as string) : undefined;

    // HR Payroll Overtime Rate
    const otRatePerHour = formData.has("otRatePerHour") ? parseFloat(formData.get("otRatePerHour") as string) : undefined;

    console.log("updateSystemSettings received:", {
        factoryName,
        otRatePerHour,
        kioskRaw: formData.get("kioskJobStartEndEnabled"),
        kioskParsed: kioskJobStartEndEnabled
    });

    await prisma.systemSettings.upsert({
        where: { id: "default" },
        update: {
            factoryName,
            logoUrl: logoUrl || undefined,
            faviconUrl: faviconUrl || undefined,
            resourceLink: resourceLink || undefined,
            themeMode: themeMode || undefined,
            primaryColor: primaryColor || undefined,
            geminiApiKey: geminiApiKey || undefined,
            kioskJobStartEndEnabled,
            workHoursMonday,
            workHoursTuesday,
            workHoursWednesday,
            workHoursThursday,
            workHoursFriday,
            workHoursSaturday,
            workHoursSunday,
            otRatePerHour
        },
        create: {
            id: "default",
            factoryName,
            logoUrl,
            faviconUrl,
            resourceLink: resourceLink || "/uploads/",
            themeMode: themeMode || "system",
            primaryColor: primaryColor || "#01cd74",
            geminiApiKey: geminiApiKey || undefined,
            kioskJobStartEndEnabled,
            workHoursMonday: workHoursMonday ?? 8,
            workHoursTuesday: workHoursTuesday ?? 8,
            workHoursWednesday: workHoursWednesday ?? 8,
            workHoursThursday: workHoursThursday ?? 8,
            workHoursFriday: workHoursFriday ?? 8,
            workHoursSaturday: workHoursSaturday ?? 8,
            workHoursSunday: workHoursSunday ?? 0,
            otRatePerHour: otRatePerHour ?? 0
        }
    });

    revalidatePath("/admin");
    revalidatePath("/kiosk");
}

export async function getStorageStats() {
    try {
        const uploadDir = join(process.cwd(), "public", "uploads");
        const files = await readdir(uploadDir);
        let totalSize = 0;

        for (const file of files) {
            const stats = await stat(join(uploadDir, file));
            totalSize += stats.size;
        }

        return {
            count: files.length,
            sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    } catch (error) {
        return { count: 0, sizeMB: "0.00" };
    }
}

export async function adminSubmitWorkLog(formData: FormData) {
    const adminId = (await cookies()).get("adminId")?.value;
    if (!adminId) throw new Error("Unauthorized: Admin access required");

    const jobCardId = formData.get("jobCardId") as string;
    const employeeId = formData.get("employeeId") as string;
    const dateStr = formData.get("date") as string;
    const hoursSpentStr = formData.get("hoursSpent") as string;
    const outputQtyStr = formData.get("outputQty") as string;
    const completed = formData.get("completed") === "true";

    if (!jobCardId || !employeeId || !hoursSpentStr) {
        throw new Error("Missing required fields");
    }

    await prisma.workLog.create({
        data: {
            jobCardId,
            employeeId,
            date: dateStr ? new Date(dateStr) : new Date(),
            hoursSpent: parseFloat(hoursSpentStr), // This might be "hours" in schema? Re-check schema.
            outputQty: parseInt(outputQtyStr) || 0,
        },
    });

    if (completed) {
        await prisma.jobCard.update({
            where: { id: jobCardId },
            data: {
                status: "COMPLETED",
                isFinished: true,
                completedAt: new Date()
            },
        });
    }

    revalidatePath("/admin");
}

export async function toggleJobStatus(jobId: string, isFinished: boolean) {
    const adminId = (await cookies()).get("adminId")?.value;
    if (!adminId) throw new Error("Unauthorized");

    await prisma.jobCard.update({
        where: { id: jobId },
        data: {
            status: isFinished ? "COMPLETED" : "PENDING",
            isFinished: isFinished,
            completedAt: isFinished ? new Date() : null
        }
    });
    revalidatePath("/admin");
}
