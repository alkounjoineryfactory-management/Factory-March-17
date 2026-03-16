"use client";

import { useState, useEffect } from "react";
import {
    createJobCard,
    toggleProjectStatus,
    getProjectPipeline,
    adminSubmitWorkLog,
    toggleJobStatus,
    markSectionComplete
} from "@/app/actions";
import { deleteProject } from "@/app/actions/projects";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { CheckCircle2, Clock, Plus, Loader2, User, CalendarDays, Eye, Search, CheckCheck, X, Trash2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { createMesDailyJob } from "@/app/actions/mes";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProjectDetailsDialog } from "@/components/admin/projects/project-details-dialog";



// --- TYPES ---

interface StageData {
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    employees: string[]; // Deprecated, use workers
    workers: { name: string, hours: number }[];
    totalHours: number;
    dates?: string[];
    jobCardCount: number;
    jobs?: any[];
}

interface ProjectData {
    id: string;
    projectNumber?: string | null;
    name: string;
    client: string | null;
    amount?: number | null;
    startingDate?: Date | null;
    deadline: Date | null;
    location?: string | null;
    status: string;
    blankBoqUrl?: string | null;
    idDrawingUrl?: string | null;
    otherAttachmentUrl?: string | null;
    materialsDetailsUrl?: string | null;
    labourDetailsUrl?: string | null;
    productionOrdersUrl?: string | null;
    stages: Record<string, StageData>;
}

interface GanttProject {
    id: string;
    name: string;
    timeline: Record<string, string[]>;
}

// --- COMPONENT ---

