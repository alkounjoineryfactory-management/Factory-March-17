"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recordTransaction } from "./financials";

export async function getHRDashboardData() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [employees, rawTodayAttendance, leaveRequests, machines, maintenanceRequests, users, todayWorkLogs] = await Promise.all([
            // Get all employees with their sections
            prisma.employee.findMany({
                include: {
                    section: true,
                },
                orderBy: {
                    name: "asc",
                },
            }),
            // Get today's attendance records
            prisma.attendance.findMany({
                where: {
                    date: {
                        gte: today,
                        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                include: {
                    employee: {
                        include: {
                            section: true,
                        }
                    }
                },
            }),
            // Get all pending and some recent leave requests
            prisma.leaveRequest.findMany({
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    employee: {
                        include: {
                            section: true,
                        }
                    },
                    user: true
                },
                take: 50,
            }),
            // Get all machines with sections
            prisma.machine.findMany({
                include: {
                    section: true,
                },
                orderBy: {
                    name: "asc"
                }
            }),
            // Get maintenance requests
            prisma.machineMaintenance.findMany({
                orderBy: {
                    createdAt: "desc"
                },
                include: {
                    machine: {
                        include: {
                            section: true
                        }
                    }
                },
                take: 50
            }),
            // Get all admin users for payroll
            prisma.user.findMany({
                orderBy: {
                    name: "asc"
                }
            }),
            // Get today's work logs as a fallback for missing attendance
            prisma.workLog.findMany({
                where: {
                    date: {
                        gte: today,
                        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                include: {
                    employee: {
                        include: {
                            section: true,
                        }
                    }
                }
            })
        ]);

        // Merge WorkLogs into Attendance if the employee didn't explicitly check-in but completed a job
        const attendanceMap = new Map(rawTodayAttendance.map(a => [a.employeeId, a]));
        
        todayWorkLogs.forEach(log => {
            if (!attendanceMap.has(log.employeeId)) {
                attendanceMap.set(log.employeeId, {
                    id: `synthetic-${log.id}`,
                    employeeId: log.employeeId,
                    employee: log.employee,
                    date: log.date,
                    checkIn: log.date, // Estimate based on log
                    checkOut: log.date,
                    status: "PRESENT",
                    createdAt: log.date,
                    updatedAt: log.date
                } as any);
            }
        });

        const todayAttendance = Array.from(attendanceMap.values());

        return { employees, todayAttendance, leaveRequests, machines, maintenanceRequests, users };
    } catch (error) {
        console.error("Failed to fetch HR dashboard data:", error);
        throw new Error("Failed to fetch HR data");
    }
}

export async function updateEmployeeHRDetails(
    id: string,
    data: {
        basicSalary?: number | null;
        joiningDate?: Date | null;
        status?: string;
    }
) {
    try {
        const updated = await prisma.employee.update({
            where: { id },
            data: {
                ...data,
            },
        });
        revalidatePath("/admin/hr");
        return updated;
    } catch (error) {
        console.error("Failed to update employee HR details:", error);
        throw new Error("Failed to update employee");
    }
}

export async function markAttendance(data: {
    employeeId: string;
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    status: string; // PRESENT, ABSENT, HALF_DAY, LEAVE
}) {
    try {
        // Find existing record for this employee on this date
        const startOfDay = new Date(data.date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const existingRecord = await prisma.attendance.findFirst({
            where: {
                employeeId: data.employeeId,
                date: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
        });

        if (existingRecord) {
            // Update existing
            await prisma.attendance.update({
                where: { id: existingRecord.id },
                data: {
                    checkIn: data.checkIn !== undefined ? data.checkIn : existingRecord.checkIn,
                    checkOut: data.checkOut !== undefined ? data.checkOut : existingRecord.checkOut,
                    status: data.status,
                },
            });
        } else {
            // Create new
            await prisma.attendance.create({
                data: {
                    employeeId: data.employeeId,
                    date: startOfDay,
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    status: data.status,
                },
            });
        }

        revalidatePath("/admin/hr");
        return { success: true };
    } catch (error) {
        console.error("Failed to mark attendance:", error);
        throw new Error("Failed to mark attendance");
    }
}

export async function createLeaveRequest(data: {
    employeeId?: string;
    userId?: string;
    startDate: Date;
    endDate: Date;
    type: string;
    reason?: string;
}) {
    if (!data.employeeId && !data.userId) {
        throw new Error("Must provide either an employeeId or userId");
    }

    try {
        const request = await prisma.leaveRequest.create({
            data: {
                employeeId: data.employeeId,
                userId: data.userId,
                startDate: data.startDate,
                endDate: data.endDate,
                type: data.type,
                reason: data.reason,
                status: "PENDING",
            },
        });
        revalidatePath("/admin/hr");
        return request;
    } catch (error) {
        console.error("Failed to create leave request:", error);
        throw new Error("Failed to submit request");
    }
}

export async function getUserLeaveRequests(userId: string) {
    try {
        const requests = await prisma.leaveRequest.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return requests;
    } catch (error) {
        console.error("Failed to fetch user leave requests:", error);
        throw new Error("Failed to fetch leave history");
    }
}

export async function updateLeaveRequestStatus(
    id: string,
    data: {
        status: string;
        isPaid?: boolean;
        rejectionReason?: string;
    }
) {
    try {
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: data.status,
                isPaid: data.isPaid,
                rejectionReason: data.rejectionReason,
            },
        });
        revalidatePath("/admin/hr");
        return updated;
    } catch (error) {
        console.error("Failed to update leave request status:", error);
        throw new Error("Failed to update request");
    }
}

