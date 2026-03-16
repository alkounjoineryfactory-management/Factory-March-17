"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { HandCoins } from "lucide-react";
import { receiveInvoicePayment } from "@/app/actions/financials";
import { toast } from "sonner";

interface ReceivePaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoice: any | null;
}

export function ReceivePaymentDialog({ open, onOpenChange, invoice }: ReceivePaymentDialogProps) {
    const [amount, setAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!invoice) return null;

    const remainingBalance = invoice.amount - (invoice.paidAmount || 0);

    const handleSubmit = async () => {
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            toast.error("Please enter a valid amount greater than zero.");
            return;
        }

        if (value > remainingBalance) {
            toast.error(`Cannot receive more than the remaining balance (${formatCurrency(remainingBalance)}).`);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await receiveInvoicePayment(invoice.id, value);
            if (res.success) {
                toast.success(`Payment of ${formatCurrency(value)} received successfully.`);
                setAmount("");
                onOpenChange(false);
            } else {
                toast.error(res.error || "Failed to process payment");
            }
        } catch {
            toast.error("Unexpected error processing payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                            <HandCoins className="h-5 w-5" />
                        </div>
                        Receive Payment
                    </DialogTitle>
                    <DialogDescription>
                        Log a payment received from the client for invoice <strong className="text-foreground">{invoice.invoiceNo}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="bg-background/40 rounded-lg p-4 grid grid-cols-2 gap-4 border border-white/5">
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Total Billed</span>
                            <span className="font-mono font-semibold">{formatCurrency(invoice.amount)}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Already Paid</span>
                            <span className="font-mono font-semibold text-emerald-500">{formatCurrency(invoice.paidAmount || 0)}</span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-white/5">
                            <span className="text-xs text-muted-foreground block mb-1">Remaining Balance</span>
                            <span className="font-mono font-bold text-lg text-rose-400">{formatCurrency(remainingBalance)}</span>
                        </div>
                    </div>

                    <div className="space-y-2 mt-2">
                        <Label htmlFor="amount">Amount Received</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">QAR</span>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-12 font-mono"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px]"
                                onClick={() => setAmount((remainingBalance / 2).toString())}
                            >
                                50%
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px]"
                                onClick={() => setAmount(remainingBalance.toString())}
                            >
                                Full Unpaid Balance
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !amount}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
                    >
                        {isSubmitting ? "Processing..." : "Confirm Receipt"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
