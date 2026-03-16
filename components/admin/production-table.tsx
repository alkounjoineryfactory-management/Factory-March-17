"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import FormattedDate from "@/components/ui/formatted-date";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { deleteJobCard, updateJobCard } from "@/app/actions";

interface WorkLog {
    hoursSpent: number;
}

interface JobCard {
    id: string;
    description: string;
    section: { id: string; name: string };
    machine: { name: string } | null;
    status: string;
    targetHours: number;
    targetDate: Date;
    logs: WorkLog[];
    employee: { id: string; name: string } | null;
    targetQty: number;
}

interface Section {
    id: string; // Add id
    name: string;
    employees: { id: string; name: string }[];
}


export default function ProductionTable({ jobCards, sections }: { jobCards: JobCard[], sections: any[] }) {
    const [editingJob, setEditingJob] = useState<JobCard | null>(null);

    const handleEditClick = (job: JobCard) => {
        setEditingJob(job);
    };

    const handleDeleteClick = async (id: string) => {
        if (confirm("Are you sure you want to delete this job card?")) {
            await deleteJobCard(id);
        }
    };

    // Find employees for the selected job's section
    const availableEmployees = editingJob
        ? sections.find((s: any) => s.id === editingJob.section.id || s.name === editingJob.section.name)?.employees || []
        : [];

    return (
        <div className="rounded-md border bg-white shadow">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Section</TableHead>
                        <TableHead>Machine</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Target Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Planned Hrs</TableHead>
                        <TableHead className="text-right">Actual Hrs</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {jobCards.map((job) => {
                        const actualHours = job.logs.reduce((sum, log) => sum + log.hoursSpent, 0);
                        const isOverBudget = actualHours > job.targetHours;

                        return (
                            <TableRow key={job.id}>
                                <TableCell className="font-medium">{job.section.name}</TableCell>
                                <TableCell>{job.machine?.name || "-"}</TableCell>
                                <TableCell className="text-blue-600">{job.employee?.name || "Unassigned"}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={job.description}>
                                    {job.description}
                                </TableCell>
                                <TableCell>
                                    <FormattedDate date={job.targetDate} mode="date-only" />
                                </TableCell>
                                <TableCell>
                                    <Badge variant={job.status === "COMPLETED" ? "default" : "secondary"}>
                                        {job.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">{job.targetHours.toFixed(1)}</TableCell>
                                <TableCell className={`text-right font-semibold ${isOverBudget ? "text-red-500" : "text-green-600"}`}>
                                    {actualHours.toFixed(1)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(job)}>
                                            <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(job.id)}>
                                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {jobCards.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                No job cards found for this project.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Edit Dialog */}
            <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Job Card</DialogTitle>
                    </DialogHeader>
                    {editingJob && (
                        <form action={async (formData) => {
                            await updateJobCard(formData);
                            setEditingJob(null);
                        }} className="space-y-4">
                            <input type="hidden" name="id" value={editingJob.id} />

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={editingJob.description} disabled className="bg-gray-100" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select name="status" defaultValue={editingJob.status}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PENDING">PENDING</SelectItem>
                                            <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                                            <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                                            <SelectItem value="ON_HOLD">ON HOLD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Assigned To</Label>
                                    <Select name="employeeId" defaultValue={editingJob.employee?.id || "unassigned"}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {availableEmployees.map((emp: any) => (
                                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Target Qty</Label>
                                    <Input type="number" name="targetQty" defaultValue={editingJob.targetQty} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Target Date</Label>
                                    <Input type="date" name="targetDate" defaultValue={new Date(editingJob.targetDate).toISOString().split('T')[0]} />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
