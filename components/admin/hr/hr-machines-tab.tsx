"use client";

import { useState, Fragment } from "react";
import { format } from "date-fns";
import { Machine, MachineMaintenance, Section } from "@prisma/client";
import { PremiumCard } from "@/components/admin/premium-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateMachineMaintenanceStatus, createMachineMaintenance } from "@/app/actions/hr";
import { toast } from "sonner";
import { Check, Loader2, X, FileText, Plus, Info, Wrench, Search, ArrowUpDown } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;

type MachineWithSection = Machine & { section: Section };
type MaintenanceWithMachine = MachineMaintenance & { machine: MachineWithSection };

interface HrMachinesTabProps {
    requests: MaintenanceWithMachine[];
    machines: MachineWithSection[];
}

export function HrMachinesTab({ requests, machines }: HrMachinesTabProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Search & Sort State
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("startDate");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);

    // Create Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Approve Modal State
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [approveRequestId, setApproveRequestId] = useState<string | null>(null);

    // Reject Modal State
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    // Form State
    const [machineId, setMachineId] = useState("");
    const [type, setType] = useState("ROUTINE");
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [reason, setReason] = useState("");

    const handleApproveSubmit = async () => {
        if (!approveRequestId) return;

        try {
            setProcessingId(approveRequestId);
            await updateMachineMaintenanceStatus(approveRequestId, {
                status: "APPROVED",
            });
            toast("Maintenance Approved", {
                description: "Machine maintenance request has been approved.",
            });
            setIsApproveDialogOpen(false);
            setApproveRequestId(null);
        } catch (error) {
            toast.error("Error", {
                description: "Failed to update maintenance request.",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectSubmit = async () => {
        if (!rejectRequestId) return;

        try {
            setProcessingId(rejectRequestId);
            await updateMachineMaintenanceStatus(rejectRequestId, {
                status: "REJECTED",
                rejectionReason: rejectionReason.trim() || undefined,
            });
            toast("Maintenance Rejected", {
                description: "Machine maintenance has been rejected.",
            });
            setIsRejectDialogOpen(false);
            setRejectRequestId(null);
            setRejectionReason("");
        } catch (error) {
            toast.error("Error", {
                description: "Failed to update maintenance request.",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleCreateRequest = async () => {
        if (!machineId || !startDate || !endDate || !type) {
            toast.error("Missing Fields", { description: "Please fill in all required fields." });
            return;
        }

        try {
            setIsCreating(true);
            await createMachineMaintenance({
                machineId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                type,
                reason,
            });

            toast("Maintenance Logged", {
                description: "New maintenance request has been submitted successfully.",
            });

            // Reset and close
            setMachineId("");
            setReason("");
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Error", {
                description: "Failed to create maintenance log.",
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Filter, Sort, and Group data
    const filteredRequests = requests.filter(req =>
        req.machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.machine.machineNumber && req.machine.machineNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        req.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedRequests = [...filteredRequests].sort((a, b) => {
        let comparison = 0;
        if (sortBy === "machine") {
            comparison = a.machine.name.localeCompare(b.machine.name);
        } else if (sortBy === "startDate") {
            comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        } else if (sortBy === "endDate") {
            comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        } else if (sortBy === "status") {
            comparison = a.status.localeCompare(b.status);
        }
        return sortOrder === "asc" ? comparison : -comparison;
    });

    const groupedBySection = sortedRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).reduce((acc, req) => {
        const sectionName = req.machine.section?.name || "Unassigned";
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
                            placeholder="Search machines..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="pl-9 h-10 w-full bg-background/50 border-black/5 dark:border-white/5 rounded-xl"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background/50 border-black/5 dark:border-white/5">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="machine">Machine</SelectItem>
                                <SelectItem value="startDate">Start Date</SelectItem>
                                <SelectItem value="endDate">End Date</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                            className="h-10 w-10 shrink-0 rounded-xl"
                        >
                            <ArrowUpDown className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/20 transition-all gap-2 w-full md:w-auto"
                >
                    <Plus className="w-4 h-4 shrink-0" />
                    Log Maintenance
                </Button>
            </div>

            <PremiumCard className="p-0 overflow-hidden" contentClassName="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-xs uppercase font-bold text-muted-foreground tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Machine</th>
                                <th className="px-6 py-4">Maintenance Type</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4 hidden md:table-cell w-1/4">Reason / Issue</th>
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
                                            <span className="ml-2 text-xs text-muted-foreground font-medium">({groupedBySection[sectionName].length} machines)</span>
                                        </td>
                                    </tr>
                                    {groupedBySection[sectionName].map((req) => (
                                        <tr key={req.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 dark:text-gray-100 tracking-wide">{req.machine.name}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{req.machine.section.name} {req.machine.machineNumber ? ` | ${req.machine.machineNumber}` : ''}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-700 dark:text-gray-300">{req.type}</div>
                                                <div className="text-[10px] text-muted-foreground">Logged {format(new Date(req.createdAt), "MMM d")}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400">
                                                {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell text-gray-500 dark:text-gray-400 italic text-xs">
                                                {req.reason || "No details provided."}
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
                                        <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No maintenance logs found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </PremiumCard>
            <PaginationBar
                page={page}
                totalPages={Math.ceil(sortedRequests.length / PAGE_SIZE)}
                totalItems={sortedRequests.length}
                pageSize={PAGE_SIZE}
                onPrev={() => setPage(p => Math.max(1, p - 1))}
                onNext={() => setPage(p => p + 1)}
            />

            {/* Create Maintenance Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Log Machine Maintenance</DialogTitle>
                        <DialogDescription>
                            Record a maintenance period. Machines under approved maintenance will not be available for MES scheduling on these dates.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Machine</Label>
                            <Select value={machineId} onValueChange={setMachineId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a machine" />
                                </SelectTrigger>
                                <SelectContent>
                                    {machines.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name} ({m.section.name})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Maintenance Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ROUTINE">Routine Maintenance</SelectItem>
                                    <SelectItem value="BREAKDOWN">Unexpected Breakdown</SelectItem>
                                    <SelectItem value="UPGRADE">Hardware Upgrade</SelectItem>
                                    <SelectItem value="PERMANENT">Permanently Out of Order</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Reason / Issue Details</Label>
                            <Textarea
                                placeholder="Describe the problem or service needed..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>Cancel</Button>
                        <Button onClick={handleCreateRequest} disabled={isCreating} className="bg-orange-600 hover:bg-orange-700 text-white">
                            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Submit Log
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Maintenance</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve this maintenance block? This will lock the machine schedule out of MES for these dates.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleApproveSubmit}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Confirm Approval
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Maintenance</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting this maintenance block.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Rejection Reason</Label>
                            <Textarea
                                placeholder="E.g., Production cannot be halted this week, reschedule."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectSubmit}
                            disabled={!rejectionReason.trim()}
                        >
                            Reject Maintenance
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
