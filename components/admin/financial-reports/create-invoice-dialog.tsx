"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt } from "lucide-react";
import { createInvoice } from "@/app/actions/financials";
import { toast } from "sonner";

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projects: any[];
}

export function CreateInvoiceDialog({ open, onOpenChange, projects }: CreateInvoiceDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        invoiceNo: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        projectId: "",
        type: "PROGRESS",
        month: "", // e.g. "February 2026"
        dueDate: "",
        amount: "",
        notes: ""
    });

    const handleCreateSubmit = async () => {
        if (!formData.projectId || !formData.amount) {
            toast.error("Project and Amount are required.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await createInvoice({
                ...formData,
                amount: parseFloat(formData.amount),
                dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined
            });

            if (res.success) {
                toast.success("Invoice Details Logged Successfully");
                onOpenChange(false);
                setFormData({
                    ...formData,
                    invoiceNo: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
                    amount: "",
                    notes: ""
                });
            } else {
                toast.error(res.error || "Failed to create invoice");
            }
        } catch {
            toast.error("Unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] overflow-hidden bg-card/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                            <Receipt className="h-5 w-5" />
                        </div>
                        Log New Invoice
                    </DialogTitle>
                    <DialogDescription>
                        Record an invoice issued to a client. This will automatically update the project&apos;s billed financials.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="invoiceNo">Invoice Number</Label>
                            <Input
                                id="invoiceNo"
                                value={formData.invoiceNo}
                                onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })}
                                className="font-mono bg-background/50"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount Billed</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="font-mono bg-background/50"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Project</Label>
                        <Select value={formData.projectId} onValueChange={(val) => setFormData({ ...formData, projectId: val })}>
                            <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select associated project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Billing Type</Label>
                            <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                <SelectTrigger className="bg-background/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADVANCE">Advance / Down Payment</SelectItem>
                                    <SelectItem value="PROGRESS">Progress Billing</SelectItem>
                                    <SelectItem value="FINAL">Final Settlement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="month">Billing Month (Optional)</Label>
                            <Input
                                id="month"
                                placeholder="e.g. March 2026"
                                value={formData.month}
                                onChange={e => setFormData({ ...formData, month: e.target.value })}
                                className="bg-background/50"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="dueDate">Due Date (Optional)</Label>
                        <Input
                            id="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            className="bg-background/50 w-full"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Any additional payment terms or notes..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="h-20 resize-none bg-background/50"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateSubmit}
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                    >
                        {isSubmitting ? "Saving..." : "Log Invoice"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
