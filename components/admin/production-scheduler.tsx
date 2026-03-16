"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createJobCardFromTask, createWeeklyTask, createBatchSchedule, deleteWeeklyTask, deleteJobCard } from "@/app/actions";
import FormattedDate from "@/components/ui/formatted-date";
import { useRouter } from "next/navigation";
import { ChevronRight, Trash2, Plus, Calendar, ArrowRight, Briefcase, User, Layers, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface WeeklyTask {
    id: string;
    description: string;
    targetQty: number;
    unit: string;
    jobCards: any[];
}

interface WeeklyPlan {
    id: string;
    title: string | null;
    weekNumber: number;
    project: { name: string };
    tasks: WeeklyTask[];
}

export default function ProductionScheduler({
    plans,
    todayAssignments,
    sections,
    currentDate,
    projects,
    selectedProjectId,
    employees,
    machines
}: {
    plans: WeeklyPlan[],
    todayAssignments: any[],
    sections: any[],
    currentDate: string,
    projects: any[],
    selectedProjectId?: string,
    employees: any[],
    machines: any[]
}) {
    const router = useRouter();
    const [selectedTask, setSelectedTask] = useState<WeeklyTask | null>(null);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isBatchOpen, setIsBatchOpen] = useState(false);

    // Batch Distribute State
    const [batchForm, setBatchForm] = useState({
        sectionId: "",
        startDate: currentDate,
        endDate: currentDate,
        idsCount: 1, // Number of identical jobs to create
        hoursPerJob: 8,
    });

    // Multi-select state
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);

    const handleDeleteTask = async (taskId: string) => {
        if (confirm("Are you sure? This will delete the task from the weekly plan.")) {
            await deleteWeeklyTask(taskId);
            router.refresh();
        }
    };

    const handleDeleteJobCard = async (jobCardId: string) => {
        if (confirm("Delete this assignment?")) {
            await deleteJobCard(jobCardId);
            router.refresh();
        }
    };

    const handleAssignSubmit = async (formData: FormData) => {
        setLoading(true);
        await createJobCardFromTask(formData);
        setLoading(false);
        setIsAssignOpen(false);
        router.refresh();
    };

    const handleBatchSubmit = async (formData: FormData) => {
        setLoading(true);

        // Append multi-select values
        selectedEmployeeIds.forEach(id => formData.append("employeeIds", id));
        selectedMachineIds.forEach(id => formData.append("machineIds", id));

        await createBatchSchedule(formData);

        setLoading(false);
        setIsBatchOpen(false);
        // Reset
        setSelectedEmployeeIds([]);
        setSelectedMachineIds([]);
        router.refresh();
    };

    const handleProjectChange = (projectId: string) => {
        const params = new URLSearchParams(window.location.search);
        if (projectId && projectId !== "all") {
            params.set("projectId", projectId);
        } else {
            params.delete("projectId");
        }
        router.push(`?${params.toString()}`);
    };

    // Filtering resources based on selected section in Batch Form
    const filteredEmployees = batchForm.sectionId
        ? employees.filter(e => e.sectionId === batchForm.sectionId)
        : employees;

    const filteredMachines = batchForm.sectionId
        ? machines.filter(m => m.sectionId === batchForm.sectionId)
        : machines;

    const toggleEmployee = (id: string) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleMachine = (id: string) => {
        setSelectedMachineIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

            {/* LEFT SIDEBAR: Weekly Plans & Tasks */}
            <Card className="lg:col-span-4 xl:col-span-3 flex flex-col h-full bg-card backdrop-blur-sm shadow-md border-border overflow-hidden">
                <CardHeader className="bg-muted/50 border-b border-border py-4 px-4 sticky top-0 z-10 backdrop-blur-md space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-indigo-500" />
                            <h3 className="font-semibold text-foreground">Weekly Plans</h3>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsBatchOpen(true)} title="Batch Distribute">
                            <Plus className="w-4 h-4 text-indigo-600" />
                        </Button>
                    </div>

                    {/* Project Filter */}
                    <Select value={selectedProjectId || "all"} onValueChange={handleProjectChange}>
                        <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="All Projects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">
                            {plans.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground text-sm">
                                    {selectedProjectId ? "No plans found for this project." : "No weekly plans found."}
                                </div>
                            )}

                            {plans.map(plan => (
                                <div key={plan.id} className="space-y-3">
                                    <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 border-b border-border flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                                            {plan.project.name}
                                        </h4>
                                        <Badge variant="secondary" className="text-[10px] h-5">Week {plan.weekNumber}</Badge>
                                    </div>

                                    {/* Add Task Input */}
                                    <form action={createWeeklyTask} className="flex gap-2">
                                        <input type="hidden" name="weeklyPlanId" value={plan.id} />
                                        <Input name="description" placeholder="Add task..." className="h-8 text-xs bg-background" required />
                                        <Input name="targetQty" placeholder="#" className="h-8 w-12 text-xs bg-background" type="number" />
                                        <Button size="sm" type="submit" variant="ghost" className="h-8 w-8 p-0 hover:bg-accent">
                                            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                        </Button>
                                    </form>

                                    <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                                        {plan.tasks.map(task => (
                                            <div
                                                key={task.id}
                                                className="group p-2.5 rounded-lg border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer relative"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div onClick={() => { setSelectedTask(task); setIsAssignOpen(true); }} className="flex-1">
                                                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{task.description}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground border-border bg-background">
                                                                {task.targetQty} pcs
                                                            </Badge>
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                <CheckCircle2 className="w-3 h-3" /> {task.jobCards.length} assigned
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex flex-col gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 text-gray-400 hover:text-red-500"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 text-indigo-400 hover:text-indigo-600"
                                                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setIsAssignOpen(true); }}
                                                        >
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* RIGHT MAIN: Daily Schedule Grid */}
            <div className="lg:col-span-8 xl:col-span-9 h-full flex flex-col gap-6 overflow-hidden">
                <Card className="flex-1 overflow-hidden bg-card backdrop-blur-sm shadow-md border-border flex flex-col">
                    <CardHeader className="bg-muted/50 border-b border-border py-4 px-6 flex flex-row items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            <CardTitle className="text-base text-foreground">Daily Assignments</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-background px-3 py-1 text-sm font-normal text-muted-foreground">
                            {currentDate}
                        </Badge>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                {sections.map(section => {
                                    // Filter assignments for this section
                                    const sectionJobs = todayAssignments.filter(job => job.sectionId === section.id);
                                    if (sectionJobs.length === 0) return null;

                                    return (
                                        <div key={section.id} className="mb-8 last:mb-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                {section.name}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {sectionJobs.map(job => (
                                                    <div key={job.id} className="group bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition-all relative">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                                    <User className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-foreground">{job.employee.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{job.status}</p>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-6 w-6 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                                                                onClick={() => handleDeleteJobCard(job.id)}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                        <Separator className="my-2 bg-border" />
                                                        <p className="text-xs text-foreground font-medium line-clamp-2 mb-2 min-h-[32px]">{job.description}</p>

                                                        {job.weeklyPlan && (
                                                            <Badge variant="secondary" className="text-[10px] bg-muted/50 text-muted-foreground border-border font-normal">
                                                                {job.weeklyPlan.project.name}
                                                            </Badge>
                                                        )}

                                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.targetHours}h</span>
                                                            <span>Qty: {job.targetQty}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {todayAssignments.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                                        <div className="p-4 bg-background rounded-full shadow-sm mb-4">
                                            <Calendar className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground text-opacity-80">No Assignments Yet</h3>
                                        <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">Select a task from the sidebar to assign work for {currentDate}.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* ASSIGN TASK MODAL */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Task</DialogTitle>
                        <DialogDescription>{selectedTask?.description}</DialogDescription>
                    </DialogHeader>
                    <form action={handleAssignSubmit} className="space-y-4">
                        <input type="hidden" name="weeklyTaskId" value={selectedTask?.id || ""} />
                        <input type="hidden" name="targetDate" value={currentDate} /> {/* Auto-fill selected date */}

                        <div className="grid gap-2">
                            <Label>Select Section</Label>
                            <Select name="sectionId" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Target Hours</Label>
                                <Input name="targetHours" type="number" step="0.5" defaultValue="8" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Target Qty</Label>
                                <Input name="targetQty" type="number" defaultValue={selectedTask?.targetQty || 1} />
                            </div>
                        </div>

                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-md text-sm text-yellow-700">
                            <p><strong>Note:</strong> To assign to multiple employees at once, use the "Batch Distribute" button (+ icon) on the sidebar.</p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>{loading ? "Assigning..." : "Assign Task"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* BATCH DISTRIBUTE MODAL */}
            <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Batch Distribute Task</DialogTitle>
                        <DialogDescription>Create tasks for specific employees/machines or placeholder slots.</DialogDescription>
                    </DialogHeader>
                    <form action={handleBatchSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                {selectedProjectId ? (
                                    <input type="hidden" name="projectId" value={selectedProjectId} />
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Project <span className="text-red-500">*</span></Label>
                                        <Select name="projectId" required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Project" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label>Select Section <span className="text-red-500">*</span></Label>
                                    <Select name="sectionId" onValueChange={(val) => setBatchForm(prev => ({ ...prev, sectionId: val }))} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sections.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Task Description <span className="text-red-500">*</span></Label>
                                    <Input name="description" placeholder="e.g. Rough Milling" required />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Assign to Week</Label>
                                    {selectedProjectId && plans.length > 0 ? (
                                        <Select name="weekNumber">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Auto (Based on Start Date)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">Auto (Based on Start Date)</SelectItem>
                                                {plans.map(p => (
                                                    <SelectItem key={p.id} value={p.weekNumber.toString()}>Week {p.weekNumber}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input name="weekNumber" type="number" placeholder="Auto (Based on Start Date)" />
                                    )}
                                    <p className="text-[10px] text-muted-foreground">Leave empty to auto-calculate from Start Date.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label>Start Date</Label>
                                <Input name="startDate" type="date" defaultValue={currentDate} required />
                            </div>
                            <div className="grid gap-2">
                                <Label>End Date</Label>
                                <Input name="endDate" type="date" defaultValue={currentDate} required />
                            </div>
                            <div className="grid gap-2">
                                <Label>Hours/Job</Label>
                                <Input name="hoursPerJob" type="number" step="0.5" defaultValue={batchForm.hoursPerJob} />
                            </div>
                        </div>

                        {/* Multi-Select Resources */}
                        {batchForm.sectionId && (
                            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assign Resources (Optional)</Label>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm">Employees</Label>
                                        <ScrollArea className="h-32 border border-border rounded-md bg-background p-2">
                                            <div className="flex flex-col gap-2">
                                                {filteredEmployees.map(emp => (
                                                    <div key={emp.id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`emp-${emp.id}`}
                                                            checked={selectedEmployeeIds.includes(emp.id)}
                                                            onChange={() => toggleEmployee(emp.id)}
                                                            className="rounded border-border text-primary focus:ring-primary"
                                                        />
                                                        <label htmlFor={`emp-${emp.id}`} className="text-sm text-foreground cursor-pointer select-none flex-1">
                                                            {emp.name}
                                                        </label>
                                                    </div>
                                                ))}
                                                {filteredEmployees.length === 0 && <p className="text-xs text-muted-foreground italic">No employees in this section</p>}
                                            </div>
                                        </ScrollArea>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm">Machines</Label>
                                        <ScrollArea className="h-32 border border-border rounded-md bg-background p-2">
                                            <div className="flex flex-col gap-2">
                                                {filteredMachines.map(mach => (
                                                    <div key={mach.id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`mach-${mach.id}`}
                                                            checked={selectedMachineIds.includes(mach.id)}
                                                            onChange={() => toggleMachine(mach.id)}
                                                            className="rounded border-border text-primary focus:ring-primary"
                                                        />
                                                        <label htmlFor={`mach-${mach.id}`} className="text-sm text-foreground cursor-pointer select-none flex-1">
                                                            {mach.name}
                                                        </label>
                                                    </div>
                                                ))}
                                                {filteredMachines.length === 0 && <p className="text-xs text-muted-foreground italic">No machines in this section</p>}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Jobs to Create</Label>
                                <Input
                                    name="count"
                                    type="number"
                                    min="1"
                                    defaultValue="1"
                                    required
                                    disabled={selectedEmployeeIds.length > 0 || selectedMachineIds.length > 0}
                                    className={selectedEmployeeIds.length > 0 || selectedMachineIds.length > 0 ? "opacity-50" : ""}
                                />
                                {(selectedEmployeeIds.length > 0 || selectedMachineIds.length > 0) && (
                                    <p className="text-[10px] text-indigo-600 font-medium">Auto-count based on selection</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Hours per Job</Label>
                                <Input name="hoursPerJob" type="number" min="0.5" defaultValue="8" step="0.5" required />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsBatchOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Batch"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    );
}