const ProjectPipeline = ({ sections, employees, machines = [], users = [], productionOrders = [], weeklyPlans = [] }: { sections: any[], employees: any[], machines?: any[], users?: any[], productionOrders?: any[], weeklyPlans?: any[] }) => {
    const [pipelineData, setPipelineData] = useState<ProjectData[]>([]);
    const [loading, setLoading] = useState(true);

    // Detail Modal State
    const [selectedStage, setSelectedStage] = useState<{
        sectionName: string;
        sectionIds: string;
        projectName: string;
        projectId: string;
        jobs: any[];
    } | null>(null);

    const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
    const [selectedTimelineProject, setSelectedTimelineProject] = useState<string | null>(null);

    // Filter & Sort & Pagination State
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("latest"); // 'latest', 'due-asc', 'due-desc'
    const [selectedProjectFilter, setSelectedProjectFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedProjectFilter]);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Manual Log State
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logForm, setLogForm] = useState({
        jobCardId: "",
        employeeId: "",
        date: "",
        hoursSpent: "",
        outputQty: "0",
        completed: false
    });
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskForm, setTaskForm] = useState({
        projectId: "",
        sectionId: "",
        employeeId: "", // Optional
        machineId: "", // Optional
        description: "",
        extraDetails: "",
        targetDate: format(new Date(), 'yyyy-MM-dd'),
        targetQty: "1",
        unit: "pcs",
        budgetedLabourHrs: "0",
        targetHours: "8"
    });
    const [selectedWeeklyTaskId, setSelectedWeeklyTaskId] = useState<string>("none");
    const [selectedItemCode, setSelectedItemCode] = useState<string>("");
    const [materialsList, setMaterialsList] = useState<string[]>([""]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // Derived state for Add Job form
    const filteredProductionOrderItems = (productionOrders || [])
        .filter((po: any) => !taskForm.projectId || po.projectId === taskForm.projectId)
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

    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getProjectPipeline();
            setPipelineData(data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    // ... (keep handleAddTask, submitTask, handleProjectCompletion)

    const handleAddTask = (projectId: string, sectionId?: string) => {
        setTaskForm({
            projectId,
            sectionId: sectionId || "",
            employeeId: "",
            machineId: "",
            description: "",
            extraDetails: "",
            targetDate: format(new Date(), 'yyyy-MM-dd'),
            targetQty: "1",
            unit: "pcs",
            budgetedLabourHrs: "0",
            targetHours: "8"
        });
        setSelectedWeeklyTaskId("none");
        setSelectedItemCode("none");
        setMaterialsList([""]);

        // Auto-select section incharge
        const section = sections.find(s => s.id === sectionId);
        if (section && section.incharge) {
            const incharges = section.incharge.split(',').map((s: string) => s.trim()).filter(Boolean);
            setSelectedUsers(incharges);
        } else {
            setSelectedUsers([]);
        }

        setIsTaskModalOpen(true);
    };

    const submitTask = async (e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();

        if (!taskForm.projectId || !taskForm.sectionId || !taskForm.description || !taskForm.targetDate) {
            alert("Please fill in all required fields.");
            return;
        }

        const formData = new FormData();
        formData.append("projectId", taskForm.projectId);
        formData.append("sectionId", taskForm.sectionId);

        // Map common standard fields
        formData.append("description", taskForm.description);
        formData.append("day", taskForm.targetDate);
        formData.append("targetDate", taskForm.targetDate); // legacy just in case
        formData.append("targetQty", taskForm.targetQty);
        formData.append("unit", taskForm.unit);
        formData.append("budgetedLabourHrs", taskForm.budgetedLabourHrs);
        formData.append("targetHours", taskForm.targetHours);

        if (taskForm.extraDetails) formData.append("extraDetails", taskForm.extraDetails);
        if (selectedItemCode && selectedItemCode !== "none") formData.append("itemCode", selectedItemCode);
        if (selectedWeeklyTaskId !== "none") formData.append("weeklyTaskId", selectedWeeklyTaskId);

        if (selectedUsers.length > 0) {
            formData.append("assignedTo", selectedUsers.join(", "));
        }

        const validMaterials = materialsList.filter((m) => m.trim() !== "");
        if (validMaterials.length > 0) {
            formData.append("budgetedMaterialList", validMaterials.join(", "));
        }

        if (taskForm.employeeId && taskForm.employeeId !== "none") {
            formData.append("employeeIds", taskForm.employeeId);
            formData.append("employeeId", taskForm.employeeId);
        }

        if (taskForm.machineId && taskForm.machineId !== "none") {
            formData.append("machineIds", taskForm.machineId);
            formData.append("machineId", taskForm.machineId);
        }

        try {
            await createMesDailyJob(formData);

            setIsTaskModalOpen(false);
            fetchData(); // Refresh data
            router.refresh();
        } catch (e) {
            console.error(e);
            alert("Failed to create task");
        }
    };

    const handleProjectCompletion = async (projectId: string, currentStatus: string) => {
        const newStatus = currentStatus === "COMPLETED" ? "ACTIVE" : "COMPLETED";
        if (confirm(`Mark project as ${newStatus}?`)) {
            try {
                await toggleProjectStatus(projectId, newStatus);
                fetchData();
            } catch (e) {
                console.error(e);
                alert("Failed to update project status");
            }
        }
    };

    const handleDeleteProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectToDelete) return;

        if (deleteConfirmationText !== projectToDelete.name) {
            alert("Project name does not match. Please type the exact name to confirm deletion.");
            return;
        }

        setIsDeleting(true);
        try {
            await deleteProject(projectToDelete.id);
            setDeleteModalOpen(false);
            setProjectToDelete(null);
            setDeleteConfirmationText("");
            fetchData();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to delete project. Ensure you have Admin permissions.");
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Derived Data ---
    const filteredAndSortedData = pipelineData
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.client?.toLowerCase().includes(searchQuery.toLowerCase()) || p.projectNumber?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDropdown = selectedProjectFilter === "all" || p.id === selectedProjectFilter;
            return matchesSearch && matchesDropdown;
        })
        .sort((a, b) => {
            // Always keep COMPLETED at the bottom
            if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
            if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1;

            // Apply sorting for ACTIVE projects
            if (sortBy === "due-asc") {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            }
            if (sortBy === "due-desc") {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
            }
            // 'latest' is the default from the backend
            return 0;
        });

    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);
    const paginatedData = selectedProjectFilter !== "all"
        ? filteredAndSortedData
        : filteredAndSortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


    return (
        <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">

            {loading ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="relative flex-1 overflow-hidden flex flex-col">
                    <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-black/5 dark:border-white/5 bg-background/20 backdrop-blur-md items-start sm:items-center justify-between relative z-10 flex-wrap">
                        {selectedProjectFilter !== "all" ? (
                            <div className="flex items-center gap-3 flex-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-4 text-xs font-bold gap-2 bg-background/50 rounded-xl"
                                    onClick={() => setSelectedProjectFilter("all")}
                                >
                                    ← Back to Projects
                                </Button>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Pipeline View</span>
                                    <span className="text-sm font-black text-foreground leading-tight truncate max-w-[300px]">
                                        {filteredAndSortedData[0]?.name || "Project"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="relative w-full sm:w-[260px] group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        placeholder="Search projects, clients..."
                                        className="pl-10 bg-card/50 backdrop-blur-sm border-black/5 dark:border-white/5 shadow-inner focus-visible:ring-primary/30 w-full rounded-2xl h-10 transition-all duration-300"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="w-[160px] bg-card/50 backdrop-blur-sm border-black/5 dark:border-white/5 shadow-inner rounded-2xl h-10 text-xs font-semibold">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="latest">Latest Added</SelectItem>
                                            <SelectItem value="due-asc">Due Date (Earliest)</SelectItem>
                                            <SelectItem value="due-desc">Due Date (Latest)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-xs font-semibold text-muted-foreground bg-background/50 border border-black/5 dark:border-white/5 px-3 py-2 rounded-xl h-10 flex items-center">
                                        {filteredAndSortedData.length} projects
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* VIEW: Card Grid (default) */}
                    {selectedProjectFilter === "all" ? (
                        <ScrollArea className="flex-1">
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {paginatedData.length === 0 ? (
                                    <div className="col-span-full text-center py-20 text-muted-foreground text-sm">No projects found.</div>
                                ) : paginatedData.map((project) => {
                                    const totalJobs = Object.values(project.stages).reduce((sum: number, s: any) => sum + (s.jobCardCount || 0), 0);
                                    const completedSections = Object.values(project.stages).filter((s: any) => s.status === "COMPLETED").length;
                                    const totalSectionsCount = sections.length;
                                    const progressPct = totalSectionsCount > 0 ? Math.round((completedSections / totalSectionsCount) * 100) : 0;
                                    const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== "COMPLETED";
                                    return (
                                        <div
                                            key={project.id}
                                            onClick={() => setSelectedProjectFilter(project.id)}
                                            className={cn(
                                                "group relative bg-card/60 backdrop-blur-xl border rounded-3xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col gap-3",
                                                project.status === "COMPLETED" ? "border-black/5 dark:border-white/5 opacity-60 grayscale-[0.4]" : "border-black/5 dark:border-white/5 hover:border-primary/30 hover:shadow-primary/5"
                                            )}
                                        >
                                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
                                            <div className="flex items-start justify-between gap-2 relative z-10">
                                                <Badge className={cn("text-[9px] uppercase tracking-widest font-bold h-5 px-2 shadow-none border-none", project.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400")}>
                                                    {project.status === "COMPLETED" ? "Completed" : "Active"}
                                                </Badge>
                                                <div className="flex items-center gap-0.5">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }} title="View Details"><Eye className="w-3.5 h-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all", project.status === "COMPLETED" ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/20" : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/20")} onClick={(e) => { e.stopPropagation(); handleProjectCompletion(project.id, project.status); }} title={project.status === "COMPLETED" ? "Mark Active" : "Mark Complete"}><CheckCircle2 className="w-3.5 h-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => { e.stopPropagation(); setProjectToDelete({ id: project.id, name: project.name }); setDeleteConfirmationText(""); setDeleteModalOpen(true); }} title="Delete Project"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                </div>
                                            </div>
                                            <div className="relative z-10 flex-1">
                                                {project.projectNumber && <span className="text-[10px] text-primary font-mono tracking-widest font-bold bg-primary/10 px-2 py-0.5 rounded-full inline-block mb-1">{project.projectNumber}</span>}
                                                <h3 className={cn("font-black text-lg leading-tight tracking-tight truncate", project.status === "COMPLETED" ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary transition-colors")}>{project.name}</h3>
                                                {project.client && <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate"><User className="w-3 h-3 text-primary/60" /> {project.client}</p>}
                                            </div>
                                            <div className="relative z-10 space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progress</span>
                                                    <span className="text-[10px] font-bold text-foreground">{completedSections}/{totalSectionsCount} sections</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className={cn("h-full rounded-full transition-all duration-700", project.status === "COMPLETED" ? "bg-emerald-500" : "bg-primary")} style={{ width: `${progressPct}%` }} />
                                                </div>
                                            </div>
                                            <div className="relative z-10 flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
                                                {project.deadline ? (
                                                    <span className={cn("text-[10px] font-bold flex items-center gap-1", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                                        <CalendarDays className="w-3 h-3" />
                                                        {isOverdue ? "Overdue · " : "Due · "}{format(new Date(project.deadline), "MMM d, yyyy")}
                                                    </span>
                                                ) : <span className="text-[10px] text-muted-foreground/50">No deadline</span>}
                                                <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{totalJobs} jobs</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    ) : (
                        /* VIEW: Single Project Pipeline — rich section detail rows */
                        (() => {
                            const activeProject = pipelineData.find(p => p.id === selectedProjectFilter);
                            if (!activeProject) return (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Project not found.</div>
                            );

                            const totalJobs = Object.values(activeProject.stages).reduce((sum: number, s: any) => sum + (s.jobCardCount || 0), 0);
                            const completedCount = sections.filter((sec: any) => activeProject.stages[sec.name]?.status === "COMPLETED").length;
                            const progressPct = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;
                            const isOverdue = activeProject.deadline && new Date(activeProject.deadline) < new Date() && activeProject.status !== "COMPLETED";

                            return (
                                <ScrollArea className="flex-1">
                                    <div className="p-5 space-y-5">

                                        {/* ── Project Info Header Card ── */}
                                        <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-card/60 backdrop-blur-xl p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center shadow-sm">
                                            <div className="flex-1 min-w-0 space-y-1">
                                                {activeProject.projectNumber && (
                                                    <span className="text-[10px] text-primary font-mono tracking-widest font-bold bg-primary/10 px-2 py-0.5 rounded-full inline-block">{activeProject.projectNumber}</span>
                                                )}
                                                <h2 className="text-2xl font-black tracking-tight text-foreground">{activeProject.name}</h2>
                                                {activeProject.client && (
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-semibold"><User className="w-3.5 h-3.5 text-primary/60" />{activeProject.client}</p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                                    <Badge className={cn("text-xs font-bold px-3 shadow-none border-none", activeProject.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400")}>
                                                        {activeProject.status === "COMPLETED" ? "Completed" : "Active"}
                                                    </Badge>
                                                    {activeProject.deadline && (
                                                        <span className={cn("text-xs flex items-center gap-1 font-semibold", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                                            <CalendarDays className="w-3.5 h-3.5" />
                                                            {isOverdue ? "Overdue · " : "Due · "}{format(new Date(activeProject.deadline), "MMM d, yyyy")}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground font-semibold">{totalJobs} total jobs</span>
                                                </div>
                                            </div>

                                            {/* Progress ring */}
                                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                                                <div className="relative w-20 h-20">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                                                        <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/20" />
                                                        <circle cx="40" cy="40" r="34" fill="none" strokeWidth="7"
                                                            strokeDasharray={`${2 * Math.PI * 34}`}
                                                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                                                            strokeLinecap="round"
                                                            className={cn("transition-all duration-700", activeProject.status === "COMPLETED" ? "stroke-emerald-500" : "stroke-primary")} />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-foreground">{progressPct}%</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{completedCount}/{sections.length} Sections</span>
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex gap-2 shrink-0">
                                                <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl" onClick={() => setSelectedProject(activeProject)}>
                                                    <Eye className="w-3.5 h-3.5" /> Details
                                                </Button>
                                                <Button variant="outline" size="sm" className={cn("h-9 px-3 text-xs font-bold gap-1.5 rounded-xl", activeProject.status === "COMPLETED" ? "text-emerald-600 border-emerald-200 dark:border-emerald-500/30" : "")} onClick={() => handleProjectCompletion(activeProject.id, activeProject.status)}>
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    {activeProject.status === "COMPLETED" ? "Mark Active" : "Mark Complete"}
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl text-destructive hover:bg-destructive/5 hover:border-destructive/30" onClick={() => { setProjectToDelete({ id: activeProject.id, name: activeProject.name }); setDeleteConfirmationText(""); setDeleteModalOpen(true); }}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* ── Section Detail Table ── */}
                                        <div className="rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden bg-card/40 backdrop-blur-md shadow-sm">
                                            <Table>
                                                <TableHeader className="bg-background/60 backdrop-blur-md">
                                                    <TableRow className="hover:bg-transparent border-b border-black/5 dark:border-white/5">
                                                        <TableHead className="w-[180px] font-bold text-foreground pl-5 h-11 text-xs uppercase tracking-widest"># Section</TableHead>
                                                        <TableHead className="w-[140px] font-bold text-foreground h-11 text-xs uppercase tracking-widest">Status</TableHead>
                                                        <TableHead className="font-bold text-foreground h-11 text-xs uppercase tracking-widest">Workers</TableHead>
                                                        <TableHead className="w-[90px] font-bold text-foreground h-11 text-xs uppercase tracking-widest text-right pr-4">Hours</TableHead>
                                                        <TableHead className="w-[80px] font-bold text-foreground h-11 text-xs uppercase tracking-widest text-center">Jobs</TableHead>
                                                        <TableHead className="w-[200px] font-bold text-foreground h-11 text-xs uppercase tracking-widest">Machines</TableHead>
                                                        <TableHead className="w-[100px] font-bold text-foreground h-11 text-xs uppercase tracking-widest text-right pr-5">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sections.map((section: any, idx: number) => {
                                                        const data: StageData | undefined = activeProject.stages[section.name];
                                                        const isCompleted = data?.status === "COMPLETED";
                                                        const isPending = !data || data.jobCardCount === 0;
                                                        const sectionMachines: any[] = section.machines || [];

                                                        return (
                                                            <TableRow key={section.id}
                                                                className={cn("border-b border-black/5 dark:border-white/5 hover:bg-primary/5 transition-all group",
                                                                    isCompleted && "bg-emerald-50/30 dark:bg-emerald-500/5"
                                                                )}>

                                                                {/* Section name */}
                                                                <TableCell className="pl-5 py-4 font-bold text-sm text-foreground">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground shrink-0">{idx + 1}</span>
                                                                        {section.name}
                                                                    </div>
                                                                </TableCell>

                                                                {/* Status */}
                                                                <TableCell className="py-4">
                                                                    {isPending ? (
                                                                        <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold border-dashed text-muted-foreground/60">Not Started</Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest font-bold border-none",
                                                                            isCompleted
                                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                                        )}>
                                                                            {isCompleted ? "Completed" : "In Progress"}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>

                                                                {/* Workers */}
                                                                <TableCell className="py-4">
                                                                    {data?.workers && data.workers.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {data.workers.map((w, i) => (
                                                                                <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted/60 text-foreground font-semibold px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5">
                                                                                    <User className="w-2.5 h-2.5 text-primary/60" />
                                                                                    {w.name}
                                                                                    <span className="text-muted-foreground font-mono text-[10px]">{w.hours}h</span>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground/40 italic">—</span>
                                                                    )}
                                                                </TableCell>

                                                                {/* Hours */}
                                                                <TableCell className="py-4 text-right pr-4">
                                                                    <span className={cn("font-mono font-bold text-sm", data?.totalHours ? "text-foreground" : "text-muted-foreground/40")}>
                                                                        {data?.totalHours ? `${data.totalHours}h` : "—"}
                                                                    </span>
                                                                </TableCell>

                                                                {/* Jobs (clickable) */}
                                                                <TableCell className="py-4 text-center">
                                                                    <button
                                                                        onClick={() => setSelectedStage({ sectionName: section.name, sectionIds: section.id, projectName: activeProject.name, projectId: activeProject.id, jobs: data?.jobs || [] })}
                                                                        className={cn("font-bold text-sm rounded-lg px-2 py-0.5 transition-colors",
                                                                            data?.jobCardCount
                                                                                ? "text-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                                                                                : "text-muted-foreground/40 cursor-default"
                                                                        )}>
                                                                        {data?.jobCardCount || 0}
                                                                    </button>
                                                                </TableCell>

                                                                {/* Machines */}
                                                                <TableCell className="py-4">
                                                                    {sectionMachines.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {sectionMachines.map((m: any) => (
                                                                                <span key={m.id || m.name} className="text-[10px] bg-muted/80 text-muted-foreground font-semibold px-1.5 py-0.5 rounded-md border border-black/5 dark:border-white/5">
                                                                                    {m.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground/40 italic">—</span>
                                                                    )}
                                                                </TableCell>

                                                                {/* Actions (visible on row hover) */}
                                                                <TableCell className="py-4 pr-5">
                                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                        {!isCompleted && data && data.jobCardCount > 0 && (
                                                                            <Button variant="ghost" size="icon"
                                                                                className="h-7 w-7 rounded-full hover:text-emerald-500 hover:bg-emerald-500/10"
                                                                                title="Mark Section Complete"
                                                                                onClick={async () => {
                                                                                    if (confirm(`Mark "${section.name}" as completed?`)) {
                                                                                        try { await markSectionComplete(activeProject.id, section.id); fetchData(); }
                                                                                        catch { alert("Failed to mark section as completed."); }
                                                                                    }
                                                                                }}>
                                                                                <CheckCheck className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        )}
                                                                        <Button variant="ghost" size="icon"
                                                                            className="h-7 w-7 rounded-full hover:text-primary hover:bg-primary/10"
                                                                            title="Add Job Card"
                                                                            onClick={() => handleAddTask(activeProject.id, section.id)}>
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </ScrollArea>
                            );
                        })()
                    )}

                    {/* Pagination (list view only) */}
                    {selectedProjectFilter === "all" && totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-black/5 dark:border-white/5 bg-background/20 backdrop-blur-md shrink-0">
                            <div className="text-xs font-semibold text-muted-foreground">
                                Showing <span className="text-foreground">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span>–<span className="text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedData.length)}</span> of <span className="text-foreground">{filteredAndSortedData.length}</span> projects
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold bg-background/50" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← Prev</Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum = i + 1;
                                        if (totalPages > 5 && currentPage > 3) { pageNum = currentPage - 2 + i; if (pageNum > totalPages) pageNum = totalPages - (4 - i); }
                                        return <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={cn("w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all", currentPage === pageNum ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{pageNum}</button>;
                                    })}
                                </div>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold bg-background/50" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next →</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>


                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Add Job Card</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitTask} className="space-y-4 py-2 mt-2 max-h-[70vh] overflow-y-auto px-1">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date <span className="text-red-500">*</span></Label>
                                <Input type="date" value={taskForm.targetDate} onChange={(e) => setTaskForm({ ...taskForm, targetDate: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Link to Weekly Phase Task (Optional)</Label>
                                <Select
                                    value={selectedWeeklyTaskId}
                                    onValueChange={(val) => {
                                        setSelectedWeeklyTaskId(val);
                                        if (val !== "none") {
                                            const t = allTasks.find((x: any) => x.id === val);
                                            if (t) setTaskForm(prev => ({ ...prev, description: t.description }));
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Standalone Job (No Phase)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Standalone Job (No Phase)</SelectItem>
                                        {(weeklyPlans || [])
                                            .filter((plan: any) => plan.projectId === taskForm.projectId)
                                            .map((plan: any) => {
                                                const sectionTasks = plan.tasks?.filter((t: any) => !taskForm.sectionId || t.sectionId === taskForm.sectionId);
                                                if (!sectionTasks || sectionTasks.length === 0) return null;
                                                return (
                                                    <SelectGroup key={plan.id}>
                                                        <SelectLabel>Phase {plan.weekNumber}</SelectLabel>
                                                        {sectionTasks.map((t: any) => (
                                                            <SelectItem key={t.id} value={t.id}>{t.description}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                );
                                            })
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Task Description / Title <span className="text-red-500">*</span></Label>
                            <Input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="e.g. Cut 5mm mirror boards" required />
                        </div>

                        <div className="space-y-2">
                            <Label>Extra Details / Instructions</Label>
                            <Input value={taskForm.extraDetails} onChange={(e) => setTaskForm({ ...taskForm, extraDetails: e.target.value })} placeholder="Add specific task requirements, links, or notes..." />
                        </div>

                        <div className="space-y-2">
                            <Label>Item Code</Label>
                            <Select
                                value={selectedItemCode}
                                onValueChange={(val) => {
                                    setSelectedItemCode(val);
                                    if (val !== "none") {
                                        const foundItem = filteredProductionOrderItems.find((i: any) => (i.itemCode || i.boqRef || "Unknown") === val);
                                        if (foundItem) {
                                            if (foundItem.unit) setTaskForm(prev => ({ ...prev, unit: foundItem.unit }));
                                        }
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Item Code..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Item Code</SelectItem>
                                    {filteredProductionOrderItems.map((item: any) => (
                                        <SelectItem key={`${item.itemCode}-${item.boqRef}`} value={item.itemCode || item.boqRef || "Unknown"}>
                                            {item.itemCode} {item.boqRef ? `(${item.boqRef})` : ""} - {item.itemDescription}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-start">
                            <div className="space-y-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
                                <Label className="text-blue-800">Assign Machine (Optional)</Label>
                                <Select value={taskForm.machineId || "none"} onValueChange={(v) => setTaskForm({ ...taskForm, machineId: v })}>
                                    <SelectTrigger className="bg-white border-blue-200">
                                        <SelectValue placeholder="Select Machine..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Manual Task</SelectItem>
                                        {(machines || [])
                                            .filter((m: any) => m.sectionId === taskForm.sectionId)
                                            .map((m: any) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 p-3 bg-amber-50 border border-amber-100 rounded-md">
                                <Label className="text-amber-800">
                                    {taskForm.machineId && taskForm.machineId !== "none" ? "Assign Operator" : "Assign Employee"} <span className="text-red-500">*</span>
                                </Label>
                                <Select value={taskForm.employeeId || "none"} onValueChange={(v) => setTaskForm({ ...taskForm, employeeId: v })}>
                                    <SelectTrigger className="bg-white border-amber-200">
                                        <SelectValue placeholder="Select Operator (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {employees
                                            .filter(e => e.sectionId === taskForm.sectionId && !['INCHARGE', 'FOREMAN'].includes((e.role || "").toUpperCase()))
                                            .map(e => (
                                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Assign Admins (Multi-select)</Label>
                            <MultiSelect
                                options={(availableAdminUsers || []).map((u: any) => {
                                    const displayName = u.name || u.username || 'Unknown User';
                                    return { label: displayName, value: displayName };
                                })}
                                selected={selectedUsers}
                                onChange={setSelectedUsers}
                                placeholder="Select assigned admins..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Target Qty</Label>
                                <Input type="number" value={taskForm.targetQty} onChange={(e) => setTaskForm({ ...taskForm, targetQty: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Input value={taskForm.unit} onChange={(e) => setTaskForm({ ...taskForm, unit: e.target.value })} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Budgeted Labour Hrs</Label>
                                <Input type="number" step="0.5" value={taskForm.budgetedLabourHrs} onChange={(e) => setTaskForm({ ...taskForm, budgetedLabourHrs: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Target (Allowed) Hrs</Label>
                                <Input type="number" step="0.5" value={taskForm.targetHours} onChange={(e) => setTaskForm({ ...taskForm, targetHours: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Budgeted Material List</Label>
                            {materialsList.map((mat, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <Input
                                        value={mat}
                                        onChange={(e) => updateMaterialRow(idx, e.target.value)}
                                        placeholder={idx === 0 ? "e.g. 2x Wood Panels" : "Add another material..."}
                                    />
                                    {materialsList.length > 1 && (
                                        <Button type="button" variant="outline" size="icon" onClick={() => removeMaterialRow(idx)} className="shrink-0 text-destructive hover:text-destructive">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addMaterialRow} className="mt-1">
                                <Plus className="w-4 h-4 mr-2" /> Add Material
                            </Button>
                        </div>

                        {/* Assign Operator moved above to be more visible */}

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-sm font-medium">Create Job</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Admin Section Details Modal */}
            <Dialog open={!!selectedStage} onOpenChange={(open) => !open && setSelectedStage(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Section Details: {selectedStage?.sectionName}</DialogTitle>
                        <DialogDescription>
                            Manage job cards for {selectedStage?.projectName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={() => handleAddTask(selectedStage!.projectId, selectedStage!.sectionIds)} // Need sectionId here
                                className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 gap-1 shadow-sm font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add New Job
                            </Button>
                        </div>

                        <div className="grid gap-2">
                            {selectedStage?.jobs.map((job: any) => (
                                <div key={job.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 border border-border rounded-xl bg-muted/10 shadow-sm hover:bg-muted/20 transition-colors">
                                    <div className="flex-1 min-w-0 w-full">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className={cn("font-semibold text-sm", job.isFinished ? "line-through text-muted-foreground" : "text-foreground")}>
                                                {job.description}
                                            </span>
                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                                                {job.targetQty} pcs
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
                                            <span className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-border">
                                                <User className="w-3.5 h-3.5" /> {job.employeeName || "Unassigned"}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-border">
                                                <CalendarDays className="w-3.5 h-3.5" /> {job.targetDate}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 w-full sm:w-auto font-medium bg-background hover:bg-muted"
                                            onClick={() => {
                                                setLogForm({
                                                    jobCardId: job.id,
                                                    employeeId: job.employeeId || "",
                                                    date: format(new Date(), "yyyy-MM-dd"),
                                                    hoursSpent: "1",
                                                    outputQty: "0",
                                                    completed: false
                                                });
                                                setIsLogModalOpen(true);
                                            }}
                                        >
                                            <Clock className="w-4 h-4 mr-2 text-primary" /> Log Work
                                        </Button>

                                        <Button
                                            variant={job.isFinished ? "secondary" : "default"}
                                            size="icon"
                                            className={cn("h-9 w-9 shrink-0 shadow-sm", job.isFinished ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600")}
                                            onClick={async () => {
                                                await toggleJobStatus(job.id, !job.isFinished);
                                                fetchData();
                                                setSelectedStage(null);
                                            }}
                                            title={job.isFinished ? "Mark Pending" : "Mark Completed"}
                                        >
                                            <CheckCircle2 className={cn("w-4 h-4", job.isFinished ? "" : "text-white")} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {(!selectedStage?.jobs || selectedStage.jobs.length === 0) && (
                                <div className="text-center py-8 text-muted-foreground italic">No job cards in this section.</div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Admin Manual Log Modal */}
            <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manual Work Log</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Date</Label>
                            <Input type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Employee</Label>
                            <Select value={logForm.employeeId} onValueChange={v => setLogForm({ ...logForm, employeeId: v })}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Hours</Label>
                            <Input type="number" step="0.5" value={logForm.hoursSpent} onChange={e => setLogForm({ ...logForm, hoursSpent: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Completed?</Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <input
                                    type="checkbox"
                                    id="completed"
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={logForm.completed}
                                    onChange={e => setLogForm({ ...logForm, completed: e.target.checked })}
                                />
                                <label htmlFor="completed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Mark job as finished
                                </label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={async () => {
                            try {
                                const fd = new FormData();
                                fd.append("jobCardId", logForm.jobCardId);
                                fd.append("employeeId", logForm.employeeId);
                                fd.append("date", logForm.date);
                                fd.append("hoursSpent", logForm.hoursSpent);
                                fd.append("outputQty", logForm.outputQty);
                                fd.append("completed", String(logForm.completed));

                                await adminSubmitWorkLog(fd);
                                setIsLogModalOpen(false);
                                setSelectedStage(null); // Close parent too to refresh data
                                fetchData();
                            } catch (e) {
                                console.error(e);
                                alert("Failed to submit log");
                            }
                        }} className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-sm font-medium">
                            Save Log
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ProjectDetailsDialog
                project={selectedProject}
                open={!!selectedProject}
                onOpenChange={(open) => {
                    if (!open) setSelectedProject(null);
                }}
            />

            {/* Admin Delete Project Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Delete Project
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-foreground/80 leading-relaxed">
                            This action is <span className="font-bold text-destructive">irreversible</span>. It will permanently delete the project <span className="font-bold">"{projectToDelete?.name}"</span> and cascade delete ALL related data, including:
                            <ul className="list-disc leading-tight pl-5 space-y-1 mt-2 mb-4 text-xs font-mono text-muted-foreground">
                                <li>All Production Orders & Items</li>
                                <li>All Material Requisitions & Quotations</li>
                                <li>All Linked Purchase Orders</li>
                                <li>All Weekly Plans & Phases</li>
                                <li>All Job Cards and specific Work Logs</li>
                                <li>All associated Invoices</li>
                            </ul>
                            To confirm, please type the exact project name: <strong className="select-all block mt-1 py-1 px-2 bg-muted text-foreground text-center rounded-md border border-border tracking-wider">{projectToDelete?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleDeleteProject} className="space-y-4 pt-2">
                        <Input
                            placeholder="Type project name here..."
                            value={deleteConfirmationText}
                            onChange={(e) => setDeleteConfirmationText(e.target.value)}
                            className="w-full text-center border-destructive/20 focus-visible:ring-destructive/30"
                            autoComplete="off"
                        />
                        <DialogFooter className="pt-4 flex !justify-between gap-3 sm:gap-0 border-t border-border mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setDeleteConfirmationText("");
                                }}
                                disabled={isDeleting}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={isDeleting || deleteConfirmationText !== projectToDelete?.name}
                                className="w-full sm:w-auto font-bold shadow-sm"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                                    </>
                                ) : (
                                    "Yes, DELETE Project"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProjectPipeline;