export async function createMachineMaintenance(data: {
    machineId: string;
    startDate: Date;
    endDate: Date;
    type: string;
    reason?: string;
}) {
    try {
        const request = await prisma.machineMaintenance.create({
            data: {
                machineId: data.machineId,
                startDate: data.startDate,
                endDate: data.endDate,
                type: data.type,
                reason: data.reason,
                status: "PENDING",
            },
        });
        revalidatePath("/admin/hr");
        return request;
    } catch (error) {
        console.error("Failed to create machine maintenance:", error);
        throw new Error("Failed to submit maintenance");
    }
}

export async function updateMachineMaintenanceStatus(
    id: string,
    data: {
        status: string;
        rejectionReason?: string;
    }
) {
    try {
        const updated = await prisma.machineMaintenance.update({
            where: { id },
            data: {
                status: data.status,
                rejectionReason: data.rejectionReason,
            },
        });
        revalidatePath("/admin/hr");
        return updated;
    } catch (error) {
        console.error("Failed to update maintenance status:", error);
        throw new Error("Failed to update maintenance");
    }
}

export async function getMonthlyOTPay(monthStr: string) {
    try {
        // monthStr is like "March 2026". The non-standard "Month YYYY DD" format can produce
        // Invalid Date in some JS engines. Use a safe parse: split on space and build from parts.
        const parts = monthStr.trim().split(" "); // ["March", "2026"]
        const monthIndex = new Date(`${parts[0]} 1 2000`).getMonth(); // Reliable month name -> 0-11
        const year = parseInt(parts[1], 10);
        if (isNaN(monthIndex) || isNaN(year)) {
            console.error(`getMonthlyOTPay: invalid monthStr "${monthStr}"`);
            return {};
        }
        const startDate = new Date(year, monthIndex, 1, 0, 0, 0);
        const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        const overtimeRecords = await getOvertimeData(startDate, endDate);
        
        const otPayMap: Record<string, number> = {};
        for (const record of overtimeRecords) {
            if (!otPayMap[record.employeeId]) {
                otPayMap[record.employeeId] = 0;
            }
            otPayMap[record.employeeId] += record.overtimePay || 0;
        }

        return otPayMap;
    } catch (error) {
        console.error("Failed to fetch monthly OT pay:", error);
        return {};
    }
}

export async function getSalaryPayments(month: string) {
    try {
        const payments = await prisma.salaryPayment.findMany({
            where: {
                month: month
            }
        });
        return payments;
    } catch (error) {
        console.error("Failed to fetch salary payments:", error);
        throw new Error("Failed to fetch salary payments");
    }
}

export async function paySalary(data: {
    employeeId?: string;
    userId?: string;
    amount: number;
    month: string;
}) {
    try {
        // 1. Record the payment
        const payment = await prisma.salaryPayment.create({
            data: {
                employeeId: data.employeeId,
                userId: data.userId,
                amount: data.amount,
                month: data.month,
                status: "PAID",
                paymentDate: new Date(),
            }
        });

        // 2. Automatically record standard double-entry transaction
        try {
            // Find default accounts or fallback codes
            const cashAccount = await prisma.chartOfAccount.findFirst({
                where: { name: { contains: "Cash", }, category: "Asset" }
            }) || await prisma.chartOfAccount.findUnique({ where: { code: "1000" } });

            const salaryAccount = await prisma.chartOfAccount.findFirst({
                where: { name: { contains: "Salary", }, category: "Expense" }
            }) || await prisma.chartOfAccount.findUnique({ where: { code: "6000" } });

            if (cashAccount && salaryAccount) {
                const entityName = data.employeeId ? "Employee" : "Admin";
                await recordTransaction({
                    date: new Date(),
                    description: `Salary Payment for ${data.month} - ${entityName}`,
                    amount: data.amount,
                    type: "EXPENSE",
                    debitAccountId: salaryAccount.id, // Increase Expense (Debit)
                    creditAccountId: cashAccount.id,  // Decrease Asset (Credit)
                });
            }
        } catch (ledgerError) {
            console.error("Warning: Failed to auto-record ledger transaction for salary:", ledgerError);
            // Optionally, we could throw here, but let's just log the warning so the salary payment itself succeeds 
            // even if the ledger is misconfigured. In a strict system, this would throw.
        }

        revalidatePath("/admin/hr");
        revalidatePath("/admin/financial-reports");
        return payment;
    } catch (error) {
        console.error("Failed to process salary payment:", error);
        throw new Error("Failed to process salary payment");
    }
}

