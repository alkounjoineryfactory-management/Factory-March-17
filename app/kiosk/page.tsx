import { prisma } from "@/lib/prisma";
import { getMachines, getSystemSettings } from "../actions";
import KioskClient from "./kiosk-client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutEmployee } from "./actions"; // Import from local actions
import KioskBottomNav from "@/components/kiosk/bottom-nav";
import { LogOut, User } from "lucide-react";

export default async function KioskPage({
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
        // Cookie exists but invalid ID
        redirect("/kiosk/login");
    }

    const machines = await getMachines();

    // Determine selected date (default: today)
    const selectedDateStr = typeof (await searchParams).date === 'string' ? (await searchParams).date : undefined;
    
    let selectedDate = new Date(); // Local today
    if (selectedDateStr) {
        // Safely parse "YYYY-MM-DD" to local time to avoid UTC shift bug
        const [year, month, day] = selectedDateStr.split("-").map(Number);
        selectedDate = new Date(year, month - 1, day);
    }
    
    // Create start and end boundaries for the selected day in local time
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch only this employee's jobs that are active OR were targeted/completed on this specific day
    const jobs = await prisma.jobCard.findMany({
        where: {
            employeeId: employeeId,
            OR: [
                // Option A: Job is active (PENDING or IN_PROGRESS) AND its target date is on or before the selected end of day
                {
                    status: { not: "COMPLETED" },
                    targetDate: { lte: endOfDay }
                },
                // Option B: Job was actually COMPLETED on this specific selected day
                {
                    status: "COMPLETED",
                    completedAt: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            ]
        },
        orderBy: { targetDate: 'asc' },
        include: {
            project: true,
            section: true,
            machine: true,
            weeklyPlan: true
        }
    });

    const systemSettings = await getSystemSettings();

    return (
        <div className="container mx-auto p-4 min-h-screen pb-24 font-sans">
            <header className="mb-6 flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-1">
                        {systemSettings?.logoUrl ? (
                            <img
                                src={systemSettings.logoUrl}
                                alt={systemSettings.factoryName}
                                className="h-8 w-auto object-contain bg-black/10 dark:bg-white/10 rounded-md p-1"
                            />
                        ) : null}
                        <h1 className="text-2xl font-bold tracking-tight text-white">{systemSettings?.factoryName || "Worker Kiosk"}</h1>
                    </div>
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-800 text-indigo-400"><User className="w-3 h-3" /></div>
                        <span className="font-semibold text-indigo-300">{employee.name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="hidden sm:block text-xs font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner">
                        <span className="text-indigo-400 font-bold mr-2">VIEWING:</span>
                        {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <form action={logoutEmployee}>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400 hover:bg-slate-800">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </form>
                </div>
            </header>

            <KioskClient
                machines={machines}
                employees={[employee]}
                initialJobs={jobs}
                systemSettings={systemSettings}
                selectedDateStr={selectedDateStr || ""}
            />

            <KioskBottomNav />
        </div>
    );
}
