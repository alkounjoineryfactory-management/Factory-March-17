import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import KioskChatClient from "./kiosk-chat-client";
import KioskBottomNav from "@/components/kiosk/bottom-nav";

export default async function KioskChatPage() {
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

    return (
        <div className="min-h-screen bg-slate-950 pb-24 text-slate-100">
            <header className="px-6 py-6 bg-slate-900 border-b border-slate-800">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    Live Support
                </h1>
                <p className="text-sm text-slate-400">Direct line to admin.</p>
            </header>

            <main className="flex-1 h-[calc(100vh-180px)]">
                <KioskChatClient employeeId={employee.id} />
            </main>

            <KioskBottomNav />
        </div>
    );
}
