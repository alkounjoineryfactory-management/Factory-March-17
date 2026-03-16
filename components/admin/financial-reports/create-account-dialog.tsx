"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderTree } from "lucide-react";
import { createAccount } from "@/app/actions/financials";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface CreateAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
    { name: "Assets", type: "Debit", desc: "Things the factory owns (Bank, inventory, machinery)" },
    { name: "Liabilities", type: "Credit", desc: "Money the factory owes (Loans, unpaid bills)" },
    { name: "Equity", type: "Credit", desc: "Owner investments & retained profits" },
    { name: "Revenue", type: "Credit", desc: "Income from selling goods or services" },
    { name: "COGS", type: "Debit", desc: "Direct costs to manufacture goods (Materials, labor)" },
    { name: "Expenses", type: "Debit", desc: "General operating costs (Rent, utilities, marketing)" }
];

export function CreateAccountDialog({ open, onOpenChange }: CreateAccountDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    const currentCategoryDetails = CATEGORIES.find(c => c.name === selectedCategory);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData(e.currentTarget);
            const name = formData.get("name") as string;
            const category = selectedCategory;
            const balance = parseFloat(formData.get("balance") as string) || 0;
            const description = formData.get("description") as string;

            if (!category) throw new Error("Please select a category");
            if (!currentCategoryDetails) throw new Error("Invalid category selected");

            const res = await createAccount({
                name,
                category,
                type: currentCategoryDetails.type,
                balance,
                description
            });

            if (res.success) {
                toast.success("Account created successfully!");
                onOpenChange(false);
            } else {
                toast.error(res.error || "Failed to create account");
            }
        } catch (error: unknown) {
            const err = error as Error;
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <FolderTree className="w-5 h-5 text-indigo-500" />
                        Add New Account
                    </DialogTitle>
                    <DialogDescription>
                        Adding an account is easy. Just give it a name and tell us what category it belongs to! We will automatically assign the correct accounting numbers and Debit/Credit rules for you.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Account Name <span className="text-destructive">*</span></Label>
                        <Input id="name" name="name" placeholder="e.g. Petty Cash, Office Supplies" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Category (What kind of account is this?) <span className="text-destructive">*</span></Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select Account Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat.name} value={cat.name} className="py-3">
                                        <div className="flex flex-col text-left">
                                            <span className="font-semibold">{cat.name}</span>
                                            <span className="text-xs text-muted-foreground opacity-80">{cat.desc}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {currentCategoryDetails && (
                        <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between border">
                            <span className="text-sm font-medium text-muted-foreground">Normal Balance Type:</span>
                            <Badge variant="outline" className={currentCategoryDetails.type === 'Debit' ? 'text-emerald-500 border-emerald-500/30' : 'text-blue-500 border-blue-500/30'}>
                                {currentCategoryDetails.type}
                            </Badge>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="balance">Starting Balance (Optional)</Label>
                        <Input id="balance" name="balance" type="number" step="0.01" placeholder="0.00" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input id="description" name="description" placeholder="Brief explanation of this account" />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Create Account"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
