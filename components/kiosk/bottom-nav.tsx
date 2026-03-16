"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, History, MessageCircle, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function KioskBottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-safe z-50">
            <div className="flex justify-around items-center h-20">
                <Link
                    href="/kiosk"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative",
                        isActive('/kiosk') ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                    )}
                >
                    {isActive('/kiosk') && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] rounded-b-full"></span>
                    )}
                    <ClipboardList className={cn("h-7 w-7", isActive('/kiosk') && "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]")} />
                    <span className="text-[10px] font-bold tracking-wide uppercase">Tasks</span>
                </Link>
                <Link
                    href="/kiosk/history"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative",
                        isActive('/kiosk/history') ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                    )}
                >
                    {isActive('/kiosk/history') && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] rounded-b-full"></span>
                    )}
                    <History className={cn("h-7 w-7", isActive('/kiosk/history') && "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]")} />
                    <span className="text-[10px] font-bold tracking-wide uppercase">History</span>
                </Link>
                <Link
                    href="/kiosk/chat"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative",
                        isActive('/kiosk/chat') ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                    )}
                >
                    {isActive('/kiosk/chat') && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] rounded-b-full"></span>
                    )}
                    <MessageCircle className={cn("h-7 w-7", isActive('/kiosk/chat') && "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]")} />
                    <span className="text-[10px] font-bold tracking-wide uppercase">Chat</span>
                </Link>
                <Link
                    href="/kiosk/leaves"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative",
                        isActive('/kiosk/leaves') ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                    )}
                >
                    {isActive('/kiosk/leaves') && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] rounded-b-full"></span>
                    )}
                    <CalendarOff className={cn("h-7 w-7", isActive('/kiosk/leaves') && "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]")} />
                    <span className="text-[10px] font-bold tracking-wide uppercase">Leaves</span>
                </Link>
            </div>
        </div>
    );
}
