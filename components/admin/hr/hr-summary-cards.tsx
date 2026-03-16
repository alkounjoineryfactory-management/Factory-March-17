"use client";

import { useMemo } from "react";
import { Users, UserCheck, UserMinus, Factory, ArrowUpRight, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HrSummaryCardsProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    employees: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attendance: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    leaveRequests: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    machines: any[];
}

export function HrSummaryCards({ employees, users, attendance, leaveRequests, machines }: HrSummaryCardsProps) {
    // 1. Total Workforce
    const totalWorkforce = employees.length + users.length;

    // 2. Present Today
    const presentToday = useMemo(() => {
        return attendance.filter(a => a.status === "PRESENT").length;
    }, [attendance]);
    const attendanceRate = employees.length > 0 ? (presentToday / employees.length) * 100 : 0;

    // 3. Active Leaves Today
    const activeLeaves = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return leaveRequests.filter(l => {
            if (l.status !== "APPROVED") return false;
            const start = new Date(l.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(l.endDate);
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
        }).length;
    }, [leaveRequests]);

    // 4. Machine Health
    const operationalMachines = machines.filter(m => m.status === "OPERATIONAL").length;
    const totalMachines = machines.length;
    const machineHealth = totalMachines > 0 ? (operationalMachines / totalMachines) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-2">

            {/* CARD 1: TOTAL WORKFORCE */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                        <Users className="w-5 h-5 text-indigo-500" />
                    </div>
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Workforce</h3>
                    <p className="text-3xl font-bold font-mono tracking-tight text-foreground">
                        {totalWorkforce}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-indigo-500" /> {employees.length} factory, {users.length} admin
                    </p>
                </div>
            </div>

            {/* CARD 2: PRESENT TODAY */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                        <UserCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    {employees.length > 0 && (
                        <Badge variant="outline" className="font-mono text-emerald-500 border-emerald-500/30">
                            {attendanceRate.toFixed(1)}% Rate
                        </Badge>
                    )}
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Present Today</h3>
                    <p className="text-3xl font-bold font-mono tracking-tight text-emerald-500">
                        {presentToday}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        Out of {employees.length} scheduled factory workers
                    </p>
                </div>
            </div>

            {/* CARD 3: ON LEAVE */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-orange-500/10 rounded-xl">
                        <UserMinus className="w-5 h-5 text-orange-500" />
                    </div>
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">On Leave Today</h3>
                    <p className="text-3xl font-bold font-mono tracking-tight text-orange-500">
                        {activeLeaves}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        Approved active leave requests
                    </p>
                </div>
            </div>

            {/* CARD 4: MACHINE HEALTH */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10 xl:mb-2">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl">
                        <Factory className="w-5 h-5 text-purple-500" />
                    </div>
                    {totalMachines > 0 && (
                        <Badge variant="outline" className={`font-mono ${machineHealth === 100 ? 'text-emerald-500 border-emerald-500/30' : 'text-purple-500 border-purple-500/30'}`}>
                            {machineHealth.toFixed(0)}% Health
                        </Badge>
                    )}
                </div>

                <div className="relative z-10 space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1 hidden xl:block">Asset Utilization</h3>

                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="w-3 h-3 text-emerald-500" /> Operational</span>
                        <span className="font-mono font-medium text-emerald-500">{operationalMachines}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="w-3 h-3 text-rose-500" /> Offline / Maint.</span>
                        <span className="font-mono font-medium text-rose-500">{totalMachines - operationalMachines}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
