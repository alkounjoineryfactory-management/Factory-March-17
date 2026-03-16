
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FolderKanban,
    CalendarDays,
    Users,
    BarChart3,
    Settings,
    MessageSquare,
    LogOut,
    Sliders,
    ClipboardList,
    UserCheck,
    Package,
    Receipt,
    ListTodo,
    FileText
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/admin/logout-button";

const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Projects", href: "/admin/projects", icon: FolderKanban },
    { label: "My Tasks", href: "/admin/my-tasks", icon: ListTodo },
    { label: "Production Orders", href: "/admin/production-orders", icon: ClipboardList },
    { label: "Schedule", href: "/admin/schedule", icon: CalendarDays },
    { label: "Availability", href: "/admin/availability", icon: Users },
    { label: "Messages", href: "/admin/messages", icon: MessageSquare },
    { label: "Meeting Summary", href: "/admin/meetings", icon: FileText },
    { label: "HR Management", href: "/admin/hr", icon: UserCheck },
    { label: "Procurement", href: "/admin/procurement", icon: Package },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Financial Reports", href: "/admin/financial-reports", icon: Receipt },
    { label: "Factory Settings", href: "/admin/factory-settings", icon: Sliders },
    { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar({ user, systemSettings }: { user?: { username: string; role: string } | null, systemSettings?: any }) {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await fetch("/api/chat/unread", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.count || 0);
                }
            } catch (e) {
                console.error("Failed to fetch unread count", e);
            }
        };
        
        // Always fetch once on load or navigation to show current count
        fetchUnread();
        
        // Only run polling loop if we are actively viewing the messages page
        let interval: NodeJS.Timeout | undefined;
        if (pathname === "/admin/messages") {
            interval = setInterval(fetchUnread, 10000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [pathname]);

    // Helper for initials
    const initials = user?.username ? user.username.substring(0, 1).toUpperCase() : "A";

    return (
        <div className="w-64 h-screen bg-card/40 dark:bg-[#0f0f11]/60 backdrop-blur-3xl border-r border-black/5 dark:border-white/5 shadow-[8px_0_30px_rgb(0,0,0,0.04)] flex flex-col fixed left-0 top-0 z-50 transition-colors duration-300 overflow-hidden">
            {/* Ambient decorative glow */}
            <div className="absolute -left-32 -top-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -z-10"></div>

            <div className="py-8 px-6 border-b border-black/5 dark:border-white/5 flex items-center justify-center w-full relative z-10 min-h-[120px]">
                {systemSettings?.logoUrl ? (
                    <img
                        src={systemSettings.logoUrl}
                        alt={systemSettings.factoryName || "Logo"}
                        className="h-12 w-auto max-w-full object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl font-black shadow-[inset_0_2px_10px_rgba(255,255,255,0.2)]">
                        {systemSettings?.factoryName?.substring(0, 1) || "F"}
                    </div>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {navItems.map((item) => {
                    // Hide settings if not ADMIN
                    if (item.label === "Settings" && user?.role !== "ADMIN") {
                        return null;
                    }

                    const isActive = pathname === item.href;
                    const isProminent = item.label === "Projects" || item.label === "Reports";

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center justify-between px-3 py-3 mx-2 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
                                ${isActive
                                    ? "bg-gradient-to-r from-indigo-500/20 to-transparent text-indigo-600 dark:text-indigo-400 shadow-[inset_2px_0_0_0_rgba(99,102,241,1)] bg-black/5 dark:bg-white/5"
                                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                                }
                            `}
                        >
                            {/* Hover sliding highlight border */}
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-400 dark:bg-indigo-500 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>

                            <div className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-1 pl-1">
                                <item.icon className={`w-4 h-4 transition-all duration-300 ${isActive ? "text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] scale-110" : "text-muted-foreground group-hover:text-indigo-500 group-hover:scale-110"}`} />
                                <span className={`tracking-wide transition-colors duration-300 ${isActive ? 'text-gray-900 dark:text-white drop-shadow-sm' : 'group-hover:text-gray-900 dark:group-hover:text-gray-100'}`}>{item.label}</span>
                            </div>
                            {item.label === "Messages" && unreadCount > 0 && (
                                <Badge className={`h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm ${isActive ? 'bg-white text-primary hover:bg-white/90' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'}`}>
                                    {unreadCount}
                                </Badge>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-background/20 backdrop-blur-md relative z-10">
                <div className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary shadow-inner">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate capitalize tracking-wide">{user?.username || "Admin"}</p>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold truncate capitalize">{user?.role?.toLowerCase() || "Factory Manager"}</p>
                    </div>
                    <LogoutButton />
                </div>
            </div>
        </div>
    );
}