export async function getOvertimeData(startDate: Date, endDate: Date, projectId?: string, sectionId?: string, subSectionId?: string) {
    try {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: "default" }
        });

        // Set default hours if settings logic is missing
        const standardHoursMap: Record<number, number> = {
            0: settings?.workHoursSunday ?? 0,
            1: settings?.workHoursMonday ?? 8,
            2: settings?.workHoursTuesday ?? 8,
            3: settings?.workHoursWednesday ?? 8,
            4: settings?.workHoursThursday ?? 8,
            5: settings?.workHoursFriday ?? 8,
            6: settings?.workHoursSaturday ?? 8,
        };

        // Query JobCards instead of WorkLogs so that jobs completed via admin schedule
        // (where actualHrs is set without creating a WorkLog record) are included.
        const whereClause: any = {
            day: {
                gte: startDate,
                lte: endDate,
            },
            status: 'COMPLETED',
            employeeId: { not: null },
            actualHrs: { gt: 0 }
        };

        if (projectId && projectId !== "all") {
            whereClause.projectId = projectId;
        }

        if ((sectionId && sectionId !== "all") || (subSectionId && subSectionId !== "all")) {
            whereClause.employee = {};
            if (sectionId && sectionId !== "all") whereClause.employee.sectionId = sectionId;
            if (subSectionId && subSectionId !== "all") whereClause.employee.subSectionId = subSectionId;
        }

        const jobCards = await prisma.jobCard.findMany({
            where: whereClause,
            include: {
                employee: {
                    include: {
                        section: true,
                        subSection: true
                    }
                },
                project: true
            },
            orderBy: {
                day: 'asc'
            }
        });

        // Group by Employee + Day (using job.day as the scheduled work date)
        const groupedJobs: Record<string, {
            employeeId: string;
            employeeName: string;
            employeeRole: string;
            date: string;
            dateObj: Date;
            totalHours: number;
            projects: Set<string>;
        }> = {};

        jobCards.forEach(job => {
            const workDate = job.day || job.targetDate;
            const dateStr = workDate.toISOString().split('T')[0];
            const key = `${job.employeeId}_${dateStr}`;

            if (!groupedJobs[key]) {
                const roleParts = [];
                if (job.employee?.section?.name) roleParts.push(job.employee.section.name);
                // @ts-ignore
                if (job.employee?.subSection?.name) roleParts.push(job.employee.subSection.name);

                groupedJobs[key] = {
                    employeeId: job.employeeId!,
                    employeeName: job.employee?.name || 'Unknown',
                    employeeRole: roleParts.length > 0 ? roleParts.join(' / ') : "Staff",
                    date: dateStr,
                    dateObj: workDate,
                    totalHours: 0,
                    projects: new Set<string>()
                };
            }

            groupedJobs[key].totalHours += job.actualHrs || 0;
            if (job.project?.name) {
                groupedJobs[key].projects.add(job.project.name);
            }
        });

        // Calculate Overtime
        const overtimeRecords = Object.values(groupedJobs).map(record => {
            const localDate = new Date(record.date + "T12:00:00Z");
            const dayOfWeek = localDate.getDay(); // 0 is Sunday
            const standardHours = standardHoursMap[dayOfWeek];

            const overtimeHours = Math.max(0, record.totalHours - standardHours);
            const overtimePay = overtimeHours * (settings?.otRatePerHour || 0);

            return {
                ...record,
                projects: Array.from(record.projects).join(", "),
                standardHours,
                overtimeHours,
                overtimePay
            };
        });

        // Sort by Date DESC, then by Name
        return overtimeRecords.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return a.employeeName.localeCompare(b.employeeName);
        });

    } catch (error) {
        console.error("Failed to fetch overtime data:", error);
        throw new Error("Failed to fetch overtime records");
    }
}

