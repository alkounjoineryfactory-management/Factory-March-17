"use client";

import { useState, useEffect } from "react";
import { getResourceActivity } from "@/app/actions/mes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Activity, Clock, Box, Calendar, History, ClipboardList, User, Monitor, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ResourceActivityData {
    active: any[];
    upcoming: any[];
    overdue: any[];
    history: any[];
    stats: {
        totalCompletedHours: number;
        totalAssignedHours: number;
        jobsCompleted: number;
        jobsPending: number;
    }
}

interface ResourceDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resourceId: string;
    resourceName: string;
    resourceType: "EMPLOYEE" | "MACHINE" | "STAFF";
}

export function ResourceDetailsModal({ open, onOpenChange, resourceId, resourceName, resourceType }: ResourceDetailsModalProps) {
    const [data, setData] = useState<ResourceActivityData | null>(null);
    const [loading, setLoading] = useState(false);

    // Filters state
    const [projectFilter, setProjectFilter] = useState<string>("ALL");
    const [monthFilter, setMonthFilter] = useState<string>("ALL");
    const [weekFilter, setWeekFilter] = useState<string>("ALL");

    useEffect(() => {
        if (open && resourceId) {
            fetchData();
        }
    }, [open, resourceId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await getResourceActivity(resourceId, resourceType);
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Start Client Side Filtering Logic ---
    const allOriginalJobs = data ? [...data.active, ...data.upcoming, ...(data.overdue || []), ...data.history] : [];

    // Compute Filter Options
    const projects = Array.from(new Set(allOriginalJobs.map(j => j.project?.name || "No Project")));
    const months = Array.from(new Set(allOriginalJobs.map(j => format(new Date(j.day), "MMMM yyyy"))));
    const weeks = Array.from(new Set(allOriginalJobs.map(j => j.weeklyPlan ? `Phase ${j.weeklyPlan.weekNumber}: ${j.weeklyPlan.title}` : null).filter(Boolean))) as string[];

    const getFilteredJobs = (jobs: any[]) => {
        return jobs.filter(job => {
            const matchProject = projectFilter === "ALL" || (job.project?.name || "No Project") === projectFilter;
            const matchMonth = monthFilter === "ALL" || format(new Date(job.day), "MMMM yyyy") === monthFilter;
            const weekStr = job.weeklyPlan ? `Phase ${job.weeklyPlan.weekNumber}: ${job.weeklyPlan.title}` : null;
            const matchWeek = weekFilter === "ALL" || weekStr === weekFilter;
            return matchProject && matchMonth && matchWeek;
        });
    };

    const filteredData = data ? {
        active: getFilteredJobs(data.active),
        upcoming: getFilteredJobs(data.upcoming),
        overdue: getFilteredJobs(data.overdue || []),
        history: getFilteredJobs(data.history),
        stats: (() => {
            const filteredHistory = getFilteredJobs(data.history);
            const filteredAll = getFilteredJobs(allOriginalJobs);
            return {
                totalCompletedHours: filteredHistory.reduce((sum, j) => sum + (j.actualHrs || 0), 0),
                totalAssignedHours: filteredAll.reduce((sum, j) => sum + (j.targetHours || 0), 0),
                jobsCompleted: filteredHistory.length,
                jobsPending: getFilteredJobs(data.active).length + getFilteredJobs(data.upcoming).length + getFilteredJobs(data.overdue || []).length
            };
        })()
    } : null;
    // --- End Client Side Filtering Logic ---

    const handleExportPDF = () => {
        if (!filteredData) return;

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Resource Report: ${resourceName}`, 14, 20);

        doc.setFontSize(10);
        doc.text(`Type: ${resourceType}`, 14, 28);
        doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 34);

        doc.text(`Total Completed Hours: ${Number(filteredData.stats.totalCompletedHours).toFixed(2).replace(/\.00$/, '')}h`, 14, 42);
        doc.text(`Total Assigned Hours: ${Number(filteredData.stats.totalAssignedHours).toFixed(2).replace(/\.00$/, '')}h`, 14, 48);

        // Active & Upcoming
        doc.setFontSize(14);
        doc.text("Current & Upcoming Work", 14, 60);

        const activeTable = [...(filteredData.overdue || []), ...filteredData.active, ...filteredData.upcoming].map(job => [
            job.project?.name || "No Project",
            job.description || job.taskName || "General Task",
            format(new Date(job.day), "MMM d, yyyy"),
            job.status,
            `${Number(job.targetHours || 0).toFixed(2).replace(/\.00$/, '')}h`
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['Project', 'Task', 'Date', 'Status', 'Target Hrs']],
            body: activeTable,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });

        const historyStartY = (doc as any).lastAutoTable.finalY + 15;

        // History
        doc.setFontSize(14);
        doc.text("Recent History", 14, historyStartY);

        const historyTable = filteredData.history.map(job => [
            job.project?.name || "No Project",
            job.description || job.taskName || "General Task",
            format(new Date(job.day), "MMM d, yyyy"),
            job.status,
            `${Number(job.actualHrs || 0).toFixed(2).replace(/\.00$/, '')}h`
        ]);

        autoTable(doc, {
            startY: historyStartY + 5,
            head: [['Project', 'Task', 'Date', 'Status', 'Actual Hrs']],
            body: historyTable,
            theme: 'grid',
            headStyles: { fillColor: [39, 174, 96] }
        });

        doc.save(`${resourceName.replace(/\s+/g, '_')}_Report.pdf`);
    };

    const renderJobCard = (job: any, isHistory = false, isOverdue = false) => (
        <div key={job.id} className={cn("bg-background/40 p-4 rounded-2xl border backdrop-blur-md hover:bg-background/60 transition-all duration-300 shadow-sm hover:shadow-md group", isOverdue ? "border-red-500/30 dark:border-red-500/30" : "border-black/5 dark:border-white/5")}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className={cn("font-bold text-xs uppercase tracking-widest group-hover:text-primary transition-colors", isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                            {job.project?.name || "No Project"}
                        </h4>
                        {job.section?.name && (
                            <span className="text-[9px] font-bold uppercase tracking-widest bg-foreground/5 text-muted-foreground px-1.5 py-0.5 rounded-sm border border-black/5 dark:border-white/5">
                                {job.section.name}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{job.description || job.taskName || "General Task"}</p>
                </div>
                <Badge variant={isHistory ? "outline" : isOverdue ? "destructive" : "secondary"} className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0 border", isHistory ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : isOverdue ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20")}>
                    {isOverdue ? "OVERDUE" : job.status}
                </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5 shadow-inner">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-mono font-bold text-foreground">{format(new Date(job.day), "MMM d, yyyy")}</span>
                </div>
                {job.itemCode && (
                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5 shadow-inner">
                        <Box className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-mono font-bold text-foreground">{job.itemCode}</span>
                    </div>
                )}
                {job.targetHours > 0 && (
                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5 shadow-inner">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-mono font-bold text-foreground">
                            {isHistory ? <span className="text-emerald-500 dark:text-emerald-400">{Number(job.actualHrs || 0).toFixed(2).replace(/\.00$/, '')}h / {job.targetHours}h</span> : `${job.targetHours}h Plan`}
                        </span>
                    </div>
                )}
            </div>

            {job.weeklyPlan && (
                <div className="mt-3 text-[9px] font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> Linked to Phase {job.weeklyPlan.weekNumber}: {job.weeklyPlan.title}
                </div>
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card/60 backdrop-blur-3xl border-white/20 dark:border-white/10 shadow-[0_30px_100px_rgb(0,0,0,0.15)] rounded-2xl">

                {/* Header Section */}
                <DialogHeader className="p-6 border-b border-black/5 dark:border-white/5 bg-gradient-to-br from-background/80 to-background/40 relative z-10 shrink-0">
                    <div className="absolute inset-0 bg-primary/5 pointer-events-none rounded-t-2xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-[inset_0_2px_10px_rgb(0,0,0,0.1),0_5px_15px_rgb(0,0,0,0.05)] border border-white/10",
                                resourceType === "EMPLOYEE" ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-500" : resourceType === "STAFF" ? "bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-500" : "bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-500"
                            )}>
                                {resourceType === "EMPLOYEE" || resourceType === "STAFF" ? <User className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black tracking-tight uppercase">{resourceName}</DialogTitle>
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-1 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" /> Resource Details & History
                                </p>
                            </div>
                        </div>
                        {data && (
                            <button onClick={handleExportPDF} className="flex items-center gap-2 h-9 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-foreground/20 transition-all">
                                <Download className="w-3.5 h-3.5" /> Export PDF
                            </button>
                        )}
                    </div>
                </DialogHeader>

                {loading || !filteredData ? (
                    <div className="flex-1 flex items-center justify-center bg-transparent">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <ScrollArea className="flex-1 overflow-y-auto px-6 py-6 pb-12 bg-transparent">
                        <div className="space-y-8 max-w-[650px] mx-auto">

                            {/* Filters Bar */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Select value={projectFilter} onValueChange={setProjectFilter}>
                                    <SelectTrigger className="h-9 bg-card/40 border-black/5 dark:border-white/10 text-xs shadow-sm">
                                        <SelectValue placeholder="All Projects" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[250px]">
                                        <SelectItem value="ALL" className="font-bold">All Projects</SelectItem>
                                        {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select value={monthFilter} onValueChange={setMonthFilter}>
                                    <SelectTrigger className="h-9 bg-card/40 border-black/5 dark:border-white/10 text-xs shadow-sm">
                                        <SelectValue placeholder="All Months" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[250px]">
                                        <SelectItem value="ALL" className="font-bold">All Months</SelectItem>
                                        {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select value={weekFilter} onValueChange={setWeekFilter}>
                                    <SelectTrigger className="h-9 bg-card/40 border-black/5 dark:border-white/10 text-xs shadow-sm">
                                        <SelectValue placeholder="All Weeks" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[250px]">
                                        <SelectItem value="ALL" className="font-bold">All Weeks</SelectItem>
                                        {weeks.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-card/40 p-3 rounded-xl border border-black/5 dark:border-white/5 backdrop-blur-md shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Completed</p>
                                    <p className="text-xl font-black text-foreground">{filteredData.stats.jobsCompleted}</p>
                                </div>
                                <div className="bg-card/40 p-3 rounded-xl border border-black/5 dark:border-white/5 backdrop-blur-md shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pending</p>
                                    <p className="text-xl font-black text-blue-500 dark:text-blue-400">{filteredData.stats.jobsPending}</p>
                                </div>
                                <div className="bg-card/40 p-3 rounded-xl border border-black/5 dark:border-white/5 backdrop-blur-md shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Hours Logged</p>
                                    <p className="text-xl font-black text-emerald-500 dark:text-emerald-400">{Number(filteredData.stats.totalCompletedHours).toFixed(2).replace(/\.00$/, '')}h</p>
                                </div>
                                <div className="bg-card/40 p-3 rounded-xl border border-black/5 dark:border-white/5 backdrop-blur-md shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Assigned</p>
                                    <p className="text-xl font-black text-foreground">{Number(filteredData.stats.totalAssignedHours).toFixed(2).replace(/\.00$/, '')}h</p>
                                </div>
                            </div>

                            {/* Active & Upcoming Jobs */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                                    <ClipboardList className="w-4 h-4 text-blue-500" /> Current & Upcoming Work
                                </h3>

                                {filteredData.overdue && filteredData.overdue.length > 0 && (
                                    <div className="space-y-3 mb-3">
                                        {filteredData.overdue.map(job => renderJobCard(job, false, true))}
                                    </div>
                                )}

                                {filteredData.active.length === 0 && filteredData.upcoming.length === 0 && (!filteredData.overdue || filteredData.overdue.length === 0) ? (
                                    <div className="bg-card/30 p-8 rounded-2xl border border-dashed border-black/10 dark:border-white/10 text-center flex flex-col items-center justify-center gap-2">
                                        <Box className="w-8 h-8 text-muted-foreground/30" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No pending or upcoming assignments matching filters</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredData.active.map(job => renderJobCard(job))}
                                        {filteredData.upcoming.map(job => renderJobCard(job))}
                                    </div>
                                )}
                            </div>

                            {/* History */}
                            <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                                    <History className="w-4 h-4 text-emerald-500" /> Recent History
                                </h3>

                                {filteredData.history.length === 0 ? (
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center py-6">No completed tasks matching filters.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredData.history.slice(0, 10).map(job => renderJobCard(job, true))}
                                        {filteredData.history.length > 10 && (
                                            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-4">Showing last 10 completed jobs from filters</p>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}
