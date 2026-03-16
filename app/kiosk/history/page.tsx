import { prisma } from "@/lib/prisma";
import { getWorkerHistory } from "../../actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import KioskBottomNav from "@/components/kiosk/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, CalendarDays, History, Filter, CalendarIcon } from "lucide-react";
import HistoryClient from "./history-client";

function formatDuration(start: Date | null, end: Date | null) {
    if (!start || !end) return "N/A";
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

export default async function KioskHistoryPage({
    searchParams
}: {
    searchParams: { date?: string }
}) {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get("employeeId")?.value;

    if (!employeeId) {
        redirect("/kiosk/login");
    }

    const employee = await prisma.employee.findUnique({
        where: { id: employeeId }
    });

    if (!employee) {
        redirect("/kiosk/login");
    }

    // Determine selected date
    const selectedDateStr = typeof (await searchParams).date === 'string' ? (await searchParams).date : undefined;
    let selectedDate: Date | undefined = undefined;
    if (selectedDateStr) {
        const [year, month, day] = selectedDateStr.split("-").map(Number);
        selectedDate = new Date(year, month - 1, day);
    }

    const completedJobs = await getWorkerHistory(employeeId, selectedDate);

    // Group by Week Number, then Project
    const groupedHistory: Record<string, Record<string, typeof completedJobs>> = {};

    completedJobs.forEach(job => {
        const weekKey = job.weeklyPlan ? `Week ${job.weeklyPlan.weekNumber}` : "Unplanned";
        const projectKey = job.project.name;

        if (!groupedHistory[weekKey]) groupedHistory[weekKey] = {};
        if (!groupedHistory[weekKey][projectKey]) groupedHistory[weekKey][projectKey] = [];

        groupedHistory[weekKey][projectKey].push(job);
    });

    return (
        <div className="container mx-auto p-4 min-h-screen pb-24 font-sans text-slate-50">
            <header className="mb-6 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex items-center gap-4">
                <div className="p-3 rounded-full bg-slate-800/80 text-indigo-400">
                    <History className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Work History</h1>
                    <div className="text-sm text-slate-400">Completed jobs for <span className="text-indigo-300 font-medium">{employee.name}</span></div>
                </div>
            </header>
            
            <HistoryClient selectedDateStr={selectedDateStr} />

            <div className="space-y-8">
                {Object.keys(groupedHistory).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                        <History className="w-16 h-16 mb-4 opacity-20" />
                        <div className="text-lg">No history found.</div>
                    </div>
                ) : (
                    Object.entries(groupedHistory).map(([week, projects]) => (
                        <div key={week} className="space-y-4">
                            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider pl-1 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" /> {week}
                            </h2>
                            {Object.entries(projects).map(([project, jobs]) => (
                                <Card key={project} className="overflow-hidden bg-slate-900 border-slate-800 shadow-md">
                                    <CardHeader className="bg-slate-950/30 py-3 px-4 border-b border-slate-800">
                                        <CardTitle className="text-base font-medium text-slate-200">{project}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Task</th>
                                                    <th className="px-4 py-3 text-right font-medium">Time</th>
                                                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                                                    <th className="px-4 py-3 text-right font-medium">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {jobs.map(job => (
                                                    <tr key={job.id} className="hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-slate-300">{job.description}</td>
                                                        <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">
                                                            {job.logs.reduce((acc, log) => acc + log.hoursSpent, 0).toFixed(1)}h
                                                            {/* {formatDuration(job.startedAt, job.completedAt)} */}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-slate-300 font-semibold">{job.actualQty}</td>
                                                        <td className="px-4 py-3 text-right text-slate-500 text-xs">
                                                            {job.completedAt ? new Date(job.completedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                    <div className="bg-slate-950/50 px-4 py-2 text-xs text-slate-500 text-right font-medium border-t border-slate-800 flex justify-end gap-4">
                                        <span>Items: <span className="text-emerald-400">{jobs.reduce((acc, j) => acc + j.actualQty, 0)}</span></span>
                                        <span>Est. Hours: <span className="text-indigo-400">{jobs.reduce((acc, j) => acc + j.targetHours, 0).toFixed(1)}</span></span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ))
                )}
            </div>

            <KioskBottomNav />
        </div>
    );
}
