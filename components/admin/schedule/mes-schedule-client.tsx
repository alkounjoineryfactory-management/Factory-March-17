"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, Save, Search, Trash2, ChevronDown, ChevronUp, FolderKanban, Eye, Pencil, BarChart2, User, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/admin/premium-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import CreateDailyJobDialog from "./create-daily-job-dialog";
import CreateWeeklyTaskDialog from "./create-weekly-task-dialog";
import EditJobCardDialog from "./edit-job-card-dialog";
import ViewJobCardDialog from "./view-job-card-dialog";
import BatchCompleteDialog from "./batch-complete-dialog";
import { updateMesJobCardField, deleteMesJobCard, deleteMesWeeklyTask, markMesWeeklyTaskComplete, getWeeklyJobCards, completeMesJobCard } from "@/app/actions/mes";
import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import MesReportClient from "@/components/admin/reports/mes-report-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MesScheduleClient({ projects, sections, employees, machines, users, currentDate, weekNum, currentUserRole, employeesOnLeave = [], allApprovedLeaves = [], allApprovedMaintenances = [] }: any) {
    const [selectedDailyProject, setSelectedDailyProject] = useState<string | null>(null);
    const [selectedWeeklyProject, setSelectedWeeklyProject] = useState<string | null>(null);
    const [viewJobDetails, setViewJobDetails] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const router = useRouter();

    // Auto-refresh to pick up Kiosk updates (job completion, time logs).
    // - Empty deps: interval is created/cleared exactly once (mount/unmount).
    // - router from useRouter() is a stable singleton in Next.js App Router, so it's
    //   safe to capture in the closure with empty deps — no stale-ref risk.
    // - Pauses automatically when the browser tab is hidden (background tab).
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (!interval) interval = setInterval(() => router.refresh(), 60000);
        };
        const stopPolling = () => {
            if (interval) { clearInterval(interval); interval = null; }
        };
        const onVisibilityChange = () => {
            document.hidden ? stopPolling() : startPolling();
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        if (!document.hidden) startPolling(); // only start if tab is visible

        return () => {
            stopPolling();
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Batch Complete State
    const [batchCompleteJobs, setBatchCompleteJobs] = useState<any[]>([]);
    const [batchCompleteSection, setBatchCompleteSection] = useState<string>("");

    // Report Dialog State
    const [reportDialog, setReportDialog] = useState<'daily' | 'weekly' | null>(null);
    const [weeklyReportData, setWeeklyReportData] = useState<any[]>([]);
    const [isFetchingWeeklyData, setIsFetchingWeeklyData] = useState(false);

    const openWeeklyReport = async () => {
        setIsFetchingWeeklyData(true);
        setReportDialog('weekly');
        try {
            const data = await getWeeklyJobCards(currentDate);
            setWeeklyReportData(data);
        } catch (error) {
            console.error(error);
            alert("Failed to load weekly report data.");
        } finally {
            setIsFetchingWeeklyData(false);
        }
    };

    const handleJobCardUpdate = async (id: string, field: string, value: any) => {
        try {
            await updateMesJobCardField(id, field, value);
        } catch (e) {
            console.error(e);
            alert("Failed to update job card");
        }
    };

    const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
    const [expandedJobCards, setExpandedJobCards] = useState<Record<string, boolean>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState("");
    
    // Reset page to 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const [editJobDetails, setEditJobDetails] = useState<any>(null);
    const [pendingTimeUpdates, setPendingTimeUpdates] = useState<Record<string, { startTime?: string | null; endTime?: string | null }>>({});

    const toggleSection = (projectId: string, sectionName: string) => {
        const key = `${projectId}-${sectionName}`;
        setExpandedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleTimeChange = (jobId: string, field: 'startTime' | 'endTime', value: string | null) => {
        setPendingTimeUpdates(prev => ({
            ...prev,
            [jobId]: {
                ...(prev[jobId] || {}),
                [field]: value
            }
        }));
    };

    const savePendingTimes = async (job: any) => {
        const updates = pendingTimeUpdates[job.id];
        if (!updates) return;

        try {
            if (updates.startTime !== undefined) {
                await handleJobCardUpdate(job.id, 'startTime', updates.startTime);
            }
            if (updates.endTime !== undefined) {
                await handleJobCardUpdate(job.id, 'endTime', updates.endTime);
            }
            // Clear pending state for this job
            setPendingTimeUpdates(prev => {
                const next = { ...prev };
                delete next[job.id];
                return next;
            });
        } catch (e) {
            console.error(e);
            alert("Failed to save times.");
        }
    };

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev =>
            prev.includes(projectId) ? prev.filter(p => p !== projectId) : [...prev, projectId]
        );
    };

    const toggleJobCard = (jobId: string) => {
        setExpandedJobCards(prev => ({
            ...prev,
            [jobId]: !prev[jobId]
        }));
    };

    // Sorting: 1. Completed last, 2. Newest first (using ID as proxy for creation time if createdAt missing)
    const sortedProjects = [...projects].sort((a: any, b: any) => {
        const aCompleted = a.status === 'COMPLETED' || a.status === 'FINISHED';
        const bCompleted = b.status === 'COMPLETED' || b.status === 'FINISHED';

        // 1. Completed sink to bottom
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;

        // 2. Newest first (Descending order by ID or createdAt)
        // Adjust this if your schema has a specific createdAt field that should be used instead
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        
        if (aTime > bTime) return -1;
        if (aTime < bTime) return 1;
        return 0;
    });

    const filteredProjects = sortedProjects.filter((project: any) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.projectNumber && project.projectNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const ITEMS_PER_PAGE = 3;
    const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
    const paginatedProjects = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 pb-12">
            {/* SEARCH BAR */}
            <div className="relative w-full max-w-md group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    type="text"
                    placeholder="Search projects by name or PO number..."
                    className="pl-10 h-11 bg-card/40 backdrop-blur-md border-black/5 dark:border-white/5 shadow-inner focus-visible:ring-primary/30 rounded-2xl w-full transition-all duration-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {paginatedProjects.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground bg-card/40 backdrop-blur-md rounded-2xl border border-dashed border-border shadow-inner">
                    No projects found. Try adjusting your search.
                </div>
            ) : paginatedProjects.map((project: any) => {
                const isExpanded = expandedProjects.includes(project.id);

                return (
                    <div key={project.id} className="space-y-4">
                        <PremiumCard className={`w-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-500 overflow-hidden bg-card/60 backdrop-blur-xl border ${isExpanded ? 'border-primary/30 shadow-xl shadow-primary/5 ring-1 ring-primary/20 scale-[1.002]' : 'border-black/5 dark:border-white/5 hover:border-primary/20 hover:shadow-lg hover:scale-[1.002]'}`}>
                            {/* CARD HEADER (Clickable to Expand) */}
                            <div
                                className="p-5 sm:p-6 cursor-pointer flex items-center justify-between bg-transparent hover:bg-primary/5 transition-colors relative"
                                onClick={() => toggleProject(project.id)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 hover:from-primary/5 hover:to-transparent transition-colors duration-500 pointer-events-none"></div>
                                <div className="flex items-center gap-4 sm:gap-5 relative z-10 w-full">
                                    <div className={`p-3.5 rounded-2xl transition-all duration-500 ${isExpanded ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110' : 'bg-background/50 text-muted-foreground border border-black/5 dark:border-white/5 shadow-sm'}`}>
                                        <FolderKanban className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-xl sm:text-2xl tracking-tight text-foreground truncate">{project.name}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            {project.projectNumber ? (
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold bg-primary/10 text-primary border-none shadow-sm">PO: {project.projectNumber}</Badge>
                                            ) : (
                                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold bg-muted/50 px-2 py-0.5 rounded-full">No Project Number</span>
                                            )}
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-background/50 px-2 py-0.5 rounded-md border border-black/5 dark:border-white/5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span> {project.jobCards?.length || 0} Daily Jobs
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-background/50 px-2 py-0.5 rounded-md border border-black/5 dark:border-white/5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> {project.weeklyPlans?.[0]?.tasks?.length || 0} Weekly Tasks
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className={`rounded-full shrink-0 transition-all duration-500 relative z-10 h-10 w-10 ${isExpanded ? 'bg-primary/10 text-primary rotate-180 scale-110' : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'}`}>
                                    <ChevronDown className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* EXPANDABLE CONTENT */}
                            {isExpanded && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 pt-5 mt-0 border-t border-black/5 dark:border-white/5 bg-background/20 backdrop-blur-sm animate-in slide-in-from-top-4 duration-500">
                                    {/* LEFT COLUMN: DAILY SCHEDULE */}
                                    <div className="space-y-4 border border-black/5 dark:border-white/5 bg-card/40 backdrop-blur-md rounded-3xl p-5 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none -z-10"></div>
                                        <div className="flex items-center justify-between border-b border-border/50 pb-4 relative z-10">
                                            <div>
                                                <h3 className="font-black text-lg tracking-tight text-foreground">Daily Schedule</h3>
                                                <p className="text-xs font-medium text-muted-foreground mt-0.5">{format(new Date(currentDate), "EEEE, MMM d, yyyy")}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setReportDialog('daily')} className="h-9 gap-1.5 text-xs font-semibold text-muted-foreground bg-background/50 hover:bg-background border-black/5 dark:border-white/5 hidden sm:flex transition-all">
                                                    <BarChart2 className="w-3.5 h-3.5" /> View Daily Report
                                                </Button>
                                                <Button size="sm" onClick={() => setSelectedDailyProject(project.id)} className="bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 text-white dark:hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 gap-1.5 h-9 font-bold px-4 rounded-xl">
                                                    <Plus className="w-3.5 h-3.5" /> Create Daily Task
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {project.jobCards?.length > 0 ? (
                                                (Object.entries(
                                                    project.jobCards.reduce((acc: any, job: any) => {
                                                        const sectionName = job.section?.name || "No Section";
                                                        if (!acc[sectionName]) acc[sectionName] = [];
                                                        acc[sectionName].push(job);
                                                        return acc;
                                                    }, {} as Record<string, any[]>)
                                                ) as [string, any[]][]).map(([sectionName, jobs]) => {
                                                    const isSectionExpanded = !!expandedSections[`${project.id}-${sectionName}`];
                                                    
                                                    return (
                                                    <div key={sectionName} className="space-y-1 mb-4 last:mb-0 transition-all">
                                                        {/* COLLAPSIBLE SECTION HEADER */}
                                                        <div 
                                                            onClick={() => toggleSection(project.id, sectionName)}
                                                            className="font-black text-sm text-foreground uppercase tracking-[0.15em] bg-muted/80 hover:bg-muted py-2.5 px-3 rounded-lg border border-border/50 shadow-sm flex items-center justify-between cursor-pointer transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={`p-1 rounded-md transition-transform duration-200 ${isSectionExpanded ? 'rotate-180 bg-foreground/10 text-foreground' : 'bg-transparent text-muted-foreground group-hover:text-foreground'}`}>
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span>{sectionName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {jobs.some((job: any) => job.status !== 'COMPLETED') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 px-2 text-[10px] bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-bold"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setBatchCompleteJobs(jobs.filter((j: any) => j.status !== 'COMPLETED'));
                                                                            setBatchCompleteSection(sectionName);
                                                                        }}
                                                                    >
                                                                        Batch Complete
                                                                    </Button>
                                                                )}
                                                                <Badge variant="secondary" className="text-[10px] bg-background border-none shadow-sm px-1.5 h-5">{jobs.length} Job{jobs.length !== 1 ? 's' : ''}</Badge>
                                                            </div>
                                                        </div>

                                                        {/* LEAN GRID ROWS (Only Rendered if Expanded) */}
                                                        {isSectionExpanded && (
                                                            <div className="pl-6 pr-1 py-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                {jobs.map((job: any) => (
                                                                    <div 
                                                                        key={job.id} 
                                                                        onClick={() => setEditJobDetails(job)}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-2.5 rounded-lg border shadow-sm cursor-pointer transition-all hover:-translate-y-[1px] group", 
                                                                            job.status === 'COMPLETED' 
                                                                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40 opacity-80" 
                                                                                : "bg-card hover:bg-accent/50 border-border hover:border-primary/30"
                                                                        )}
                                                                    >
                                                                        {/* Left: Status & Name */}
                                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                            <div title={job.status} className={cn("w-2 h-2 rounded-full shrink-0 shadow-sm", job.status === 'COMPLETED' ? "bg-emerald-500" : job.status === 'IN_PROGRESS' ? "bg-amber-500 animate-pulse" : "bg-indigo-400")} />
                                                                            <div className="min-w-0 pr-4">
                                                                                <p className={cn("text-xs font-bold truncate tracking-tight transition-colors", job.status === 'COMPLETED' ? "text-emerald-900 dark:text-emerald-300 line-through" : "text-foreground group-hover:text-primary")}>
                                                                                    {job.description}
                                                                                </p>
                                                                                <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                                                                    {job.itemCode && <span className="text-muted-foreground font-mono bg-muted/50 px-1 rounded">{job.itemCode}</span>}
                                                                                    {job.assignedTo && <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{job.assignedTo}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Right: Metrics & Actions */}
                                                                        <div className="flex items-center gap-4 shrink-0">
                                                                            <div className="hidden sm:flex flex-col items-end text-[10px]">
                                                                                <span className="text-muted-foreground font-medium uppercase tracking-wider">Hrs</span>
                                                                                <span className={cn("font-bold", job.status === 'COMPLETED' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>{job.actualHrs ? Number(job.actualHrs).toFixed(1) : '-'} / {job.budgetedLabourHrs || 0}</span>
                                                                            </div>
                                                                            <div className="hidden md:flex flex-col items-end text-[10px]">
                                                                                <span className="text-muted-foreground font-medium uppercase tracking-wider">Qty</span>
                                                                                <span className={cn("font-bold", job.status === 'COMPLETED' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>{job.actualQty || '-'} / {job.targetQty || 1}</span>
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center gap-2 ml-2">
                                                                                {job.status !== 'COMPLETED' && (
                                                                                    <Button 
                                                                                        size="icon" 
                                                                                        variant="ghost" 
                                                                                        className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors z-10"
                                                                                        onClick={(e) => { e.stopPropagation(); completeMesJobCard(job.id); }}
                                                                                        title="Mark Complete"
                                                                                    >
                                                                                        <CheckCircle className="w-4 h-4" />
                                                                                    </Button>
                                                                                )}
                                                                                <Button 
                                                                                    size="icon" 
                                                                                    variant="ghost" 
                                                                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors z-10"
                                                                                    onClick={(e) => { e.stopPropagation(); setViewJobDetails(job); }}
                                                                                    title="View Full Details"
                                                                                >
                                                                                    <Eye className="w-4 h-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )})
                                            ) : (
                                                <div className="text-center py-6 text-xs text-muted-foreground bg-background rounded-lg border border-dashed border-border flex flex-col items-center justify-center space-y-2">
                                                    <Clock className="w-5 h-5 opacity-20" />
                                                    <span>No daily jobs scheduled.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN: WEEKLY SCHEDULE */}
                                    <div className="space-y-4 border border-black/5 dark:border-white/5 bg-card/40 backdrop-blur-md rounded-3xl p-5 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none -z-10"></div>
                                        <div className="flex items-center justify-between border-b border-border/50 pb-4 relative z-10">
                                            <div>
                                                <h3 className="font-black text-lg tracking-tight text-foreground">Weekly / Phase Schedule</h3>
                                                <p className="text-xs font-medium text-muted-foreground mt-0.5">Custom project timelines</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" onClick={openWeeklyReport} disabled={isFetchingWeeklyData} className="h-9 gap-1.5 text-xs font-semibold text-muted-foreground bg-background/50 hover:bg-background border-black/5 dark:border-white/5 hidden sm:flex transition-all">
                                                    <BarChart2 className="w-3.5 h-3.5" /> {isFetchingWeeklyData ? 'Loading...' : 'View Phase Report'}
                                                </Button>
                                                <Button size="sm" onClick={() => setSelectedWeeklyProject(project.id)} className="bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white dark:hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 gap-1.5 h-9 font-bold px-4 rounded-xl">
                                                    <Plus className="w-3.5 h-3.5" /> Create Weekly Schedule
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-2">
                                            {project.weeklyPlans?.length > 0 ? project.weeklyPlans.map((plan: any) => (
                                                <div key={plan.id} className="space-y-2">
                                                    <div className="sticky top-0 bg-muted/95 backdrop-blur z-10 py-1.5 px-3 rounded-md border border-border/50 flex justify-between items-center shadow-sm">
                                                        <span className="text-xs font-bold text-foreground">Week / Phase {plan.weekNumber}</span>
                                                        <Badge variant="secondary" className="text-[10px] bg-background/50">{plan.tasks?.length || 0} Tasks</Badge>
                                                    </div>

                                                    {plan.tasks?.length > 0 ? (
                                                        (Object.entries(
                                                            plan.tasks.reduce((acc: any, task: any) => {
                                                                const sectionName = task.section?.name || "No Section";
                                                                if (!acc[sectionName]) acc[sectionName] = [];
                                                                acc[sectionName].push(task);
                                                                return acc;
                                                            }, {} as Record<string, any[]>)
                                                        ) as [string, any[]][]).map(([sectionName, tasks]) => {
                                                            const isSectionExpanded = !!expandedSections[`weekly-${plan.id}-${sectionName}`];
                                                            
                                                            return (
                                                            <div key={sectionName} className="space-y-1 mb-3 last:mb-0 transition-all">
                                                                {/* COLLAPSIBLE WEEKLY SECTION HEADER */}
                                                                <div 
                                                                    onClick={() => toggleSection(`weekly-${plan.id}`, sectionName)}
                                                                    className="font-black text-[10px] text-foreground uppercase tracking-[0.15em] bg-muted/60 hover:bg-muted py-2 px-2.5 rounded-lg border border-border/50 shadow-sm flex items-center justify-between cursor-pointer transition-colors group"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`p-0.5 rounded-md transition-transform duration-200 ${isSectionExpanded ? 'rotate-180 bg-foreground/10 text-foreground' : 'bg-transparent text-muted-foreground group-hover:text-foreground'}`}>
                                                                            <ChevronDown className="w-3 h-3" />
                                                                        </div>
                                                                        <span>{sectionName}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="secondary" className="text-[9px] bg-background border-none shadow-sm px-1.5 h-4">{tasks.length} Task{tasks.length !== 1 ? 's' : ''}</Badge>
                                                                    </div>
                                                                </div>

                                                                {/* LEAN WEEKLY ROWS */}
                                                                {isSectionExpanded && (
                                                                    <div className="pl-5 pr-1 py-1.5 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                        {tasks.map((task: any) => {
                                                                            const jobCards = task.jobCards || [];
                                                                            const totalJobs = jobCards.length;
                                                                            const completedJobs = jobCards.filter((jc: any) => jc.status === "COMPLETED").length;
                                                                            const ongoingJobs = jobCards.filter((jc: any) => jc.status === "IN_PROGRESS").length;

                                                                            let computedStatus = task.status;
                                                                            let statusColor = "bg-muted text-muted-foreground";
                                                                            let isDone = false;

                                                                            if (task.status === "COMPLETED") {
                                                                                computedStatus = "Completed";
                                                                                statusColor = "text-emerald-500";
                                                                                isDone = true;
                                                                            } else if (totalJobs > 0) {
                                                                                if (completedJobs === totalJobs) {
                                                                                    computedStatus = "Completed";
                                                                                    statusColor = "text-emerald-500";
                                                                                    isDone = true;
                                                                                } else if (completedJobs > 0 || ongoingJobs > 0) {
                                                                                    computedStatus = "Ongoing";
                                                                                    statusColor = "text-blue-500 animate-pulse";
                                                                                } else {
                                                                                    computedStatus = "Not Started";
                                                                                    statusColor = "text-amber-500";
                                                                                }
                                                                            } else {
                                                                                if (task.status === "PENDING") {
                                                                                    computedStatus = "Not Started";
                                                                                    statusColor = "text-amber-500";
                                                                                } else if (task.status === "IN_PROGRESS") {
                                                                                    computedStatus = "Ongoing";
                                                                                    statusColor = "text-blue-500 animate-pulse";
                                                                                }
                                                                            }

                                                                            const progressPercentage = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

                                                                            return (
                                                                                <div 
                                                                                    key={task.id} 
                                                                                    className={cn(
                                                                                        "flex items-center justify-between p-2 rounded-lg border shadow-sm transition-all group relative", 
                                                                                        isDone 
                                                                                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20 opacity-80" 
                                                                                            : "bg-card hover:bg-accent/50 border-border hover:border-primary/30"
                                                                                    )}
                                                                                >
                                                                                    {/* Left: Status & Desc */}
                                                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                                        <div title={computedStatus} className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-sm", statusColor.split(' ')[0], statusColor.includes('pulse') && "animate-pulse")} />
                                                                                        <div className="min-w-0 pr-2">
                                                                                            <p className={cn("text-[11px] font-bold truncate tracking-tight transition-colors", isDone ? "text-emerald-900 dark:text-emerald-300 line-through" : "text-foreground group-hover:text-primary")}>
                                                                                                {task.description}
                                                                                            </p>
                                                                                            <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                                                                                                <span>{task.startDate ? format(new Date(task.startDate), "MMM d") : "TBD"} - {task.endDate ? format(new Date(task.endDate), "MMM d") : "TBD"}</span>
                                                                                                {task.assignedTo && <span className="text-primary/70">{task.assignedTo}</span>}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Right: Metrics & Actions */}
                                                                                    <div className="flex items-center gap-3 shrink-0">
                                                                                        {totalJobs > 0 && (
                                                                                            <div className="hidden sm:flex flex-col items-end text-[9px] font-bold tracking-widest uppercase">
                                                                                                <span className="text-muted-foreground">Jobs: {completedJobs}/{totalJobs}</span>
                                                                                                {progressPercentage > 0 && <span className={cn(progressPercentage === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-500")}>{progressPercentage}%</span>}
                                                                                            </div>
                                                                                        )}
                                                                                        
                                                                                        <div className="flex items-center pl-1">
                                                                                            {!isDone && (
                                                                                                <Button 
                                                                                                    size="icon" 
                                                                                                    variant="ghost" 
                                                                                                    className="h-6 w-6 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors z-10"
                                                                                                    onClick={async (e) => { 
                                                                                                        e.stopPropagation(); 
                                                                                                        if (confirm("Mark this weekly task as Completed?")) {
                                                                                                            try { await markMesWeeklyTaskComplete(task.id); }
                                                                                                            catch (err) { alert("Failed to mark complete."); }
                                                                                                        }
                                                                                                    }}
                                                                                                    title="Mark Complete"
                                                                                                >
                                                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                                                </Button>
                                                                                            )}
                                                                                            <button 
                                                                                                onClick={async (e) => {
                                                                                                    e.stopPropagation();
                                                                                                    if (confirm("Delete weekly task?")) {
                                                                                                        try { await deleteMesWeeklyTask(task.id); } 
                                                                                                        catch (err) { alert("Failed to delete task."); }
                                                                                                    }
                                                                                                }} 
                                                                                                className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                                                            >
                                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )})
                                                    ) : (
                                                        <p className="text-[11px] text-muted-foreground italic pl-4 pb-2 border-l border-border/50">No tasks mapped in this phase.</p>
                                                    )}
                                                </div>
                                            )) : (
                                                <div className="text-center py-6 text-xs text-muted-foreground bg-background rounded-lg border border-dashed border-border flex flex-col items-center justify-center space-y-2 mt-2">
                                                    <Clock className="w-5 h-5 opacity-20" />
                                                    <span>No phases or tasks scheduled.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </PremiumCard>
                        <CreateDailyJobDialog
                            open={selectedDailyProject === project.id}
                            onOpenChange={(v: boolean) => !v && setSelectedDailyProject(null)}
                            projectId={project.id}
                            sections={sections}
                            employees={employees}
                            machines={machines}
                            users={users}
                            weeklyPlans={project.weeklyPlans || []}
                            productionOrders={project.productionOrders || []}
                            currentDate={currentDate}
                            employeesOnLeave={employeesOnLeave}
                            allApprovedLeaves={allApprovedLeaves}
                            allApprovedMaintenances={allApprovedMaintenances}
                        />
                    </div>
                );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-2xl shadow-sm mt-6">
                    <div className="text-xs font-semibold text-muted-foreground">
                        Showing <span className="text-foreground">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)}</span> of <span className="text-foreground">{filteredProjects.length}</span> projects
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-background/50 text-xs font-bold"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Show pages around current
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i;
                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={cn(
                                            "w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-all",
                                            currentPage === pageNum 
                                                ? "bg-primary text-primary-foreground shadow-md" 
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-background/50 text-xs font-bold"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <CreateWeeklyTaskDialog
                open={!!selectedWeeklyProject}
                onOpenChange={(open: boolean) => !open && setSelectedWeeklyProject(null)}
                projectId={selectedWeeklyProject}
                weekNum={weekNum}
                sections={sections}
                users={users}
            />

            <EditJobCardDialog
                open={!!editJobDetails}
                onOpenChange={(open: boolean) => !open && setEditJobDetails(null)}
                job={editJobDetails}
                sections={sections}
                employees={employees}
                machines={machines}
                users={users}
                weeklyPlans={projects.find((p: any) => p.id === editJobDetails?.projectId)?.weeklyPlans || []}
                productionOrders={projects.find((p: any) => p.id === editJobDetails?.projectId)?.productionOrders || []}
            />

            <ViewJobCardDialog
                job={viewJobDetails}
                open={!!viewJobDetails}
                onOpenChange={(open: boolean) => !open && setViewJobDetails(null)}
            />

            {/* Daily Report Dialog */}
            <Dialog open={reportDialog === 'daily'} onOpenChange={(open) => !open && setReportDialog(null)}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Daily Schedule Report ({format(new Date(currentDate), "dd MMM yyyy")})</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <MesReportClient data={projects.flatMap((p: any) => (p.jobCards || []).map((jc: any) => ({ ...jc, project: { name: p.name } })))} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Weekly Report Dialog */}
            <Dialog open={reportDialog === 'weekly'} onOpenChange={(open) => !open && setReportDialog(null)}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Weekly Phase Report (Week {weekNum})</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        {isFetchingWeeklyData ? (
                            <div className="flex h-40 items-center justify-center text-muted-foreground animate-pulse">Loading data...</div>
                        ) : (
                            <MesReportClient data={weeklyReportData} />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <BatchCompleteDialog
                open={batchCompleteJobs.length > 0}
                onOpenChange={(open: boolean) => !open && setBatchCompleteJobs([])}
                jobs={batchCompleteJobs}
                sectionName={batchCompleteSection}
                onSuccess={() => setBatchCompleteJobs([])}
            />

            {/* Edit Modal */}
            <Dialog open={!!editJobDetails} onOpenChange={(o) => {
                if (!o) {
                    setEditJobDetails(null);
                    setPendingTimeUpdates({});
                }
            }}>
                <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-0 overflow-hidden rounded-xl">
                    {editJobDetails && (
                        <>
                            <DialogHeader className="p-4 sm:p-6 pb-0 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                                            {editJobDetails.description}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <span>{editJobDetails.project?.name}</span>
                                            <span className="w-1 h-1 rounded-full bg-border" />
                                            <span>{editJobDetails.section?.name}</span>
                                        </DialogDescription>
                                    </div>
                                    <Badge variant="outline" className={cn(
                                        "font-bold uppercase tracking-widest px-2.5 py-0.5 border-2 shadow-sm",
                                        editJobDetails.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                        editJobDetails.status === 'IN_PROGRESS' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                        "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                    )}>
                                        {editJobDetails.status}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <ScrollArea className="max-h-[70vh]">
                                <div className="p-4 sm:p-6 space-y-6">
                                    
                                    {/* Timeline Setup */}
                                    <div className="bg-muted/30 border border-border/50 rounded-xl p-4 sm:p-5 space-y-4 shadow-inner">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5" /> Time Tracking
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Start Time</label>
                                                <Input
                                                    type="datetime-local"
                                                    className="h-9 text-sm bg-background border-border shadow-sm focus:border-indigo-500/50"
                                                    value={pendingTimeUpdates[editJobDetails.id]?.startTime !== undefined 
                                                        ? (pendingTimeUpdates[editJobDetails.id]?.startTime ? new Date(new Date(pendingTimeUpdates[editJobDetails.id].startTime as string).getTime() - new Date(pendingTimeUpdates[editJobDetails.id].startTime as string).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '') 
                                                        : (editJobDetails.startTime ? new Date(new Date(editJobDetails.startTime).getTime() - new Date(editJobDetails.startTime).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')}
                                                    onChange={(e) => handleTimeChange(editJobDetails.id, 'startTime', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                                    disabled={editJobDetails.status === 'COMPLETED' && currentUserRole !== 'ADMIN'}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase font-bold text-muted-foreground">End Time</label>
                                                <Input
                                                    type="datetime-local"
                                                    className="h-9 text-sm bg-background border-border shadow-sm focus:border-indigo-500/50"
                                                    value={pendingTimeUpdates[editJobDetails.id]?.endTime !== undefined 
                                                        ? (pendingTimeUpdates[editJobDetails.id]?.endTime ? new Date(new Date(pendingTimeUpdates[editJobDetails.id].endTime as string).getTime() - new Date(pendingTimeUpdates[editJobDetails.id].endTime as string).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '') 
                                                        : (editJobDetails.endTime ? new Date(new Date(editJobDetails.endTime).getTime() - new Date(editJobDetails.endTime).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')}
                                                    onChange={(e) => handleTimeChange(editJobDetails.id, 'endTime', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                                    disabled={editJobDetails.status === 'COMPLETED' && currentUserRole !== 'ADMIN'}
                                                />
                                            </div>
                                        </div>
                                        {pendingTimeUpdates[editJobDetails.id] && (
                                            <div className="pt-2 flex justify-end">
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => {
                                                        savePendingTimes(editJobDetails);
                                                        setEditJobDetails({...editJobDetails, ...pendingTimeUpdates[editJobDetails.id]});
                                                    }} 
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-bold"
                                                >
                                                    <Save className="w-4 h-4 mr-1.5" /> Save Times
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Metrics & Updates */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                                                Actual Qty ({editJobDetails.unit})
                                                <span className="text-foreground/50">Target: {editJobDetails.targetQty || 1}</span>
                                            </label>
                                            <Input 
                                                type="number" 
                                                defaultValue={editJobDetails.actualQty} 
                                                onBlur={(e) => {
                                                    handleJobCardUpdate(editJobDetails.id, 'actualQty', parseInt(e.target.value));
                                                    setEditJobDetails({...editJobDetails, actualQty: parseInt(e.target.value)});
                                                }} 
                                                className="h-9 text-md font-bold w-full" 
                                                disabled={editJobDetails.status === 'COMPLETED'} 
                                            />
                                        </div>
                                        <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                                                Actual Hrs
                                                <span className="text-foreground/50">Budget: {editJobDetails.budgetedLabourHrs || 0}</span>
                                            </label>
                                            <div className="flex items-center h-9 px-3 rounded-md border border-input bg-muted/50 font-bold text-md">
                                                {editJobDetails.actualHrs ? Number(editJobDetails.actualHrs).toFixed(1) : '0'} Hrs
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Remarks / Journal</label>
                                        <textarea 
                                            className="w-full flex min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="Add notes about this job..." 
                                            defaultValue={editJobDetails.remarks || ''} 
                                            onBlur={(e) => {
                                                handleJobCardUpdate(editJobDetails.id, 'remarks', e.target.value);
                                                setEditJobDetails({...editJobDetails, remarks: e.target.value});
                                            }} 
                                            disabled={editJobDetails.status === 'COMPLETED'} 
                                        />
                                    </div>

                                </div>
                            </ScrollArea>

                            <div className="p-4 sm:p-6 bg-muted/20 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
                                
                                <button onClick={async () => {
                                    if (confirm("Delete job card?")) {
                                        try {
                                            await deleteMesJobCard(editJobDetails.id);
                                            setEditJobDetails(null);
                                        } catch (e) {
                                            console.error(e);
                                            alert("Failed to delete job card. It may be linked to other records.");
                                        }
                                    }
                                }} className="flex inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-md">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </button>
                                
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={() => {
                                        setEditJobDetails(null);
                                        setPendingTimeUpdates({});
                                    }}>Done</Button>
                                    
                                    {editJobDetails.status !== 'COMPLETED' && (
                                        <Button 
                                            onClick={() => {
                                                completeMesJobCard(editJobDetails.id);
                                                setEditJobDetails(null);
                                            }} 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

        </div >
    );
}
