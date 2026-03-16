import { getSections } from "@/app/actions";
import { getMesScheduleData } from "@/app/actions/mes";
import { prisma } from "@/lib/prisma";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import MesScheduleClient from "@/components/admin/schedule/mes-schedule-client";
import ScheduleDateNavigator from "@/components/admin/schedule-date-navigator";
import { cookies } from "next/headers";

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MesSchedulePage({ searchParams }: Props) {
    const { date } = await searchParams;
    const dateStr = typeof date === 'string'
        ? date
        : new Date().toISOString().split('T')[0];

    // Fetch Data
    const { projects, weekNum, employeesOnLeave, allApprovedLeaves, allApprovedMaintenances } = await getMesScheduleData(dateStr);
    const sections = await getSections();
    const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });
    const machines = await prisma.machine.findMany({ orderBy: { name: 'asc' } });
    const users = await prisma.user.findMany({ select: { id: true, name: true, username: true, role: true }, orderBy: { name: 'asc' } });

    // Get current user role
    const cookieStore = await cookies();
    const adminId = cookieStore.get("adminId")?.value;
    let currentUserRole = "USER";
    if (adminId) {
        const currentUser = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
        if (currentUser) {
            currentUserRole = currentUser.role;
        }
    }

    return (
        <AdminPageLayout
            title="Production Scheduler (MES)"
            description={`Manage Daily and Weekly assignments. Viewing Day: ${dateStr} / Week: ${weekNum}`}
            action={<ScheduleDateNavigator currentDate={dateStr} />}
            className="flex-1 p-0 md:p-0 space-y-0"
        >
            <div className="w-full p-6">
                <MesScheduleClient
                    projects={projects}
                    sections={sections}
                    employees={employees}
                    machines={machines}
                    users={users}
                    currentDate={dateStr}
                    weekNum={weekNum}
                    currentUserRole={currentUserRole}
                    employeesOnLeave={employeesOnLeave}
                    allApprovedLeaves={allApprovedLeaves}
                    allApprovedMaintenances={allApprovedMaintenances}
                />
            </div>
        </AdminPageLayout>
    );
}