"use client";

import { useState } from "react";
import { format } from "date-fns";
import { LeaveRequest } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createLeaveRequest } from "@/app/actions/hr";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar as CalendarIcon, FileClock, Info } from "lucide-react";

interface KioskLeaveClientProps {
    employeeId: string;
    leaveRequests: LeaveRequest[];
}

export default function KioskLeaveClient({ employeeId, leaveRequests }: KioskLeaveClientProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [type, setType] = useState("CASUAL");
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [reason, setReason] = useState("");

    const handleCreateRequest = async () => {
        if (!startDate || !endDate) {
            toast.error("Missing Fields", { description: "Please select start and end dates." });
            return;
        }

        try {
            setIsCreating(true);
            await createLeaveRequest({
                employeeId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                type,
                reason,
            });

            toast("Request Submitted", {
                description: "Your leave request has been sent to HR for approval.",
                position: "top-center"
            });

            setReason("");
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Error", {
                description: "Failed to submit leave request.",
                position: "top-center"
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Action */}
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 text-slate-200">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                        <FileClock className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">My Leave Requests</h2>
                        <p className="text-sm text-slate-400">View history and apply for time off</p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    size="lg"
                    className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all gap-2 text-md"
                >
                    <Plus className="w-5 h-5" />
                    Apply for Leave
                </Button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveRequests.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 border-dashed rounded-xl">
                        <CalendarIcon className="w-12 h-12 text-slate-600 mb-4" />
                        <h3 className="text-lg font-medium text-slate-300">No requests found</h3>
                        <p className="text-slate-500 text-sm mt-1">You haven't submitted any leave requests yet.</p>
                    </div>
                ) : (
                    leaveRequests.map((req) => (
                        <div key={req.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden">
                            {/* Decorative Top Border */}
                            <div className={`absolute top-0 left-0 right-0 h-1 
                                ${req.status === 'APPROVED' ? 'bg-emerald-500' : ''}
                                ${req.status === 'REJECTED' ? 'bg-rose-500' : ''}
                                ${req.status === 'PENDING' ? 'bg-amber-500' : ''}
                            `} />

                            <div className="flex justify-between items-start pt-1">
                                <div>
                                    <h3 className="font-bold text-slate-200 text-lg tracking-wide">{req.type} LEAVE</h3>
                                    <p className="text-sm text-slate-500">Applied {format(new Date(req.createdAt), "MMM d, yyyy")}</p>
                                </div>
                                <Badge variant="outline" className={`
                                    ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                                    ${req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
                                    ${req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                                `}>
                                    {req.status}
                                </Badge>
                            </div>

                            {(req.status === 'APPROVED' || (req.status === 'REJECTED' && req.rejectionReason)) && (
                                <div className="flex gap-2 items-center -mt-2">
                                    {req.status === 'APPROVED' && (
                                        <Badge variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px] font-mono border border-slate-700">
                                            {req.isPaid ? 'PAID' : 'UNPAID'}
                                        </Badge>
                                    )}
                                    {req.status === 'REJECTED' && req.rejectionReason && (
                                        <div className="flex items-start text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 w-full">
                                            <Info className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                                            <span><strong>Reason:</strong> {req.rejectionReason}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                <div className="text-sm text-slate-400 mb-1 font-medium">Duration</div>
                                <div className="text-slate-200 font-mono">
                                    {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                </div>
                            </div>

                            {req.reason && (
                                <div>
                                    <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Reason</div>
                                    <p className="text-sm text-slate-300 italic">"{req.reason}"</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Application Modal tailored for dark kiosk UI */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] border-slate-700 bg-slate-900 text-slate-200 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-white">Leave Application</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Submit a new request for time off. It will be reviewed by HR.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wide font-bold text-slate-400">Leave Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="h-14 rounded-xl bg-slate-950 border-slate-800 text-white focus:ring-indigo-500 transition-all text-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-700 bg-slate-800 text-white shadow-xl">
                                    <SelectItem value="CASUAL" className="rounded-lg py-3">Casual Leave</SelectItem>
                                    <SelectItem value="SICK" className="rounded-lg py-3">Sick Leave</SelectItem>
                                    <SelectItem value="ANNUAL" className="rounded-lg py-3">Annual PTO</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wide font-bold text-slate-400">Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    // Make date inputs larger for touch
                                    className="h-14 rounded-xl bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 text-lg [color-scheme:dark]"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wide font-bold text-slate-400">End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-14 rounded-xl bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 text-lg [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wide font-bold text-slate-400">Reason (Optional)</Label>
                            <Textarea
                                placeholder="Why are you requesting leave?"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="min-h-[100px] rounded-xl bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 resize-none text-base"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="h-12 px-6 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateRequest}
                            disabled={isCreating}
                            className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 text-lg"
                        >
                            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
