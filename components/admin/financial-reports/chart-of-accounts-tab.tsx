"use client";

import { useState } from "react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderTree, Building2, Banknote, ShieldCheck, Scale, TrendingUp, HandCoins, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateAccountDialog } from "./create-account-dialog";
import { formatCurrency } from "@/lib/utils";

interface ChartOfAccountsTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accounts?: any[];
}

// Fixed UI configuration for the standard categories
const CATEGORY_UI = [
    {
        name: "Assets",
        icon: Building2,
        colorText: "text-emerald-500",
        colorBg: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20"
    },
    {
        name: "Liabilities",
        icon: Scale,
        colorText: "text-rose-500",
        colorBg: "bg-rose-500/10",
        borderColor: "border-rose-500/20"
    },
    {
        name: "Equity",
        icon: ShieldCheck,
        colorText: "text-blue-500",
        colorBg: "bg-blue-500/10",
        borderColor: "border-blue-500/20"
    },
    {
        name: "Revenue",
        icon: TrendingUp,
        colorText: "text-indigo-500",
        colorBg: "bg-indigo-500/10",
        borderColor: "border-indigo-500/20"
    },
    {
        name: "COGS",
        icon: HandCoins,
        colorText: "text-amber-500",
        colorBg: "bg-amber-500/10",
        borderColor: "border-amber-500/20"
    },
    {
        name: "Expenses",
        icon: Banknote,
        colorText: "text-purple-500",
        colorBg: "bg-purple-500/10",
        borderColor: "border-purple-500/20"
    }
];

export default function ChartOfAccountsTab({ accounts = [] }: ChartOfAccountsTabProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Group the dynamic accounts into their respective categories
    const groupedAccounts = CATEGORY_UI.map(cat => ({
        ...cat,
        items: accounts.filter(acc => acc.category === cat.name),
        // All items in a category share the same type (Debit or Credit)
        type: accounts.find(acc => acc.category === cat.name)?.type || (["Assets", "COGS", "Expenses"].includes(cat.name) ? "Debit" : "Credit")
    }));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PremiumCard
                title="Chart of Accounts (COA)"
                description="The factory's structural ledger outlining all accounting classifications used for reporting."
                icon={FolderTree}
                className="border-indigo-500/20 relative overflow-hidden"
                action={
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 h-8"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Account
                    </Button>
                }
            >
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10 mt-4">
                    {groupedAccounts.map((acc, index) => {
                        const Icon = acc.icon;
                        return (
                            <div key={index} className={`rounded-xl border ${acc.borderColor} bg-white/5 backdrop-blur-md overflow-hidden flex flex-col`}>
                                {/* Header */}
                                <div className={`flex items-center justify-between p-4 ${acc.colorBg} border-b ${acc.borderColor}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-background/50 ${acc.colorText} shadow-sm border border-white/5`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold uppercase tracking-wider text-sm ${acc.colorText}`}>{acc.name}</h3>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={`font-mono text-[10px] ${acc.colorText} border-${acc.colorText.split('-')[1]}-500/30`}>
                                        Normal Balance: {acc.type}
                                    </Badge>
                                </div>

                                {/* List */}
                                <div className="p-0 flex-1">
                                    <Table>
                                        <TableHeader className="sr-only">
                                            <TableRow>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {acc.items.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4 text-sm italic">
                                                        No accounts configured.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                acc.items.map((item) => (
                                                    <TableRow key={item.code} className="hover:bg-muted/10 border-b border-white/5 last:border-0 group transition-colors">
                                                        <TableCell className="w-16 py-3 px-4 font-mono text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                                            {item.code}
                                                        </TableCell>
                                                        <TableCell className="py-3 px-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm text-foreground">{item.name}</span>
                                                                {item.description && (
                                                                    <span className="text-xs text-muted-foreground opacity-80">{item.description}</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right py-3 px-4 font-mono text-sm font-semibold text-foreground/80">
                                                            {formatCurrency(item.balance)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PremiumCard>

            <CreateAccountDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </div>
    );
}
