"use client";

import { useState, useEffect } from "react";
import { getWeeklyResourceSchedule } from "@/app/actions";
import { createMesDailyJob } from "@/app/actions/mes";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Plus, Loader2, User, Monitor, X, Activity, CalendarRange, CalendarOff, Layers, ChevronDown, ChevronUp, Users } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { useRouter } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ResourceDetailsModal } from "./resource-details-modal";

// Reusing generic types from server action
interface ScheduleItem {
    taskId: string;
    projectName: string;
    taskName: string;
    hours: number;
    actualHours?: number; // Added field
    status: string;
    isFinished?: boolean;
    operatorName?: string;
}

interface Resource {
    id: string;
    name: string;
    type: "EMPLOYEE" | "MACHINE" | "STAFF";
    section: string;
    sectionId: string;
    subSection?: string | null;
    schedule: Record<string, ScheduleItem[]>;
}

interface WeeklyData {
    dates: string[];
    resources: Resource[];
}

interface Project { id: string; name: string; }
interface Section { id: string; name: string; incharge?: string | null; }
interface Employee { id: string; name: string; }
interface WeeklyPlan { id: string; title: string | null; weekNumber: number; projectId: string; }

// Props
interface WeeklyAvailabilityProps {
    projects: Project[];
    sections: Section[];
    employees: Employee[];
    machines: any[];
    users: any[];
    productionOrders: any[];
    weeklyPlans: WeeklyPlan[];
    viewMode?: "all" | "staff" | "machines";
}

