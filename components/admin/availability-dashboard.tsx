"use client";

import { useState, useEffect } from "react";
import { getFactoryStatus } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User, Activity, Clock, Search, Layers, CalendarOff, ChevronDown, ChevronUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResourceDetailsModal } from "./resource-details-modal";

interface EmployeeStatus {
    id: string;
    name: string;
    employeeCode: string | null;
    section: string;
    subSection?: string | null;
    status: string;
    currentTask: {
        projectName: string;
        taskName: string;
        startedAt: Date | null;
    } | null;
}

interface MachineStatus {
    id: string;
    name: string;
    machineNumber: string | null;
    section: string;
    subSection?: string | null;
    status: string;
    currentTask: {
        projectName: string;
        taskName: string;
        operatorName: string;
    } | null;
}

interface FactoryStatus {
    employees: EmployeeStatus[];
    machines: MachineStatus[];
    staff: EmployeeStatus[]; // Reusing EmployeeStatus structure for Staff
}

export default function AvailabilityDashboard() {
    const [statusData, setStatusData] = useState<FactoryStatus | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState("");

    // Staff: track which role section is expanded to show individual members
    const [expandedStaffRole, setExpandedStaffRole] = useState<string | null>(null);
    const toggleStaffRole = (role: string) =>
        setExpandedStaffRole(prev => prev === role ? null : role);

    // Resource Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<{ id: string, name: string, type: "EMPLOYEE" | "MACHINE" } | null>(null);

    const handleOpenModal = (id: string, name: string, type: "EMPLOYEE" | "MACHINE") => {
        setSelectedResource({ id, name, type });
        setModalOpen(true);
    };

    const fetchData = async () => {
        try {
            const data = await getFactoryStatus();
            setStatusData(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Failed to fetch factory status:", error);
        }
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (!interval) interval = setInterval(fetchData, 30000);
        };
        const stopPolling = () => {
            if (interval) { clearInterval(interval); interval = null; }
        };
        const onVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                fetchData();      // immediately refresh when tab becomes visible again
                startPolling();
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        fetchData();              // initial fetch on mount
        if (!document.hidden) startPolling();

        return () => {
            stopPolling();
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    if (!statusData) {
        return <div className="p-8 text-center text-gray-500">Loading factory status...</div>;
    }

    const filteredEmployees = statusData.employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || (emp.employeeCode && emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())) || emp.section.toLowerCase().includes(searchQuery.toLowerCase()));
    const employeesBySection = filteredEmployees.reduce((acc, emp) => {
        if (!acc[emp.section]) acc[emp.section] = [];
        acc[emp.section].push(emp);
        return acc;
    }, {} as Record<string, EmployeeStatus[]>);

    const filteredMachines = statusData.machines.filter(mach => mach.name.toLowerCase().includes(searchQuery.toLowerCase()) || (mach.machineNumber && mach.machineNumber.toLowerCase().includes(searchQuery.toLowerCase())) || mach.section.toLowerCase().includes(searchQuery.toLowerCase()));
    const machinesBySection = filteredMachines.reduce((acc, mach) => {
        if (!acc[mach.section]) acc[mach.section] = [];
        acc[mach.section].push(mach);
        return acc;
    }, {} as Record<string, MachineStatus[]>);

    const filteredStaff = statusData.staff.filter(st => st.name.toLowerCase().includes(searchQuery.toLowerCase()) || (st.employeeCode && st.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())) || st.section.toLowerCase().includes(searchQuery.toLowerCase()));
    const staffByRole = filteredStaff.reduce((acc, st) => {
        if (!acc[st.section]) acc[st.section] = []; // section contains Role 'ADMIN', 'SUPERVISOR', etc.
        acc[st.section].push(st);
        return acc;
    }, {} as Record<string, EmployeeStatus[]>);

    return (
        <div className="space-y-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3 shrink-0">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                        <Activity className="w-6 h-6" />
                    </div>
                    Live Factory Status
                </h1>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-card/40 backdrop-blur-sm border-black/5 dark:border-white/5 shadow-sm rounded-xl focus-visible:ring-primary/50"
                        />
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2 bg-background/50 backdrop-blur-md px-4 py-2 rounded-xl border border-black/5 dark:border-white/5 shadow-sm shrink-0 hidden md:flex">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                        </span>
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            <Tabs defaultValue="employees" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[500px] bg-background/40 backdrop-blur-md border border-black/5 dark:border-white/5 p-1 rounded-xl">
                    <TabsTrigger value="employees" className="rounded-lg text-muted-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider text-xs transition-all data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">Employees</TabsTrigger>
                    <TabsTrigger value="machines" className="rounded-lg text-muted-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider text-xs transition-all data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">Machines</TabsTrigger>
                    <TabsTrigger value="staff" className="rounded-lg text-muted-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider text-xs transition-all data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">Staff</TabsTrigger>
                </TabsList>

                <TabsContent value="employees" className="mt-6">
                    {Object.entries(employeesBySection).sort(([a], [b]) => a.localeCompare(b)).map(([section, emps]) => (
                        <div key={section} className="mb-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2 mb-4">
                                <Layers className="w-4 h-4 text-primary" /> {section}
                            </h3>
                            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                                {emps.map((emp) => (
                                    <Card key={emp.id} onClick={() => handleOpenModal(emp.id, emp.name, "EMPLOYEE")} className={`cursor-pointer bg-card/40 backdrop-blur-2xl border-0 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] ${emp.status === "ON_LEAVE" ? "ring-1 ring-slate-500/30 hover:ring-slate-500/60 bg-gradient-to-b from-slate-500/5 to-transparent grayscale-[0.3]" : emp.status === "BUSY" ? "ring-1 ring-destructive/30 hover:ring-destructive/60 bg-gradient-to-b from-destructive/5 to-transparent" : emp.status === "ASSIGNED" ? "ring-1 ring-amber-500/30 hover:ring-amber-500/60 bg-gradient-to-b from-amber-500/5 to-transparent" : "ring-1 ring-emerald-500/20 dark:ring-emerald-500/20 hover:ring-emerald-500/50 dark:hover:ring-emerald-500/50 bg-gradient-to-b from-emerald-500/5 to-transparent"}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${emp.status === 'ON_LEAVE' ? 'from-slate-500/10' : emp.status === 'BUSY' ? 'from-destructive/10' : emp.status === 'ASSIGNED' ? 'from-amber-500/10' : 'from-emerald-500/10'} to-transparent z-0`}></div>

                                        <CardHeader className="p-4 relative z-10 border-b border-black/5 dark:border-white/5 bg-background/40 backdrop-blur-xl">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex flex-col gap-1.5 overflow-hidden min-w-0 flex-1">
                                                    <CardTitle className="text-sm font-black flex items-start gap-2.5">
                                                        <div className={`p-1.5 rounded-lg shrink-0 ${emp.status === 'ON_LEAVE' ? 'bg-slate-500/10 text-slate-500 shadow-[0_0_10px_rgba(100,116,139,0.2)]' : emp.status === 'BUSY' ? 'bg-destructive/10 text-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]' : emp.status === 'ASSIGNED' ? 'bg-amber-500/10 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'}`}>
                                                            {emp.status === 'ON_LEAVE' ? <CalendarOff className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="line-clamp-2 leading-tight uppercase tracking-widest break-words" title={emp.name}>{emp.name}</span>
                                                            {emp.employeeCode && <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{emp.employeeCode}</span>}
                                                        </div>
                                                    </CardTitle>
                                                    <CardDescription className="font-semibold text-[9px] uppercase tracking-widest flex items-center gap-1 opacity-80 pl-8">
                                                        <span className="truncate">{emp.section} {emp.subSection ? ` / ${emp.subSection}` : ''}</span>
                                                    </CardDescription>
                                                </div>
                                                {emp.status !== "AVAILABLE" && (
                                                    <Badge variant={emp.status === "BUSY" || emp.status === "ON_LEAVE" ? "destructive" : "outline"} className={`font-black uppercase tracking-widest text-[7px] px-1.5 py-0 shadow-[0_2px_10px_rgb(0,0,0,0.05)] border shrink-0 h-4 mt-0.5 ${emp.status === "ON_LEAVE" ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" : emp.status === "ASSIGNED" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                                                        {emp.status.replace("_", " ")}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 relative z-10">
                                            {emp.status === "ON_LEAVE" ? (
                                                <div className="text-xs font-black tracking-widest uppercase text-slate-500 dark:text-slate-400 py-4 flex flex-col items-center justify-center gap-3 text-center bg-slate-500/5 rounded-2xl border border-slate-500/10 h-[110px] shadow-inner group-hover:bg-slate-500/10 transition-colors duration-500 opacity-80">
                                                    <div className="p-2.5 bg-slate-500/10 rounded-full shadow-[0_0_20px_rgba(100,116,139,0.3)] group-hover:scale-110 transition-transform duration-500">
                                                        <CalendarOff className="h-4 w-4" />
                                                    </div>
                                                    On Leave
                                                </div>
                                            ) : (emp.status === "BUSY" || emp.status === "ASSIGNED") && emp.currentTask ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Project</div>
                                                        <div className="font-bold text-foreground text-xs line-clamp-1 leading-snug">{emp.currentTask.projectName}</div>
                                                    </div>
                                                    <div className={`bg-background/60 p-3 rounded-2xl border shadow-sm backdrop-blur-md ${emp.status === 'BUSY' ? 'border-destructive/10 dark:border-destructive/20' : 'border-amber-500/10 dark:border-amber-500/20'}`}>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Task</div>
                                                        <div className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{emp.currentTask.taskName}</div>
                                                        {emp.currentTask.startedAt && (
                                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2.5 font-bold bg-background/80 w-fit px-2 py-1 rounded-lg border border-black/5 dark:border-white/5 shadow-sm">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(emp.currentTask.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 py-4 flex flex-col items-center justify-center gap-3 text-center bg-emerald-500/5 rounded-2xl border border-emerald-500/10 h-[110px] shadow-inner group-hover:bg-emerald-500/10 transition-colors duration-500">
                                                    <div className="p-2.5 bg-emerald-500/10 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform duration-500">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    Available
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                    {Object.keys(employeesBySection).length === 0 && (
                        <div className="p-8 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">No employees found.</div>
                    )}
                </TabsContent>

                <TabsContent value="machines" className="mt-6">
                    {Object.entries(machinesBySection).sort(([a], [b]) => a.localeCompare(b)).map(([section, machs]) => (
                        <div key={section} className="mb-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2 mb-4">
                                <Layers className="w-4 h-4 text-primary" /> {section}
                            </h3>
                            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                                {machs.map((mach) => (
                                    <Card key={mach.id} onClick={() => handleOpenModal(mach.id, mach.name, "MACHINE")} className={`cursor-pointer bg-card/40 backdrop-blur-2xl border-0 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] ${mach.status === "MAINTENANCE" ? "ring-1 ring-orange-500/30 hover:ring-orange-500/60 bg-gradient-to-b from-orange-500/5 to-transparent" : mach.status === "BUSY" ? "ring-1 ring-destructive/30 hover:ring-destructive/60 bg-gradient-to-b from-destructive/5 to-transparent" : mach.status === "ASSIGNED" ? "ring-1 ring-amber-500/30 hover:ring-amber-500/60 bg-gradient-to-b from-amber-500/5 to-transparent" : "ring-1 ring-emerald-500/20 dark:ring-emerald-500/20 hover:ring-emerald-500/50 dark:hover:ring-emerald-500/50 bg-gradient-to-b from-emerald-500/5 to-transparent"}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${mach.status === 'MAINTENANCE' ? 'from-orange-500/10' : mach.status === 'BUSY' ? 'from-destructive/10' : mach.status === 'ASSIGNED' ? 'from-amber-500/10' : 'from-emerald-500/10'} to-transparent z-0`}></div>

                                        <CardHeader className="p-4 relative z-10 border-b border-black/5 dark:border-white/5 bg-background/40 backdrop-blur-xl">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex flex-col gap-1.5 overflow-hidden min-w-0 flex-1">
                                                    <CardTitle className="text-sm font-black flex items-start gap-2.5 uppercase tracking-widest text-foreground">
                                                        <div className={`p-1.5 rounded-lg shrink-0 ${mach.status === 'MAINTENANCE' ? 'bg-orange-500/10 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : mach.status === 'BUSY' ? 'bg-destructive/10 text-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]' : mach.status === 'ASSIGNED' ? 'bg-amber-500/10 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'}`}>
                                                            <Activity className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="line-clamp-2 leading-tight uppercase tracking-widest break-words" title={mach.name}>{mach.name}</span>
                                                            {mach.machineNumber && <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{mach.machineNumber}</span>}
                                                        </div>
                                                    </CardTitle>
                                                    <CardDescription className="font-semibold text-[9px] uppercase tracking-widest flex items-center gap-1 opacity-80 pl-8">
                                                        <span className="truncate">{mach.section} {mach.subSection ? ` / ${mach.subSection}` : ''}</span>
                                                    </CardDescription>
                                                </div>
                                                {mach.status !== "AVAILABLE" && (
                                                    <Badge variant={mach.status === "BUSY" ? "destructive" : "outline"} className={`font-black uppercase tracking-widest text-[7px] px-1.5 py-0 shadow-[0_2px_10px_rgb(0,0,0,0.05)] border shrink-0 h-4 mt-0.5 ${mach.status === "MAINTENANCE" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" : mach.status === "ASSIGNED" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                                                        {mach.status === "BUSY" ? "RUN" : mach.status === "MAINTENANCE" ? "MAINT" : mach.status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 relative z-10">
                                            {mach.status === "MAINTENANCE" ? (
                                                <div className="text-xs font-black tracking-widest uppercase text-orange-600 dark:text-orange-400 py-4 flex flex-col items-center justify-center gap-3 text-center bg-orange-500/5 rounded-2xl border border-orange-500/10 h-[110px] shadow-inner group-hover:bg-orange-500/10 transition-colors duration-500">
                                                    <div className="p-2.5 bg-orange-500/10 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] group-hover:scale-110 transition-transform duration-500">
                                                        <Activity className="h-4 w-4" />
                                                    </div>
                                                    Under Maintenance
                                                </div>
                                            ) : (mach.status === "BUSY" || mach.status === "ASSIGNED") && mach.currentTask ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Project</div>
                                                        <div className="font-bold text-foreground text-xs line-clamp-1 leading-snug">{mach.currentTask.projectName}</div>
                                                    </div>
                                                    <div className={`bg-background/60 p-3 rounded-2xl border shadow-sm backdrop-blur-md ${mach.status === 'BUSY' ? 'border-destructive/10 dark:border-destructive/20' : 'border-amber-500/10 dark:border-amber-500/20'}`}>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Task</div>
                                                        <div className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{mach.currentTask.taskName}</div>
                                                        <div className={`mt-2.5 text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-[0_2px_10px_rgb(0,0,0,0.05)] truncate max-w-full ${mach.status === 'BUSY' ? 'text-destructive bg-destructive/10 border-destructive/20' : 'text-amber-600 bg-amber-500/10 border-amber-500/20'}`}>
                                                            <User className="w-3 h-3 shrink-0" /> <span className="truncate">{mach.currentTask.operatorName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 py-4 flex flex-col items-center justify-center gap-3 text-center bg-emerald-500/5 rounded-2xl border border-emerald-500/10 h-[110px] shadow-inner group-hover:bg-emerald-500/10 transition-colors duration-500">
                                                    <div className="p-2.5 bg-emerald-500/10 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform duration-500">
                                                        <Activity className="h-4 w-4" />
                                                    </div>
                                                    Idle
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                    {Object.keys(machinesBySection).length === 0 && (
                        <div className="p-8 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">No machines found.</div>
                    )}
                </TabsContent>
                <TabsContent value="staff" className="mt-6">
                    {Object.keys(staffByRole).length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">No staff found.</div>
                    ) : (
                        Object.entries(staffByRole).sort(([a], [b]) => a.localeCompare(b)).map(([role, staffs]) => {
                            const total = staffs.length;
                            const busy = staffs.filter(s => s.status === "BUSY" || s.status === "ASSIGNED").length;
                            const onLeave = staffs.filter(s => s.status === "ON_LEAVE").length;
                            const available = total - busy - onLeave;
                            const isExpanded = expandedStaffRole === role;

                            return (
                                <div key={role} className="mb-6">
                                    {/* Section summary card */}
                                    <div className={cn(
                                        "relative overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
                                        isExpanded
                                            ? "bg-blue-500/5 border-blue-500/20 shadow-[0_8px_30px_rgba(59,130,246,0.1)]"
                                            : "bg-card/40 border-black/5 dark:border-white/5 hover:border-blue-500/10"
                                    )}>
                                        {/* Gradient accent */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />

                                        <div className="relative p-5">
                                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                                {/* Left: role name + member count */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-inner">
                                                        <Users className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black uppercase tracking-[0.15em] text-foreground">{role}</h3>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                                            {total} {total === 1 ? 'member' : 'members'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Centre: status badge pills */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {busy > 0 && (
                                                        <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                            {busy} Active
                                                        </span>
                                                    )}
                                                    {available > 0 && (
                                                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            {available} Free
                                                        </span>
                                                    )}
                                                    {onLeave > 0 && (
                                                        <span className="inline-flex items-center gap-1.5 bg-slate-500/10 text-slate-500 border border-slate-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                            <CalendarOff className="w-3 h-3" />
                                                            {onLeave} Leave
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Right: expand toggle */}
                                                <button
                                                    onClick={() => toggleStaffRole(role)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 shrink-0",
                                                        isExpanded
                                                            ? "bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/30"
                                                            : "bg-background/60 text-muted-foreground border-black/10 dark:border-white/10 hover:border-blue-500/30 hover:text-blue-500"
                                                    )}
                                                >
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    {isExpanded ? 'Hide' : 'View Members'}
                                                </button>
                                            </div>

                                            {/* Status bar */}
                                            <div className="mt-4 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden flex">
                                                {busy > 0 && <div className="bg-blue-500 h-full transition-all" style={{ width: `${(busy / total) * 100}%` }} />}
                                                {available > 0 && <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(available / total) * 100}%` }} />}
                                                {onLeave > 0 && <div className="bg-slate-400 h-full transition-all" style={{ width: `${(onLeave / total) * 100}%` }} />}
                                            </div>
                                        </div>

                                        {/* Expanded member list */}
                                        {isExpanded && (
                                            <div className="border-t border-black/5 dark:border-white/5 overflow-hidden">
                                                <div className="max-h-[360px] overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
                                                    {staffs
                                                        .slice()
                                                        .sort((a, b) => {
                                                            // Sort: busy first, then available, then on leave
                                                            const order: Record<string, number> = { BUSY: 0, ASSIGNED: 0, AVAILABLE: 1, ON_LEAVE: 2 };
                                                            return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                                                        })
                                                        .map(member => (
                                                            <div
                                                                key={member.id}
                                                                onClick={() => handleOpenModal(member.id, member.name, "STAFF" as any)}
                                                                className={cn(
                                                                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] group",
                                                                    member.status === "ON_LEAVE"
                                                                        ? "bg-slate-500/5 border-slate-500/10 hover:border-slate-500/20"
                                                                        : member.status === "BUSY" || member.status === "ASSIGNED"
                                                                            ? "bg-blue-500/5 border-blue-500/10 hover:border-blue-500/20"
                                                                            : "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20"
                                                                )}
                                                            >
                                                                {/* Status dot */}
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                                                                    member.status === "ON_LEAVE" ? "bg-slate-500/10 text-slate-500 border-slate-500/20" :
                                                                    member.status === "BUSY" || member.status === "ASSIGNED" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                                    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                                )}>
                                                                    {member.status === "ON_LEAVE" ? <CalendarOff className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-black text-xs uppercase tracking-wider text-foreground truncate">{member.name}</span>
                                                                        {member.employeeCode && <span className="text-[9px] text-muted-foreground font-mono">@{member.employeeCode}</span>}
                                                                        <Badge className={cn(
                                                                            "text-[7px] font-black px-1.5 py-0 h-4 uppercase tracking-wider border ml-auto shrink-0",
                                                                            member.status === "ON_LEAVE" ? "bg-slate-500/10 text-slate-500 border-slate-500/20" :
                                                                            member.status === "BUSY" || member.status === "ASSIGNED" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                                            "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                                        )}>{member.status.replace('_', ' ')}</Badge>
                                                                    </div>

                                                                    {(member.status === "BUSY" || member.status === "ASSIGNED") && member.currentTask ? (
                                                                        <div className="mt-1.5">
                                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{member.currentTask.projectName}</p>
                                                                            <p className="text-xs text-foreground font-medium leading-tight truncate mt-0.5">{member.currentTask.taskName}</p>
                                                                            {member.currentTask.startedAt && (
                                                                                <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground font-bold">
                                                                                    <Clock className="w-3 h-3" />
                                                                                    {new Date(member.currentTask.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : member.status === "ON_LEAVE" ? (
                                                                        <p className="text-[10px] text-slate-500 font-semibold mt-1">On approved leave</p>
                                                                    ) : (
                                                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Available for assignment</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </TabsContent>
            </Tabs>

            {selectedResource && (
                <ResourceDetailsModal
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    resourceId={selectedResource.id}
                    resourceName={selectedResource.name}
                    resourceType={selectedResource.type}
                />
            )}
        </div>
    );
}
