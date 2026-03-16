import { getHRDashboardData } from "@/app/actions/hr";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HrDirectoryTab } from "@/components/admin/hr/hr-directory-tab";
import { HrAttendanceTab } from "@/components/admin/hr/hr-attendance-tab";
import { HrLeavesTab } from "@/components/admin/hr/hr-leaves-tab";
import { HrMachinesTab } from "@/components/admin/hr/hr-machines-tab";
import { HrPaySalaryTab } from "@/components/admin/hr/hr-pay-salary-tab";
import { HrSummaryCards } from "@/components/admin/hr/hr-summary-cards";
import HROvertimeTab from "@/components/admin/hr/hr-overtime-tab";

export default async function HRDashboardPage() {
    const { employees, todayAttendance, leaveRequests, machines, maintenanceRequests, users } = await getHRDashboardData();

    return (
        <AdminPageLayout
            title="HR & Payroll Management"
            description="Manage employee directory, daily attendance tracking, and leave requests."
        >
            <div className="space-y-6 flex flex-col">
                <HrSummaryCards
                    employees={employees}
                    users={users}
                    attendance={todayAttendance}
                    leaveRequests={leaveRequests}
                    machines={machines}
                />

                <Tabs defaultValue="directory" className="w-full">
                    <TabsList className="grid w-full grid-cols-6 bg-card/60 backdrop-blur-xl border border-black/5 dark:border-white/5 p-1 rounded-2xl h-14">
                        <TabsTrigger value="directory" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all font-semibold tracking-wide">
                            Employee Directory
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all font-semibold tracking-wide">
                            Daily Attendance
                        </TabsTrigger>
                        <TabsTrigger value="leaves" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all font-semibold tracking-wide">
                            Leave Requests
                        </TabsTrigger>
                        <TabsTrigger value="machines" className="rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all font-semibold tracking-wide">
                            Machines
                        </TabsTrigger>
                        <TabsTrigger value="salary" className="rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all font-semibold tracking-wide">
                            Pay Salary
                        </TabsTrigger>
                        <TabsTrigger value="overtime" className="rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all font-semibold tracking-wide">
                            Overtime
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-8">
                        <TabsContent value="directory" className="m-0 border-0 outline-none">
                            <HrDirectoryTab employees={employees} />
                        </TabsContent>

                        <TabsContent value="attendance" className="m-0 border-0 outline-none">
                            <HrAttendanceTab employees={employees} attendance={todayAttendance} />
                        </TabsContent>

                        <TabsContent value="leaves" className="m-0 border-0 outline-none">
                            <HrLeavesTab requests={leaveRequests} employees={employees} users={users} />
                        </TabsContent>

                        <TabsContent value="machines" className="m-0 border-0 outline-none">
                            <HrMachinesTab requests={maintenanceRequests} machines={machines} />
                        </TabsContent>

                        <TabsContent value="salary" className="m-0 border-0 outline-none">
                            <HrPaySalaryTab employees={employees} users={users} />
                        </TabsContent>

                        <TabsContent value="overtime" className="m-0 border-0 outline-none">
                            <HROvertimeTab />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </AdminPageLayout>
    );
}
