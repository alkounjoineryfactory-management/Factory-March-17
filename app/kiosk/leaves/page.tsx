import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSystemSettings } from "../../actions";
import { Button } from "@/components/ui/button";
import { logoutEmployee } from "../actions";
import KioskBottomNav from "@/components/kiosk/bottom-nav";
import { LogOut, User } from "lucide-react";
import KioskLeaveClient from "./leave-client";

export default async function KioskLeavesPage() {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get("employeeId")?.value;

    if (!employeeId) {
        redirect("/kiosk/login");
    }

    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
            leaveRequests: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!employee) {
        redirect("/kiosk/login");
    }

    const systemSettings = await getSystemSettings();

    return (
        <div className="container mx-auto p-4 min-h-screen pb-24 font-sans focus-visible:outline-none">
            <header className="mb-6 flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
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
                    <div className="hidden sm:block text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <form action={logoutEmployee}>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400 hover:bg-slate-800">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </form>
                </div>
            </header>

            <KioskLeaveClient employeeId={employeeId} leaveRequests={employee.leaveRequests || []} />

            <KioskBottomNav />
        </div>
    );
}