export default function WeeklyAvailability({ projects, sections, employees, machines, users, productionOrders, weeklyPlans, viewMode = "all" }: WeeklyAvailabilityProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState<WeeklyData | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Staff timeline — track which (groupId+date) cell is expanded to show employee list
    const [expandedStaffCell, setExpandedStaffCell] = useState<string | null>(null);
    const toggleStaffCell = (groupId: string, dateStr: string) => {
        const key = `${groupId}::${dateStr}`;
        setExpandedStaffCell(prev => prev === key ? null : key);
    };

    // Modal State
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{
        resourceId: string;
        resourceName: string;
        resourceType: "EMPLOYEE" | "MACHINE" | "STAFF";
        sectionId: string;
        date: string;
    } | null>(null);

    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [selectedWeeklyTaskId, setSelectedWeeklyTaskId] = useState<string>("none");

    const [selectedItemCode, setSelectedItemCode] = useState<string>("");
    const [targetQty, setTargetQty] = useState<string>("1");
    const [unit, setUnit] = useState<string>("pcs");
    const [materialsList, setMaterialsList] = useState<string[]>([""]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // Resource Details Modal State
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsResource, setDetailsResource] = useState<{ id: string, name: string, type: "EMPLOYEE" | "MACHINE" | "STAFF" } | null>(null);

    const handleResourceClick = (resource: Resource) => {
        setDetailsResource({ id: resource.id, name: resource.name, type: resource.type });
        setDetailsModalOpen(true);
    };

    const filteredProductionOrderItems = (productionOrders || [])
        .filter((po: any) => !selectedProjectId || po.projectId === selectedProjectId)
        .flatMap((po: any) => po.items || []);

    const allTasks = (weeklyPlans || []).flatMap((p: any) => p.tasks || []);
    const selectedTask = allTasks.find((t: any) => t.id === selectedWeeklyTaskId);
    const taskAssignees = selectedTask?.assignedTo ? selectedTask.assignedTo.split(",").map((s: string) => s.trim()) : [];

    const availableAdminUsers = selectedWeeklyTaskId !== "none" && taskAssignees.length > 0
        ? (users || []).filter((u: any) => taskAssignees.includes(u.name) || taskAssignees.includes(u.username))
        : (users || []);

    const addMaterialRow = () => setMaterialsList([...materialsList, ""]);
    const updateMaterialRow = (index: number, val: string) => {
        const newArr = [...materialsList];
        newArr[index] = val;
        setMaterialsList(newArr);
    };
    const removeMaterialRow = (index: number) => {
        setMaterialsList(materialsList.filter((_, i) => i !== index));
    };

    const handleCellClick = (resource: Resource, dateStr: string) => {
        setSelectedSlot({
            resourceId: resource.id,
            resourceName: resource.name,
            resourceType: resource.type,
            sectionId: resource.sectionId,
            date: dateStr
        });
        setSelectedProjectId(""); // Reset
        setSelectedWeeklyTaskId("none"); // Reset
        setSelectedItemCode("");
        setTargetQty("1");
        setUnit("pcs");
        setMaterialsList([""]);

        // Auto-select the section incharge
        const section = sections.find(s => s.id === resource.sectionId);
        if (section && section.incharge) {
            const incharges = section.incharge.split(',').map((s: string) => s.trim()).filter(Boolean);
            setSelectedUsers(incharges);
        } else {
            setSelectedUsers([]);
        }
        setAssignModalOpen(true);
    };

    const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);

            if (selectedUsers.length > 0) {
                formData.set("assignedTo", selectedUsers.join(", "));
            }

            const validMaterials = materialsList.filter((m) => m.trim() !== "");
            if (validMaterials.length > 0) {
                formData.set("budgetedMaterialList", validMaterials.join(", "));
            }

            // Quick Assign targets a specfic employee or machine
            if (selectedSlot?.resourceType === "EMPLOYEE") {
                formData.set("employeeIds", selectedSlot.resourceId);
            } else if (selectedSlot?.resourceType === "MACHINE") {
                formData.set("machineIds", selectedSlot.resourceId);
            } else if (selectedSlot?.resourceType === "STAFF") {
                // If the user already manually selected admins in the dropdown, the first `assignedTo` check above handled it.
                // But if they clicked a cell for a STAFF member and left the dropdown empty, 
                // we should inject that staff member's name as the assignee to auto-assign them.
                if (selectedUsers.length === 0) {
                     formData.set("assignedTo", selectedSlot.resourceName);
                }
            }

            // We must pass date explicitly as "day" since createMesDailyJob expects it
            formData.set("day", selectedSlot?.date || "");

            await createMesDailyJob(formData);
            setAssignModalOpen(false);
            await fetchSchedule(); // Refresh data
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to assign task");
        } finally {
            setSubmitting(false);
        }
    };

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 6 }); // Saturday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 6 });
    const weekDays = [0, 1, 2, 3, 4, 5, 6].map(offset => addDays(weekStart, offset));

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const startStr = format(weekStart, 'yyyy-MM-dd');
            const endStr = format(weekEnd, 'yyyy-MM-dd');
            const data = await getWeeklyResourceSchedule(startStr, endStr);
            setScheduleData(data as unknown as WeeklyData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, [currentDate]);

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    // Group resources by Section (Employees only)
    const physicalSections = sections.map(section => ({
        ...section,
        resources: scheduleData?.resources.filter(r => r.section === section.name && r.type === "EMPLOYEE") || []
    })).filter(g => g.resources.length > 0);

    // Group machines by Section
    const machineSections = sections.map(section => ({
        ...section,
        resources: scheduleData?.resources.filter(r => r.section === section.name && r.type === "MACHINE") || []
    })).filter(g => g.resources.length > 0);

    // Group staff by their roles — collapse to ONE row per group (section/role)
    const staffResources = scheduleData?.resources.filter(r => r.type === "STAFF") || [];
    const staffRoles = Array.from(new Set(staffResources.map(r => r.section)));

    // Build aggregated section objects: one row per role, schedule = merged across all members
    const aggregatedStaffSections = staffRoles.map(role => {
        const members = staffResources.filter(r => r.section === role);
        // Merge all members' schedules: each date key gets a combined items list with operatorName injected
        const mergedSchedule: Record<string, (ScheduleItem & { operatorName: string })[]> = {};
        members.forEach(member => {
            Object.entries(member.schedule).forEach(([date, items]) => {
                if (!mergedSchedule[date]) mergedSchedule[date] = [];
                items.forEach(item => {
                    mergedSchedule[date].push({ ...item, operatorName: member.name });
                });
            });
        });
        return {
            id: `role-${role}`,
            name: role,
            members,
            mergedSchedule
        };
    }).filter(g => g.members.length > 0);

    const groupedResources = viewMode === "machines" ? machineSections : physicalSections;

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 bg-card/60 backdrop-blur-2xl relative z-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <span className="font-black tracking-tight text-foreground text-xl flex items-center gap-3">
                        <CalendarRange className="w-5 h-5 text-primary" />
                        {format(weekStart, "MMMM d")} - {format(weekEnd, "MMMM d, yyyy")}
                    </span>
                    <Badge variant="secondary" className="font-black uppercase tracking-widest text-[9px] bg-primary/10 text-primary border border-primary/20 shadow-sm px-2 py-0.5">Week {format(weekStart, 'w')}</Badge>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                    <Button variant="outline" size="icon" className="rounded-xl border-black/5 dark:border-white/5 hover:bg-primary/10 hover:text-primary transition-all duration-300 shadow-sm" onClick={handlePrevWeek}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-xl border-black/5 dark:border-white/5 hover:bg-primary/10 hover:text-primary transition-all duration-300 shadow-sm" onClick={handleNextWeek}>
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Timeline Grid */}
            <ScrollArea className="flex-1 w-full bg-transparent">
                <div className="min-w-[1000px] pb-4">
                    {/* Header Row */}
                    <div className="flex border-b border-black/5 dark:border-white/5 bg-card/60 backdrop-blur-xl sticky top-0 z-20 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)]">
                        <div className="w-48 p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px] border-r border-black/5 dark:border-white/5 bg-card/80 backdrop-blur-2xl sticky left-0 z-30 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] flex items-center">
                            Resource
                        </div>
                        {weekDays.map((day, i) => (
                            <div key={i} className={cn(
                                "flex-1 min-w-[120px] p-3 text-center border-r border-black/5 dark:border-white/5 last:border-r-0 transition-colors duration-300",
                                format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "bg-primary/5"
                            )}>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{format(day, 'EEE')}</div>
                                <div className={cn(
                                    "text-sm font-black mt-1.5 inline-flex items-center justify-center w-8 h-8 rounded-xl shadow-sm transition-all",
                                    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-primary text-primary-foreground shadow-primary/30 ring-2 ring-primary/20 ring-offset-1 ring-offset-background" : "bg-black/5 dark:bg-white/5 text-foreground border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10"
                                )}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : viewMode === "staff" ? (
                        /* ── STAFF VIEW: one row per section/role group ── */
                        aggregatedStaffSections.map(group => (
                            <div key={group.id}>
                                {/* Section Header — spans the full grid row */}
                                <div className="flex border-b border-black/5 dark:border-white/5 bg-gradient-to-r from-blue-500/5 to-transparent">
                                    {/* Role label in the sticky resource column */}
                                    <div className="w-48 px-3 py-2 border-r border-black/5 dark:border-white/5 bg-blue-500/5 backdrop-blur-md sticky left-0 z-10 flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/80 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                                            <Users className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground truncate">{group.name}</h3>
                                            <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest leading-none mt-0.5">
                                                {group.members.length} {group.members.length === 1 ? 'Member' : 'Members'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Accent stripe across day columns */}
                                    <div className="flex-1 px-4 flex items-center">
                                        <p className="text-[9px] font-semibold text-blue-500/60 uppercase tracking-widest">Click a day cell to see details</p>
                                    </div>
                                </div>

                                {/* Single aggregated row for this group */}
                                <div className="flex border-b border-black/5 dark:border-white/5 transition-colors duration-300">
                                    {/* Row label */}
                                    <div className="w-48 p-3 border-r border-black/5 dark:border-white/5 bg-card/40 backdrop-blur-md sticky left-0 z-10 flex items-center gap-3 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner border border-black/5 dark:border-white/5 bg-blue-500/10 text-blue-500">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-bold text-xs text-foreground truncate uppercase tracking-wider" title={group.members.map(m => m.name).join(', ')}>
                                                {group.members.length === 1
                                                    ? group.members[0].name
                                                    : `${group.members[0].name} +${group.members.length - 1}`}
                                            </p>
                                            <p className="text-[9px] font-semibold text-blue-500 uppercase tracking-widest leading-none mt-0.5">{group.name}</p>
                                        </div>
                                    </div>

                                    {/* Aggregated day cells */}
                                    {weekDays.map((day, i) => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const allItems = group.mergedSchedule[dateStr] || [];
                                        // Active = any items on this day
                                        const activeMembers = group.members.filter(m => (m.schedule[dateStr] || []).length > 0);
                                        const totalHours = allItems.reduce((acc, item) => acc + (item.hours || 0), 0);
                                        const actualHours = allItems.reduce((acc, item) => acc + (item.actualHours || 0), 0);
                                        // Distinct project names
                                        const projects = Array.from(new Set(allItems.map(i => i.projectName))).filter(Boolean);
                                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                        const cellKey = `${group.id}::${dateStr}`;
                                        const isExpanded = expandedStaffCell === cellKey;

                                        return (
                                            <div key={i} className={cn(
                                                "flex-1 min-w-[120px] p-2 border-r border-black/5 dark:border-white/5 last:border-r-0 transition-colors",
                                                isToday && "bg-primary/5"
                                            )}>
                                                {allItems.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {/* Summary card — click to expand */}
                                                        <button
                                                            onClick={() => toggleStaffCell(group.id, dateStr)}
                                                            className={cn(
                                                                "w-full text-left p-2 rounded-xl border backdrop-blur-3xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-sm",
                                                                isExpanded
                                                                    ? "bg-blue-500/15 border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                                                                    : "bg-card/80 border-black/5 dark:border-white/5 hover:border-blue-500/20 hover:bg-blue-500/5"
                                                            )}
                                                        >
                                                            {/* Projects working on */}
                                                            <div className="flex items-start justify-between gap-1 mb-1.5">
                                                                <div className="flex-1 min-w-0">
                                                                    {projects.slice(0, 2).map((p, pi) => (
                                                                        <p key={pi} className="text-[8px] font-black uppercase tracking-widest truncate text-blue-600 dark:text-blue-400 leading-tight">{p}</p>
                                                                    ))}
                                                                    {projects.length > 2 && (
                                                                        <p className="text-[8px] font-bold text-muted-foreground">+{projects.length - 2} more</p>
                                                                    )}
                                                                </div>
                                                                {isExpanded ? <ChevronUp className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />}
                                                            </div>
                                                            {/* Stats row */}
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="inline-flex items-center gap-1 bg-background/60 border border-black/5 dark:border-white/5 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-inner">
                                                                    <Users className="w-2.5 h-2.5" />{activeMembers.length}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 bg-background/60 border border-black/5 dark:border-white/5 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-inner">
                                                                    {totalHours.toFixed(1)}h planned
                                                                </span>
                                                                {actualHours > 0 && (
                                                                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest">
                                                                        {actualHours.toFixed(1)}h actual
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>

                                                        {/* Expanded employee list */}
                                                        {isExpanded && (
                                                            <div className="mt-1 space-y-1 border-t border-blue-500/10 pt-1.5 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
                                                                {group.members.map(member => {
                                                                    const memberItems = member.schedule[dateStr] || [];
                                                                    if (memberItems.length === 0) return null;
                                                                    const memberHrs = memberItems.reduce((s, it) => s + (it.hours || 0), 0);
                                                                    return (
                                                                        <div key={member.id} className="p-2 bg-background/50 rounded-lg border border-black/5 dark:border-white/10 text-xs">
                                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                                <span className="font-bold text-[10px] uppercase tracking-wider truncate text-foreground">{member.name}</span>
                                                                                <span className="text-[9px] font-black text-blue-500 shrink-0">{memberHrs.toFixed(1)}h</span>
                                                                            </div>
                                                                            {memberItems.map((item, idx) => (
                                                                                <div key={idx} className={cn(
                                                                                    "text-[9px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 truncate border",
                                                                                    item.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                                                                                    item.status === 'IN_PROGRESS' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                                                                                    "bg-muted/60 text-muted-foreground border-black/5 dark:border-white/5"
                                                                                )} title={`${item.projectName}: ${item.taskName}`}>
                                                                                    {item.projectName} · {item.taskName}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-10 flex items-center justify-center">
                                                        <span className="text-[9px] text-muted-foreground/30 font-bold uppercase tracking-widest">—</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        /* ── EMPLOYEE / MACHINE VIEW: unchanged individual rows ── */
                        groupedResources.map(group => (
                            <div key={group.id}>
                                {/* Section Header — spans the full grid row */}
                                <div className="flex border-b border-black/5 dark:border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
                                    {/* Section label in the sticky resource column */}
                                    <div className="w-48 px-3 py-2 border-r border-black/5 dark:border-white/5 bg-primary/5 backdrop-blur-md sticky left-0 z-10 flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                                            <Layers className="w-3.5 h-3.5 text-primary-foreground" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground truncate">{group.name}</h3>
                                            <p className="text-[8px] font-bold text-primary uppercase tracking-widest leading-none mt-0.5">
                                                {group.resources.length} {group.resources.length === 1 ? 'Resource' : 'Resources'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Accent stripe across day columns */}
                                    <div className="flex-1" />
                                </div>

                                {group.resources.map(resource => (
                                    <div key={resource.id} className="flex border-b border-black/5 dark:border-white/5 hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-300 group">

                                        {/* Resource Name Cell */}
                                        <div onClick={() => handleResourceClick(resource)} className="w-48 p-3 border-r border-black/5 dark:border-white/5 bg-card/40 backdrop-blur-md sticky left-0 z-10 flex items-center gap-3 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-card/60 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                                            <div className={cn(
                                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner border border-black/5 dark:border-white/5",
                                                resource.type === "EMPLOYEE" ? "bg-emerald-500/10 text-emerald-500" : resource.type === "STAFF" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                                            )}>
                                                {resource.type === "EMPLOYEE" || resource.type === "STAFF" ? <User className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="font-bold text-xs text-foreground truncate uppercase tracking-wider group-hover:text-primary transition-colors" title={resource.name}>{resource.name}</p>
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest leading-none">{resource.type.toLowerCase()}</p>
                                                    {resource.subSection && (
                                                        <p className="text-[8px] font-bold text-muted-foreground/80 uppercase tracking-widest leading-none truncate" title={resource.subSection}>
                                                            ↳ {resource.subSection}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Day Cells */}
                                        {weekDays.map((day, i) => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const items = resource.schedule[dateStr] || [];
                                            const totalHours = items.reduce((acc: number, item: any) => acc + item.hours, 0);
                                            const isOverloaded = totalHours > 8;
                                            const isOnLeave = items.some((item: any) => item.status === "ON_LEAVE");

                                            return (
                                                <div key={i} className="flex-1 min-w-[120px] p-2 border-r border-black/5 dark:border-white/5 last:border-r-0 relative group/cell hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                                                    {isOnLeave ? (
                                                        <div className="absolute inset-0 m-1 flex flex-col items-center justify-center p-2 rounded-xl border backdrop-blur-3xl bg-slate-500/10 border-slate-500/20 text-slate-500 dark:text-slate-400 opacity-80 cursor-not-allowed">
                                                            <CalendarOff className="h-5 w-5 mb-1.5 opacity-60" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest leading-tight text-center">Approved<br />Leave</span>
                                                        </div>
                                                    ) : items.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {items.map((item, idx) => (
                                                                <TooltipProvider key={idx}>
                                                                    <Tooltip delayDuration={0}>
                                                                        <TooltipTrigger asChild>
                                                                            <div className={cn(
                                                                                "p-2 rounded-xl shadow-sm cursor-help transition-all duration-500 hover:scale-[1.04] hover:-translate-y-1 relative overflow-hidden group/task border backdrop-blur-3xl",
                                                                                item.status === 'COMPLETED' ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                                                                    item.status === 'IN_PROGRESS' ? "bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400" :
                                                                                        "bg-card/80 border-black/5 dark:border-white/5 text-foreground hover:border-primary/30"
                                                                            )}>
                                                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-40 group-hover/task:opacity-100 transition-opacity"></div>
                                                                                <p className="text-[8px] font-black uppercase tracking-widest truncate mb-0.5 ml-1 opacity-80">{item.projectName}</p>
                                                                                <p className="text-[10px] font-bold leading-tight truncate mb-2 ml-1 opacity-90">{item.taskName}</p>
                                                                                <div className="flex justify-between items-center ml-1 bg-background/50 rounded-lg px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-inner border border-black/5 dark:border-white/5">
                                                                                    <span className="opacity-70">P: {item.hours}h</span>
                                                                                    {(item.actualHours || 0) > 0 && <span className="text-emerald-500 dark:text-emerald-400">A: {item.actualHours}h</span>}
                                                                                </div>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="text-xs max-w-[200px]">
                                                                            <p className="font-bold">{item.projectName}</p>
                                                                            <p>{item.taskName}</p>
                                                                            <div className="mt-2 space-y-1 bg-muted/50 p-2 rounded text-[10px] border border-border">
                                                                                <div className="flex justify-between"><span>Planned:</span> <span className="font-mono">{item.hours}h</span></div>
                                                                                <div className="flex justify-between"><span>Actual:</span> <span className="font-mono font-bold">{item.actualHours || 0}h</span></div>
                                                                                <div className="flex justify-between"><span>Status:</span> <span className="capitalize">{item.status.toLowerCase().replace('_', ' ')}</span></div>
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ))}
                                                            <div className="flex justify-end pt-1">
                                                                <span className={cn(
                                                                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm border",
                                                                    isOverloaded ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-background/50 text-muted-foreground border-black/5 dark:border-white/5"
                                                                )}>{totalHours}h Total</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="absolute inset-0 m-1 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 cursor-pointer transition-all duration-300"
                                                            onClick={() => handleCellClick(resource, dateStr)}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover/cell:scale-110 transition-transform shadow-sm backdrop-blur-sm hover:bg-primary hover:text-primary-foreground">
                                                                <Plus className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* QUICK ASSIGN DIALOG */}
            <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                <DialogContent className="sm:max-w-[500px] bg-card/70 backdrop-blur-2xl border-white/20 dark:border-white/10 shadow-[0_15px_50px_rgb(0,0,0,0.12)]">
                    <DialogHeader className="border-b border-black/5 dark:border-white/5 pb-4">
                        <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                                <Plus className="w-5 h-5" />
                            </div>
                            Quick Assign Task
                        </DialogTitle>
                        <div className="text-sm font-semibold flex flex-col gap-1.5 mt-3 bg-background/40 backdrop-blur-md p-3 rounded-xl border border-black/5 dark:border-white/5 shadow-inner">
                            <div className="flex justify-between items-center text-muted-foreground uppercase tracking-wider text-[10px]">Resource: <span className="font-bold text-foreground text-xs">{selectedSlot?.resourceName}</span></div>
                            <div className="flex justify-between items-center text-muted-foreground uppercase tracking-wider text-[10px]">Date: <span className="font-bold text-primary text-xs">{selectedSlot?.date ? format(new Date(selectedSlot.date), 'EEEE, MMM d, yyyy') : '-'}</span></div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleAssignSubmit} className="space-y-5 py-2 mt-2 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <input type="hidden" name="targetDate" value={selectedSlot?.date} />
                        <input type="hidden" name="sectionId" value={selectedSlot?.sectionId} />

                        {/* Hidden Resource ID based on type */}
                        {selectedSlot?.resourceType === "EMPLOYEE" && <input type="hidden" name="employeeId" value={selectedSlot.resourceId} />}
                        {selectedSlot?.resourceType === "MACHINE" && <input type="hidden" name="machineId" value={selectedSlot.resourceId} />}

                        <div className="space-y-2 relative z-50">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project <span className="text-destructive">*</span></Label>
                            <Select name="projectId" required onValueChange={(value) => {
                                setSelectedProjectId(value);
                                setSelectedWeeklyTaskId("none");
                                setSelectedItemCode("none");
                            }}>
                                <SelectTrigger className="bg-background/50 backdrop-blur-sm border-black/5 dark:border-white/5 shadow-inner h-11 rounded-xl focus:ring-primary/50">
                                    <SelectValue placeholder="Select Project" />
                                </SelectTrigger>
                                <SelectContent className="bg-card/90 backdrop-blur-xl border-black/10 dark:border-white/10">
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="font-medium">{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedProjectId && (
                            <div className="space-y-3 bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-inner mt-4 relative z-40">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary">Link to Weekly Phase Task <span className="text-muted-foreground font-medium lowercase tracking-normal">(Optional)</span></Label>
                                <Select
                                    value={selectedWeeklyTaskId}
                                    onValueChange={(val) => {
                                        setSelectedWeeklyTaskId(val);
                                        if (val !== "none") {
                                            const t = allTasks.find((x: any) => x.id === val);
                                            if (t) (document.getElementsByName('description')[0] as HTMLInputElement).value = t.description;
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-10 bg-background/60 border-primary/20 hover:border-primary/40 focus:ring-primary/40 rounded-lg">
                                        <SelectValue placeholder="Standalone Job (No Phase)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/90 backdrop-blur-xl border-black/10 dark:border-white/10">
                                        <SelectItem value="none" className="italic text-muted-foreground font-medium">Standalone Job (No Phase)</SelectItem>
                                        {(weeklyPlans || [])
                                            .filter((plan: any) => plan.projectId === selectedProjectId)
                                            .map((plan: any) => {
                                                const sectionTasks = plan.tasks?.filter((t: any) => !selectedSlot?.sectionId || t.sectionId === selectedSlot.sectionId);
                                                if (!sectionTasks || sectionTasks.length === 0) return null;
                                                return (
                                                    <SelectGroup key={plan.id}>
                                                        <SelectLabel className="font-black text-[10px] uppercase tracking-widest text-primary/70">Phase {plan.weekNumber}</SelectLabel>
                                                        {sectionTasks.map((t: any) => (
                                                            <SelectItem key={t.id} value={t.id} className="font-medium text-xs">{t.description}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                );
                                            })
                                        }
                                    </SelectContent>
                                </Select>
                                {selectedWeeklyTaskId !== "none" && <input type="hidden" name="weeklyTaskId" value={selectedWeeklyTaskId} />}
                                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Activity className="w-3 h-3" /> Filtered to tasks in this section.</p>
                            </div>
                        )}

                        <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Task Description / Title <span className="text-destructive">*</span></Label>
                                <Input name="description" defaultValue={selectedTask?.description || ""} placeholder="e.g. Cut 5mm mirror boards" required key={`desc-${selectedTask?.id || 'none'}`} className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extra Details / Instructions</Label>
                                <Input name="extraDetails" placeholder="Add specific task requirements, links, or notes..." className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 pt-4">
                            <div className="space-y-2 relative z-30">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item Code</Label>
                                <Select
                                    value={selectedItemCode}
                                    onValueChange={(val) => {
                                        setSelectedItemCode(val);
                                        if (val !== "none") {
                                            const foundItem = filteredProductionOrderItems.find((i: any) => (i.itemCode || i.boqRef || "Unknown") === val);
                                            if (foundItem) {
                                                if (foundItem.unit) setUnit(foundItem.unit);
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl">
                                        <SelectValue placeholder="Select Item Code..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/90 backdrop-blur-xl border-black/10 dark:border-white/10">
                                        <SelectItem value="none">No Item Code</SelectItem>
                                        {filteredProductionOrderItems.map((item: any) => (
                                            <SelectItem key={`${item.itemCode}-${item.boqRef}`} value={item.itemCode || item.boqRef || "Unknown"}>
                                                {item.itemCode} {item.boqRef ? `(${item.boqRef})` : ""} - {item.itemDescription}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <input type="hidden" name="itemCode" value={selectedItemCode === "none" ? "" : selectedItemCode} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assign Admins <span className="text-muted-foreground/50 lowercase tracking-normal font-medium">(Optional)</span></Label>
                                <MultiSelect
                                    options={(availableAdminUsers || []).map((u: any) => {
                                        const displayName = u.name || u.username || 'Unknown User';
                                        return { label: displayName, value: displayName };
                                    })}
                                    selected={selectedUsers}
                                    onChange={setSelectedUsers}
                                    placeholder="Select admins..."
                                />
                                {selectedWeeklyTaskId !== "none" && taskAssignees.length > 0 && (
                                    <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest mt-1">Populated from Phase Task</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 pt-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Qty</Label>
                                <Input type="number" name="targetQty" value={targetQty} onChange={(e) => setTargetQty(e.target.value)} required className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-mono text-foreground font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit</Label>
                                <Input name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} required className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-mono text-foreground font-bold" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 pt-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budgeted Hrs <span className="text-[9px] lowercase opacity-50 font-medium">(Based on BOQ)</span></Label>
                                <Input type="number" step="0.5" name="budgetedLabourHrs" defaultValue="0" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-mono text-foreground font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary">Target Hrs <span className="text-[9px] lowercase text-muted-foreground font-medium">(Daily Limit)</span></Label>
                                <Input type="number" step="0.5" name="targetHours" defaultValue="8" className="h-11 bg-primary/5 border-primary/20 shadow-inner rounded-xl font-mono text-primary font-bold focus-visible:ring-primary/50" />
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budgeted Material List</Label>
                            <div className="space-y-2.5">
                                {materialsList.map((mat, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <Input
                                            value={mat}
                                            onChange={(e) => updateMaterialRow(idx, e.target.value)}
                                            placeholder={idx === 0 ? "e.g. 2x Wood Panels" : "Add another material..."}
                                            className="h-10 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl"
                                        />
                                        {materialsList.length > 1 && (
                                            <Button type="button" variant="outline" size="icon" onClick={() => removeMaterialRow(idx)} className="shrink-0 h-10 w-10 rounded-xl bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white transition-all shadow-sm">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addMaterialRow} className="mt-1 bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground font-bold uppercase tracking-wider text-[9px] h-9 px-4 rounded-lg transition-all">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Material
                            </Button>
                        </div>

                        {/* Conditional Logic */}
                        {selectedSlot?.resourceType === "MACHINE" && (
                            <div className="space-y-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-6">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">Assign Operator <span className="text-destructive">*</span></Label>
                                <MultiSelect
                                    options={(employees || []).map((e: any) => ({
                                        label: `${e.employeeCode ? '[' + e.employeeCode + '] ' : ''}${e.name} (${e.role})`,
                                        value: e.id
                                    }))}
                                    selected={[]}
                                    onChange={(vals) => { }}
                                    placeholder="Select employee(s)..."
                                />
                            </div>
                        )}

                        <DialogFooter className="pt-6 border-t border-black/5 dark:border-white/5 mt-6 pb-2">
                            <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)} className="h-11 rounded-xl px-6 font-bold uppercase tracking-wider text-[10px] bg-background/50 border-black/10 dark:border-white/10 hover:bg-background">Cancel</Button>
                            <Button type="submit" disabled={submitting} className="h-11 rounded-xl px-8 font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Assign Task
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* RESOURCE DETAILS MODAL */}
            {detailsResource && (
                <ResourceDetailsModal
                    open={detailsModalOpen}
                    onOpenChange={setDetailsModalOpen}
                    resourceId={detailsResource.id}
                    resourceName={detailsResource.name}
                    resourceType={detailsResource.type}
                />
            )}
        </div>
    );
}
