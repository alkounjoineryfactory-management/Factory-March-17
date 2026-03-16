"use client";

import { useState, Fragment } from "react";
import { format } from "date-fns";
import { Employee, LeaveRequest, Section, User } from "@prisma/client";
import { PremiumCard } from "@/components/admin/premium-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateLeaveRequestStatus, createLeaveRequest } from "@/app/actions/hr";
import { toast } from "sonner";
import { Check, Loader2, X, FileText, Plus, Info, Search, ArrowUpDown } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";

type EmployeeWithSection = Employee & { section: Section };
type LeaveRequestWithEmployee = LeaveRequest & { employee?: EmployeeWithSection | null, user?: User | null };

interface HrLeavesTabProps {
    requests: LeaveRequestWithEmployee[];
    employees: EmployeeWithSection[];
    users: User[];
}

const PAGE_SIZE = 10;

export function HrLeavesTab({ requests, employees, users }: HrLeavesTabProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Search & Sort State
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("startDate");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Pagination
    const [page, setPage] = useState(1);

    // Create Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Approve Modal State
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [approveRequestId, setApproveRequestId] = useState<string | null>(null);
    const [isPaid, setIsPaid] = useState<"true" | "false">("false");

    // Reject Modal State
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    // Form State
    const [employeeId, setEmployeeId] = useState("");
    const [type, setType] = useState("CASUAL");
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [reason, setReason] = useState("");

    const handleApproveSubmit = async () => {
        if (!approveRequestId) return;

        try {
            setProcessingId(approveRequestId);
            await updateLeaveRequestStatus(approveRequestId, {
                status: "APPROVED",
                isPaid: isPaid === "true",
            });
            toast("Request Approved", {
                description: `Leave request has been approved as ${isPaid === "true" ? "Paid" : "Unpaid"}.`,
            });
            setIsApproveDialogOpen(false);
            setApproveRequestId(null);
        } catch (error) {
            toast.error("Error", {
                description: "Failed to update leave request.",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectSubmit = async () => {
        if (!rejectRequestId) return;

        try {
            setProcessingId(rejectRequestId);
            await updateLeaveRequestStatus(rejectRequestId, {
                status: "REJECTED",
                rejectionReason: rejectionReason.trim() || undefined,
            });
            toast("Request Rejected", {
                description: "Leave request has been rejected.",
            });
            setIsRejectDialogOpen(false);
            setRejectRequestId(null);
            setRejectionReason("");
        } catch (error) {
            toast.error("Error", {
                description: "Failed to update leave request.",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCreateRequest = async () => {
        if (!employeeId || !startDate || !endDate) {
            toast.error("Missing Fields", { description: "Please fill in all required fields." });
            return;
        }

        try {
            setIsCreating(true);
            const payload: any = {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                type,
                reason,
            };
            if (employeeId.startsWith('emp_')) payload.employeeId = employeeId.replace('emp_', '');
            if (employeeId.startsWith('user_')) payload.userId = employeeId.replace('user_', '');

            await createLeaveRequest(payload);

            toast("Request Created", {
                description: "New leave request has been submitted successfully.",
            });

            // Reset and close
            setEmployeeId("");
            setReason("");
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Error", {
                description: "Failed to create leave request.",
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Filter, Sort, and Group data
    const filteredRequests = requests.filter(req => {
        const name = req.employee?.name || req.user?.name || req.user?.username || "";
        const code = req.employee?.employeeCode || "";
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.type.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const sortedRequests = [...filteredRequests].sort((a, b) => {
        let comparison = 0;
        if (sortBy === "employee") {
            const nameA = a.employee?.name || a.user?.name || a.user?.username || "";
            const nameB = b.employee?.name || b.user?.name || b.user?.username || "";
            comparison = nameA.localeCompare(nameB);
        } else if (sortBy === "startDate") {
            comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        } else if (sortBy === "endDate") {
            comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        } else if (sortBy === "status") {
            comparison = a.status.localeCompare(b.status);
        }
        return sortOrder === "asc" ? comparison : -comparison;
    });

    const totalItems = sortedRequests.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const pagedRequests = sortedRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const groupedBySection = pagedRequests.reduce((acc, req) => {
        let sectionName = "Unassigned";
        if (req.employee?.section?.name) {
            sectionName = req.employee.section.name;
        } else if (req.user) {
            sectionName = "Administration (Users)";
        }
        
        if (!acc[sectionName]) acc[sectionName] = [];
        acc[sectionName].push(req);
        return acc;
    }, {} as Record<string, typeof sortedRequests>);

    const sectionKeys = Object.keys(groupedBySection).sort();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 backdrop-blur-xl border border-black/5 dark:border-white/5 p-2 rounded-2xl shadow-sm mb-6 w-full">
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto flex-1 items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search requests..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="pl-9 h-10 w-full bg-background/50 border-black/5 dark:border-white/5 rounded-xl"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background/50 border-black/5 dark:border-white/5">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="employee">Employee</SelectItem>
                                <SelectItem value="startDate">Start Date</SelectItem>
                                <SelectItem value="endDate">End Date</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => { setSortOrder(prev => prev === "asc" ? "desc" : "asc"); setPage(1); }}
                            className="h-10 w-10 shrink-0 rounded-xl"
                        >
                            <ArrowUpDown className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all gap-2 w-full sm:w-auto"
                >
                    <Plus className="w-4 h-4 shrink-0" />
                    New Request
                </Button>
            </div>

            <PremiumCard className="p-0 overflow-hidden" contentClassName="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-xs uppercase font-bold text-muted-foreground tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Leave Type</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4 hidden md:table-cell w-1/4">Reason</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {sectionKeys.map(sectionName => (
                                <Fragment key={sectionName}>
                                    <tr>
                                        <td colSpan={6} className="px-6 py-3 bg-primary/5 border-y border-black/5 dark:border-white/5">
                                            <span className="font-bold text-sm text-primary uppercase tracking-widest">{sectionName}</span>
                                            <span className="ml-2 text-xs text-muted-foreground font-medium">({groupedBySection[sectionName].length} requests)</span>
                                        </td>
                                    </tr>
                                    {groupedBySection[sectionName].map((req) => (
                                        <tr key={req.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 dark:text-gray-100 tracking-wide">
                                                    {req.employee?.name || req.user?.name || req.user?.username || "Unknown"}
                                                </div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">
                                                    {req.employee?.section?.name || (req.user ? "Admin/Staff" : "Unknown")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-700 dark:text-gray-300">{req.type}</div>
                                                <div className="text-[10px] text-muted-foreground">Req {format(new Date(req.createdAt), "MMM d")}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400">
                                                {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell text-gray-500 dark:text-gray-400 italic text-xs">
                                                {req.reason || "No reason provided."}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <Badge variant="outline" className={`
                                                        ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}
                                                        ${req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : ''}
                                                        ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : ''}
                                                    `}>
                                                        {req.status}
                                                    </Badge>

                                                    {req.status === 'APPROVED' && (
                                                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                                                            {req.isPaid ? 'PAID' : 'UNPAID'}
                                                        </Badge>
                                                    )}
                                                    {req.status === 'REJECTED' && req.rejectionReason && (
                                                        <div className="flex items-center text-[10px] text-rose-500 dark:text-rose-400 max-w-[120px]" title={req.rejectionReason}>
                                                            <Info className="w-3 h-3 mr-1 flex-shrink-0" />
                                                            <span className="truncate">{req.rejectionReason}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {req.status === "PENDING" ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:border-emerald-900 rounded-lg"
                                                            onClick={() => {
                                                                setApproveRequestId(req.id);
                                                                setIsPaid("false");
                                                                setIsApproveDialogOpen(true);
                                                            }}
                                                            disabled={processingId === req.id}
                                                        >
                                                            {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:border-rose-900 rounded-lg"
                                                            onClick={() => {
                                                                setRejectRequestId(req.id);
                                                                setRejectionReason("");
                                                                setIsRejectDialogOpen(true);
                                                            }}
                                                            disabled={processingId === req.id}
                                                        >
                                                            {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                                            Reject
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic mr-2">Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                            {sectionKeys.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No leave requests found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 pb-2">
                    <PaginationBar
                        page={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={PAGE_SIZE}
                        onPrev={() => setPage(p => Math.max(1, p - 1))}
                        onNext={() => setPage(p => p + 1)}
                    />
                </div>
            </PremiumCard>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-card/80 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Create Leave Request</DialogTitle>
                        <DialogDescription>
                            Manually override or log a time-off application for an employee.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Employee</Label>
                            <Select value={employeeId} onValueChange={setEmployeeId}>
                                <SelectTrigger className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus:ring-indigo-500 transition-all">
                                    <SelectValue placeholder="Select an employee..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] rounded-xl border-black/10 dark:border-white/10 shadow-xl backdrop-blur-xl bg-card/90">
                                    <SelectGroup>
                                        <SelectLabel className="text-xs text-muted-foreground uppercase font-bold tracking-wider px-2 py-1.5 pt-3">Factory Employees</SelectLabel>
                                        {employees.map(emp => (
                                            <SelectItem key={`emp_${emp.id}`} value={`emp_${emp.id}`} className="rounded-lg">
                                                {emp.name} <span className="text-muted-foreground text-xs ml-2">({emp.section.name})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel className="text-xs text-muted-foreground uppercase font-bold tracking-wider px-2 py-1.5 pt-3 border-t border-black/5 dark:border-white/5 mt-1">Admin / Staff</SelectLabel>
                                        {users.map(u => (
                                            <SelectItem key={`user_${u.id}`} value={`user_${u.id}`} className="rounded-lg">
                                                {u.name || u.username} <span className="text-muted-foreground text-xs ml-2">(Staff)</span>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Type</Label>
                                <Select value={type} onValueChange={setType}>
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
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-start-2 grid gap-2">
                                <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Reason (Optional)</Label>
                            <Textarea
                                placeholder="Brief reason for the leave..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="min-h-[80px] rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="rounded-xl border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateRequest}
                            disabled={isCreating}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-card/80 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-emerald-600 dark:text-emerald-400">Approve Leave</DialogTitle>
                        <DialogDescription>
                            Specify if this approved leave request is paid or unpaid.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="grid gap-3">
                            <Label className="text-sm font-semibold">Compensation</Label>
                            <Select value={isPaid} onValueChange={(v: "true" | "false") => setIsPaid(v)}>
                                <SelectTrigger className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus:ring-emerald-500 transition-all">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-black/10 dark:border-white/10 shadow-xl backdrop-blur-xl bg-card/90">
                                    <SelectItem value="false" className="rounded-lg">Unpaid Leave</SelectItem>
                                    <SelectItem value="true" className="rounded-lg">Paid Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsApproveDialogOpen(false)}
                            className="rounded-xl border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApproveSubmit}
                            disabled={processingId === approveRequestId}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all"
                        >
                            {processingId === approveRequestId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Approval"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-card/80 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-rose-600 dark:text-rose-400">Reject Leave</DialogTitle>
                        <DialogDescription>
                            Provide an optional reason for rejecting this leave request. This will be visible to the employee.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="grid gap-3">
                            <Label className="text-sm font-semibold">Rejection Reason (Optional)</Label>
                            <Textarea
                                placeholder="E.g., Insufficient leave balance..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="min-h-[100px] rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-rose-500 transition-all resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsRejectDialogOpen(false)}
                            className="rounded-xl border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRejectSubmit}
                            disabled={processingId === rejectRequestId}
                            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition-all"
                        >
                            {processingId === rejectRequestId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
