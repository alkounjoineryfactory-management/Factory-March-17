"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";
import { recordTransaction } from "@/app/actions/financials";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreateTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accounts: any[];
}

export function CreateTransactionDialog({ open, onOpenChange, accounts }: CreateTransactionDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transactionType, setTransactionType] = useState<string>("");

    // Derived states for mapping simple user inputs to Debit/Credit accounts
    const [fromAccountId, setFromAccountId] = useState<string>("");
    const [toAccountId, setToAccountId] = useState<string>("");

    // Helper to filter accounts by broad categories based on the standard Setup
    const assetAccounts = accounts.filter(a => a.category === "Assets");
    const revenueAccounts = accounts.filter(a => a.category === "Revenue");
    const expenseAccounts = accounts.filter(a => a.category === "Expenses" || a.category === "COGS");

    // Dynamic field labels based on the selected simple transaction type
    const getFieldLabels = () => {
        switch (transactionType) {
            case "INCOME":
                return { from: "Which income source?", to: "Deposited to (Bank/Cash)?" };
            case "EXPENSE":
                return { from: "Paid from (Bank/Cash)?", to: "Which expense or bill?" };
            case "ASSET_PURCHASE":
                return { from: "Paid from (Bank/Cash)?", to: "Which asset did you buy?" };
            case "TRANSFER":
                return { from: "Moved money out of (Bank/Cash):", to: "Moved money into (Bank/Cash):" };
            default:
                return { from: "From Account", to: "To Account" };
        }
    };

    // Determine which dropdown lists to show based on the transaction type
    const getAccountOptions = (side: "from" | "to") => {
        switch (transactionType) {
            case "INCOME":
                return side === "from" ? revenueAccounts : assetAccounts;
            case "EXPENSE":
                return side === "from" ? assetAccounts : expenseAccounts;
            case "ASSET_PURCHASE":
            case "TRANSFER":
                return assetAccounts; // both sides are assets
            default:
                return accounts;
        }
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData(e.currentTarget);
            const amount = parseFloat(formData.get("amount") as string);
            const description = formData.get("description") as string;
            const dateStr = formData.get("date") as string;

            if (!amount || amount <= 0) throw new Error("Please enter a valid amount");
            if (!fromAccountId || !toAccountId) throw new Error("Please select both accounts");
            if (fromAccountId === toAccountId) throw new Error("Cannot select the same account for both sides");
            if (!transactionType) throw new Error("Please select what happened");

            // Map the simplified from/to inputs into proper Debit/Credit logic
            // The mapping logic abstracts Double-Entry accounting for the user.
            let debitAccountId = "";
            let creditAccountId = "";

            switch (transactionType) {
                case "INCOME":
                    // To: Asset (Debit), From: Revenue (Credit)
                    debitAccountId = toAccountId;
                    creditAccountId = fromAccountId;
                    break;
                case "EXPENSE":
                case "ASSET_PURCHASE":
                    // To: Expense/Asset (Debit), From: Asset/Bank (Credit)
                    debitAccountId = toAccountId;
                    creditAccountId = fromAccountId;
                    break;
                case "TRANSFER":
                    // To: Asset (Debit), From: Asset (Credit)
                    debitAccountId = toAccountId;
                    creditAccountId = fromAccountId;
                    break;
            }

            const res = await recordTransaction({
                type: transactionType,
                description,
                amount,
                date: new Date(dateStr),
                debitAccountId,
                creditAccountId
            });

            if (res.success) {
                toast.success("Transaction recorded successfully!");
                // Reset form state
                setTransactionType("");
                setFromAccountId("");
                setToAccountId("");
                onOpenChange(false);
            } else {
                toast.error(res.error || "Failed to record transaction");
            }
        } catch (error: unknown) {
            const err = error as Error;
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    }

    const labels = getFieldLabels();
    const fromOptions = getAccountOptions("from");
    const toOptions = getAccountOptions("to");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
                        Record a Transaction
                    </DialogTitle>
                    <DialogDescription>
                        Don&apos;t worry about Debits or Credits. Just tell us what happened in plain English, and the system handles the rest.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {/* Step 1: What happened */}
                    <div className="space-y-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                        <Label className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">Step 1: What happened?</Label>
                        <Select value={transactionType} onValueChange={(val) => {
                            setTransactionType(val);
                            setFromAccountId("");
                            setToAccountId("");
                        }} required>
                            <SelectTrigger className="bg-white/50 dark:bg-zinc-900 border-indigo-500/20 h-12 text-sm font-medium">
                                <SelectValue placeholder="Select an event..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INCOME" className="py-3">I received income/sales</SelectItem>
                                <SelectItem value="EXPENSE" className="py-3">I paid a bill/expense</SelectItem>
                                <SelectItem value="ASSET_PURCHASE" className="py-3">I bought equipment/assets</SelectItem>
                                <SelectItem value="TRANSFER" className="py-3">I moved money between bank accounts</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Step 2: The Details (Only shown after type is selected) */}
                    {transactionType && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="description">Short Description <span className="text-destructive">*</span></Label>
                                <Input id="description" name="description" placeholder="e.g. Paid internet bill, Received product sale" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
                                    <Input id="amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                                    <Input id="date" name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
                                </div>
                            </div>

                            <div className="space-y-4 p-4 border border-white/5 bg-black/5 dark:bg-white/5 rounded-xl">
                                <div className="space-y-2">
                                    <Label>{labels.from} <span className="text-destructive">*</span></Label>
                                    <Select value={fromAccountId} onValueChange={setFromAccountId} required>
                                        <SelectTrigger className="bg-white dark:bg-zinc-950">
                                            <SelectValue placeholder="Select Account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fromOptions.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.name} <span className="text-muted-foreground opacity-70">({acc.category})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{labels.to} <span className="text-destructive">*</span></Label>
                                    <Select value={toAccountId} onValueChange={setToAccountId} required>
                                        <SelectTrigger className="bg-white dark:bg-zinc-950">
                                            <SelectValue placeholder="Select Account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {toOptions.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.name} <span className="text-muted-foreground opacity-70">({acc.category})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                                    {isSubmitting ? "Recording..." : "Record Transaction"}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}
