"use client";

import React, { useState } from "react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { format } from "date-fns";
import {
    Calendar,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    Clock,
    FolderKanban,
    ListTodo,
    AlertCircle,
    Building2,
    CalendarClock,
    ChevronDown,
    UserCircle2,
    Wrench
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createLeaveRequest } from "@/app/actions/hr";
import { Loader2, CalendarPlus } from "lucide-react";

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'COMPLETED':
            return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Completed</Badge>;
        case 'IN_PROGRESS':
            return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"><Clock className="w-3 h-3 mr-1 inline" /> In Progress</Badge>;
        default:
            return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"><AlertCircle className="w-3 h-3 mr-1 inline" /> Pending</Badge>;
    }
};

const JobCardDisplay = ({ job }: { job: Record<string, any> }) => {
    return (
        <div className="bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 shadow-sm rounded-xl p-5 flex flex-col gap-4 transition-all hover:shadow-md">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/20 uppercase tracking-wider font-bold">Daily Job</Badge>
                        <StatusBadge status={job.status} />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug">{job.description}</h4>
                </div>

                {/* Employee Highlights - This must be MAIN as requested */}
                <div className="shrink-0 flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-4 py-2.5 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-inner">
                        <UserCircle2 className="w-6 h-6 opacity-80" />
                    </div>
                    <div className="flex flex-col">
                        {job.employee ? (
                            <>
                                <span className="font-black text-indigo-700 dark:text-indigo-300 text-sm leading-tight tracking-wide">
                                    {job.employee.name}
                                </span>
                                <span className="text-[11px] font-bold text-indigo-500/70 dark:text-indigo-400/70 uppercase tracking-widest mt-0.5">
                                    {job.employee.employeeCode || "N/A"}
                                </span>
                            </>
                        ) : (
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 italic">Unassigned</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-black/5 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{job.project?.name || 'No Project'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-rose-400" />
                    <span className="truncate">{job.section?.name || 'General'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-emerald-500" />
                    <span>{job.day ? format(new Date(job.day), "MMM d, yyyy") : "?"}</span>
                </div>
                {job.machine && (
                    <div className="flex items-center gap-2 sm:col-span-3 mt-1 text-sky-600 dark:text-sky-400">
                        <Wrench className="w-4 h-4" />
                        <span>Assigned Machine: <strong>{job.machine.name}</strong></span>
                    </div>
                )}
            </div>
        </div>
    );
};

const PhaseTaskAccordion = ({ task }: { task: Record<string, any> }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`group relative bg-white dark:bg-zinc-900 border ${isOpen ? 'border-indigo-500/30 shadow-md ring-1 ring-indigo-500/10' : 'border-black/5 dark:border-white/5 shadow-sm hover:shadow-md'} rounded-2xl overflow-hidden transition-all duration-300 mb-4`}>
            {/* Sliding background hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.03] to-purple-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div
                className="p-5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4 relative z-10"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider border-violet-500/30 text-violet-600 bg-violet-500/5">
                            Phase Task
                        </Badge>
                        <StatusBadge status={task.status} />
                        {task.jobCards && task.jobCards.length > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-black/5 text-gray-600 dark:text-gray-300 font-bold px-2 rounded-md text-[10px]">
                                {task.jobCards.length} Job{task.jobCards.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight">
                        {task.description || task.title || "Unnamed Phase"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <FolderKanban className="w-4 h-4 text-indigo-400" />
                            <span className="font-medium truncate max-w-[200px]">{task.weeklyPlan?.project?.name || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-rose-400" />
                            <span className="font-medium">{task.section?.name || "General"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>{task.startDate ? format(new Date(task.startDate), "MMM d") : "?"} - {task.endDate ? format(new Date(task.endDate), "MMM d") : "?"}</span>
                        </div>
                    </div>
                </div>
                <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${isOpen ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-black/5 dark:bg-white/5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10'}`}>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 group-hover:text-indigo-600'}`} />
                </div>
            </div>

            <div
                className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="bg-gray-50/50 dark:bg-black/20 border-t border-black/5 dark:border-white/5 p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ListTodo className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Job Cards under this Phase</h4>
                        </div>
                        {task.jobCards && task.jobCards.length > 0 ? (
                            <div className="pl-2 border-l-2 border-indigo-500/20 space-y-4">
                                {task.jobCards.map((job: Record<string, any>) => (
                                    <JobCardDisplay key={job.id} job={job} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 bg-white/50 dark:bg-white/5 rounded-xl p-4 border border-dashed border-gray-300 dark:border-gray-700 italic flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> No individual daily job cards scheduled under this phase yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PAGE_SIZE = 10;

export function MyTasksClient({ initialData, user, leaveRequests = [] }: { initialData: Record<string, any>; user: Record<string, any>; leaveRequests?: Record<string, any>[] }) {
    const dailyCount = initialData.daily.jobs.length;
    const weeklyCount = initialData.weekly.tasks.length + initialData.weekly.jobs.length;
    const monthlyCount = initialData.monthly.tasks.length + initialData.monthly.jobs.length;

    // Pagination state per tab
    const [dailyPage, setDailyPage] = useState(1);
    const [weeklyPage, setWeeklyPage] = useState(1);
    const [monthlyPage, setMonthlyPage] = useState(1);
    const [leavesPage, setLeavesPage] = useState(1);

    // Paginated slices
    const dailyJobs = initialData.daily.jobs.slice((dailyPage - 1) * PAGE_SIZE, dailyPage * PAGE_SIZE);

    // Weekly: flatten tasks + jobs, paginate combined
    const weeklyAll = [...initialData.weekly.tasks.map((t: any) => ({ ...t, _type: 'task' })), ...initialData.weekly.jobs.map((j: any) => ({ ...j, _type: 'job' }))];
    const weeklySlice = weeklyAll.slice((weeklyPage - 1) * PAGE_SIZE, weeklyPage * PAGE_SIZE);
    const weeklyTasks = weeklySlice.filter((x: any) => x._type === 'task');
    const weeklyJobs = weeklySlice.filter((x: any) => x._type === 'job');

    // Monthly: flatten tasks + jobs
    const monthlyAll = [...initialData.monthly.tasks.map((t: any) => ({ ...t, _type: 'task' })), ...initialData.monthly.jobs.map((j: any) => ({ ...j, _type: 'job' }))];
    const monthlySlice = monthlyAll.slice((monthlyPage - 1) * PAGE_SIZE, monthlyPage * PAGE_SIZE);
    const monthlyTasks = monthlySlice.filter((x: any) => x._type === 'task');
    const monthlyJobs = monthlySlice.filter((x: any) => x._type === 'job');

    const leavesSlice = leaveRequests.slice((leavesPage - 1) * PAGE_SIZE, leavesPage * PAGE_SIZE);

    // Leave Request State
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
    const [leaveType, setLeaveType] = useState("CASUAL");
    const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [leaveEndDate, setLeaveEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [leaveReason, setLeaveReason] = useState("");

    const handleLeaveSubmit = async () => {
        if (!leaveStartDate || !leaveEndDate) {
            toast.error("Missing Dates", { description: "Please select both a start and end date." });
            return;
        }
        
        try {
            setIsSubmittingLeave(true);
            await createLeaveRequest({
                userId: user.id,
                startDate: new Date(leaveStartDate),
                endDate: new Date(leaveEndDate),
                type: leaveType,
                reason: leaveReason,
            });
            
            toast.success("Leave Request Submitted", {
                description: "Your request has been forwarded to HR.",
            });
            
            setIsLeaveDialogOpen(false);
            setLeaveReason("");
        } catch (error) {
            toast.error("Error", {
                description: "Failed to submit leave request.",
            });
        } finally {
            setIsSubmittingLeave(false);
        }
    };

    return (
        <div className="w-full space-y-6 pb-20">
            <div className="relative mb-8 bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-3xl p-6 overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <ListTodo className="w-48 h-48 -mr-12 -mt-12 text-indigo-600 rotate-12" />
                </div>
                <div className="relative z-10 max-w-2xl space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 tracking-wide uppercase">Your Desk</span>
                    </div>
                    <h2 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        Welcome back, {user?.username}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Here is a professionally organized overview of all Phases and Daily Jobs assigned directly to you. Click on a Phase to reveal its detailed jobs.
                    </p>
                    
                    <div className="pt-4">
                        <Button 
                            onClick={() => setIsLeaveDialogOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl gap-2 font-medium"
                        >
                            <CalendarPlus className="w-4 h-4" />
                            Request Leave
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="daily" className="w-full">
                <div className="bg-white/40 dark:bg-white/5 p-1 rounded-2xl border border-black/5 dark:border-white/5 inline-flex mb-6 backdrop-blur-xl w-full sm:w-auto overflow-x-auto">
                    <TabsList className="bg-transparent h-auto p-0 flex gap-1 w-max">
                        <TabsTrigger
                            value="daily"
                            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5 transition-all duration-300"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Daily Standalone Jobs
                            <Badge variant="secondary" className="ml-2 bg-black/5 hover:bg-black/5 text-gray-600 font-bold px-1.5 rounded-md min-w-[20px] text-center">
                                {dailyCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="weekly"
                            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5 transition-all duration-300"
                        >
                            <CalendarDays className="w-4 h-4 mr-2" />
                            This Week
                            <Badge variant="secondary" className="ml-2 bg-black/5 hover:bg-black/5 text-gray-600 font-bold px-1.5 rounded-md min-w-[20px] text-center">
                                {weeklyCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="monthly"
                            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5 transition-all duration-300"
                        >
                            <CalendarCheck className="w-4 h-4 mr-2" />
                            This Month
                            <Badge variant="secondary" className="ml-2 bg-black/5 hover:bg-black/5 text-gray-600 font-bold px-1.5 rounded-md min-w-[20px] text-center">
                                {monthlyCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="leaves"
                            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5 transition-all duration-300"
                        >
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            Leave Requests
                            <Badge variant="secondary" className="ml-2 bg-black/5 hover:bg-black/5 text-gray-600 font-bold px-1.5 rounded-md min-w-[20px] text-center">
                                {leaveRequests.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="daily" className="focus-visible:outline-none focus-visible:ring-0">
                    <div className="space-y-4 max-w-4xl">
                        <div className="mb-4">
                            <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Standalone Jobs</h3>
                            <p className="text-sm text-gray-500 mb-2">These are jobs explicitly scheduled for today that don&apos;t belong to any overarching Phase Task.</p>
                        </div>
                        {dailyCount === 0 ? (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl p-8 bg-white/30 dark:bg-white-[0.02]">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">You&apos;re all caught up!</h3>
                                <p className="text-gray-500">No standalone job cards scheduled for today.</p>
                            </div>
                        ) : (
                            dailyJobs.map((job: Record<string, any>) => (
                                <JobCardDisplay key={`d-job-${job.id}`} job={job} />
                            ))
                        )}
                        <PaginationBar
                            page={dailyPage}
                            totalPages={Math.ceil(dailyCount / PAGE_SIZE)}
                            totalItems={dailyCount}
                            pageSize={PAGE_SIZE}
                            onPrev={() => setDailyPage(p => Math.max(1, p - 1))}
                            onNext={() => setDailyPage(p => p + 1)}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="weekly" className="focus-visible:outline-none focus-visible:ring-0">
                    <div className="space-y-6 max-w-4xl">
                        {weeklyCount === 0 ? (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl p-8 bg-white/30 dark:bg-white-[0.02]">
                                <CalendarDays className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Clear Schedule</h3>
                                <p className="text-gray-500">No tasks or jobs scheduled for this week.</p>
                            </div>
                        ) : (
                            <>
                                {weeklyTasks.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-black text-gray-800 dark:text-gray-200 mb-4 sticky top-0 py-2 bg-background z-20 shadow-sm border-b">Phase Tasks</h3>
                                        <div className="space-y-4">
                                            {weeklyTasks.map((task: Record<string, any>) => (
                                                <PhaseTaskAccordion key={`w-task-${task.id}`} task={task} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {weeklyJobs.length > 0 && (
                                    <div className="mt-8 border-t border-black/5 dark:border-white/5 pt-6">
                                        <h3 className="text-lg font-black text-gray-800 dark:text-gray-200 mb-2">Standalone Jobs</h3>
                                        <p className="text-sm text-gray-500 mb-4">Uncategorized jobs falling under this week.</p>
                                        <div className="space-y-4">
                                            {weeklyJobs.map((job: Record<string, any>) => (
                                                <JobCardDisplay key={`w-job-${job.id}`} job={job} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <PaginationBar
                                    page={weeklyPage}
                                    totalPages={Math.ceil(weeklyCount / PAGE_SIZE)}
                                    totalItems={weeklyCount}
                                    pageSize={PAGE_SIZE}
                                    onPrev={() => setWeeklyPage(p => Math.max(1, p - 1))}
                                    onNext={() => setWeeklyPage(p => p + 1)}
                                />
                            </>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="monthly" className="focus-visible:outline-none focus-visible:ring-0">
                    <div className="space-y-6 max-w-4xl">
                        {monthlyCount === 0 ? (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl p-8 bg-white/30 dark:bg-white-[0.02]">
                                <CalendarCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Quiet Month</h3>
                                <p className="text-gray-500">No assignments mapped out for this month yet.</p>
                            </div>
                        ) : (
                            <>
                                {monthlyTasks.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-black text-gray-800 dark:text-gray-200 mb-4 sticky top-0 py-2 bg-background z-20 shadow-sm border-b">Phase Tasks</h3>
                                        <div className="space-y-4">
                                            {monthlyTasks.map((task: Record<string, any>) => (
                                                <PhaseTaskAccordion key={`m-task-${task.id}`} task={task} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {monthlyJobs.length > 0 && (
                                    <div className="mt-8 border-t border-black/5 dark:border-white/5 pt-6">
                                        <h3 className="text-lg font-black text-gray-800 dark:text-gray-200 mb-2">Standalone Jobs</h3>
                                        <p className="text-sm text-gray-500 mb-4">Uncategorized jobs mapped for this month.</p>
                                        <div className="space-y-4">
                                            {monthlyJobs.map((job: Record<string, any>) => (
                                                <JobCardDisplay key={`m-job-${job.id}`} job={job} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <PaginationBar
                                    page={monthlyPage}
                                    totalPages={Math.ceil(monthlyCount / PAGE_SIZE)}
                                    totalItems={monthlyCount}
                                    pageSize={PAGE_SIZE}
                                    onPrev={() => setMonthlyPage(p => Math.max(1, p - 1))}
                                    onNext={() => setMonthlyPage(p => p + 1)}
                                />
                            </>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="leaves" className="focus-visible:outline-none focus-visible:ring-0">
                    <div className="space-y-4 max-w-4xl">
                        <div className="mb-4">
                            <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">My Leave Requests</h3>
                            <p className="text-sm text-gray-500 mb-2">History of your time-off requests and their current approval status.</p>
                        </div>
                        {leaveRequests.length === 0 ? (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl p-8 bg-white/30 dark:bg-white-[0.02]">
                                <CalendarPlus className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">No Leave History</h3>
                                <p className="text-gray-500">You haven't submitted any leave requests yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {leavesSlice.map((request: any) => (
                                    <div key={request.id} className="bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 shadow-sm rounded-xl p-5 flex flex-col gap-4 transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20 uppercase tracking-wider font-bold">
                                                        {request.type === 'CASUAL' ? 'Casual Leave' : request.type === 'SICK' ? 'Sick Leave' : request.type === 'ANNUAL' ? 'Annual PTO' : request.type}
                                                    </Badge>
                                                    {request.status === 'APPROVED' && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Approved</Badge>}
                                                    {request.status === 'REJECTED' && <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"><AlertCircle className="w-3 h-3 mr-1 inline" /> Rejected</Badge>}
                                                    {request.status === 'PENDING' && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"><Clock className="w-3 h-3 mr-1 inline" /> Pending</Badge>}
                                                    {request.isPaid !== null && request.status !== 'PENDING' && (
                                                        <Badge variant="outline" className="text-[10px] ml-1 opacity-80 border-black/10 dark:border-white/10 font-bold px-2 py-0.5">
                                                            {request.isPaid ? 'Paid' : 'Unpaid'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug">
                                                    {format(new Date(request.startDate), "MMM d, yyyy")} <span className="text-gray-400 font-normal mx-1">to</span> {format(new Date(request.endDate), "MMM d, yyyy")}
                                                </h4>
                                                {request.reason && (
                                                    <p className="text-sm text-gray-500 mt-2 font-medium bg-gray-50/50 dark:bg-white/5 p-3 rounded-lg border border-black/5 dark:border-white/5">"{request.reason}"</p>
                                                )}
                                                {request.rejectionReason && request.status === 'REJECTED' && (
                                                    <div className="mt-3 bg-rose-50/50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-3 rounded-lg">
                                                        <p className="text-xs font-bold text-rose-600/80 uppercase tracking-widest mb-1">Rejection Reason</p>
                                                        <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{request.rejectionReason}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 sm:text-right">
                                                <span className="text-xs text-gray-400 font-bold tracking-wide uppercase px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5">
                                                    Applied {format(new Date(request.createdAt), "MMM d")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <PaginationBar
                                    page={leavesPage}
                                    totalPages={Math.ceil(leaveRequests.length / PAGE_SIZE)}
                                    totalItems={leaveRequests.length}
                                    pageSize={PAGE_SIZE}
                                    onPrev={() => setLeavesPage(p => Math.max(1, p - 1))}
                                    onNext={() => setLeavesPage(p => p + 1)}
                                />
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Leave Request Dialog */}
            <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-card/80 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Request Time Off</DialogTitle>
                        <DialogDescription>
                            Submit a leave request for HR approval.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Type</Label>
                                <Select value={leaveType} onValueChange={setLeaveType}>
                                    <SelectTrigger className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus:ring-indigo-500 transition-all">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-black/10 dark:border-white/10 shadow-xl backdrop-blur-xl bg-card/90">
                                        <SelectItem value="CASUAL" className="rounded-lg">Casual Leave</SelectItem>
                                        <SelectItem value="SICK" className="rounded-lg">Sick Leave</SelectItem>
                                        <SelectItem value="ANNUAL" className="rounded-lg">Annual PTO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Start Date</Label>
                                <Input
                                    type="date"
                                    value={leaveStartDate}
                                    onChange={(e) => setLeaveStartDate(e.target.value)}
                                    className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-start-2 grid gap-2">
                                <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">End Date</Label>
                                <Input
                                    type="date"
                                    value={leaveEndDate}
                                    onChange={(e) => setLeaveEndDate(e.target.value)}
                                    className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Reason (Optional)</Label>
                            <Textarea
                                placeholder="Brief reason for the leave..."
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                className="min-h-[100px] rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all resize-none"
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsLeaveDialogOpen(false)}
                            className="rounded-xl border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                            disabled={isSubmittingLeave}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLeaveSubmit}
                            disabled={isSubmittingLeave}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
                        >
                            {isSubmittingLeave ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
