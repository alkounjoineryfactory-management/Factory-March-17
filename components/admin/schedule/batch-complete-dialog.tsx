"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bulkCompleteMesJobCards } from "@/app/actions/mes";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Factory } from "lucide-react";

export default function BatchCompleteDialog({ open, onOpenChange, jobs, sectionName, onSuccess }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobs: any[];
    sectionName: string;
    onSuccess?: () => void;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<Record<string, { startTime: string; endTime: string; actualQty: number; remarks: string }>>({});

    // Initialize state when jobs change
    useEffect(() => {
        if (open && jobs.length > 0) {
            const initialData: Record<string, any> = {};

            jobs.forEach(job => {
                initialData[job.id] = {
                    startTime: job.startTime ? new Date(new Date(job.startTime).getTime() - new Date(job.startTime).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
                    endTime: job.endTime ? new Date(new Date(job.endTime).getTime() - new Date(job.endTime).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
                    actualQty: job.actualQty || job.targetQty || 0,
                    remarks: job.remarks || ''
                };
            });
            setFormData(initialData);
        }
    }, [jobs, open]);

    const handleFieldChange = (jobId: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [jobId]: {
                ...prev[jobId],
                [field]: value
            }
        }));
    };

    const handleApplyAllEndTimes = () => {
        const nowLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setFormData(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => {
                next[id].endTime = nowLocal;
            });
            return next;
        });
    };

    const handleApplyFirstRowTimes = () => {
        if (jobs.length === 0) return;
        const firstJobId = jobs[0].id;
        const { startTime, endTime } = formData[firstJobId] || {};
        
        if (!startTime && !endTime) return; // Nothing to apply

        setFormData(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => {
                if (startTime) next[id].startTime = startTime;
                if (endTime) next[id].endTime = endTime;
            });
            return next;
        });
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const updates = Object.keys(formData).map(id => ({
                id,
                status: 'COMPLETED',
                startTime: formData[id].startTime ? new Date(formData[id].startTime).toISOString() : null,
                endTime: formData[id].endTime ? new Date(formData[id].endTime).toISOString() : null,
                actualQty: formData[id].actualQty,
                remarks: formData[id].remarks
            }));

            await bulkCompleteMesJobCards(updates);
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            alert("Failed to complete job cards.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Batch Complete Jobs: {sectionName}
                    </DialogTitle>
                    <DialogDescription>
                        Review and set the final completion details for the {jobs.length} pending job(s) in this section.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 py-4 custom-scrollbar">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[180px]">Assignee</TableHead>
                                    <TableHead className="min-w-[200px]">Task Description</TableHead>
                                    <TableHead className="w-[180px]">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Time</span>
                                            <Button variant="outline" size="sm" onClick={handleApplyFirstRowTimes} className="h-6 text-[10px] px-2 font-bold uppercase tracking-widest text-indigo-700 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-100 border-indigo-200 shadow-sm flex items-center justify-start w-full transition-all">Apply Top Row To All</Button>
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[180px]">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">End Time</span>
                                            <Button variant="outline" size="sm" onClick={handleApplyAllEndTimes} className="h-6 text-[10px] px-2 font-bold uppercase tracking-widest text-emerald-700 hover:text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-200 shadow-sm flex items-center justify-start w-full transition-all">Set All To Now</Button>
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[120px]">Qty</TableHead>
                                    <TableHead className="w-[200px]">Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.map(job => (
                                    <TableRow key={job.id} className="divide-x divide-border/20">
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                {job.assignedTo && (
                                                    <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200 uppercase px-1.5 py-0 flex items-center gap-1">
                                                        Incharge: {job.assignedTo}
                                                    </Badge>
                                                )}
                                                {(job.employee?.name || job.machine?.name) && (
                                                    <div className="text-[11px] font-bold text-white bg-indigo-500 pl-1.5 pr-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit shadow-sm">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
                                                        {job.employee?.name || job.machine?.name}
                                                    </div>
                                                )}
                                                {!job.assignedTo && !job.employee?.name && !job.machine?.name && (
                                                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs font-semibold">{job.description}</div>
                                            {job.itemCode && <div className="text-[10px] text-muted-foreground">{job.itemCode} • Target: {job.targetQty} {job.unit}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="datetime-local"
                                                className="h-8 text-xs"
                                                value={formData[job.id]?.startTime || ''}
                                                onChange={(e) => handleFieldChange(job.id, 'startTime', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="datetime-local"
                                                className="h-8 text-xs"
                                                value={formData[job.id]?.endTime || ''}
                                                onChange={(e) => handleFieldChange(job.id, 'endTime', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs w-full"
                                                    value={formData[job.id]?.actualQty ?? ''}
                                                    onChange={(e) => handleFieldChange(job.id, 'actualQty', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                placeholder="Remarks..."
                                                className="h-8 text-xs bg-muted/30"
                                                value={formData[job.id]?.remarks || ''}
                                                onChange={(e) => handleFieldChange(job.id, 'remarks', e.target.value)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {jobs.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No pending jobs.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter className="shrink-0 pt-2 border-t mt-auto">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || jobs.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        {isLoading ? (
                            <>Processing...</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4" /> Complete All Jobs</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
