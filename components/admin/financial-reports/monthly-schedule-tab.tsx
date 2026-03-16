"use client";

import { useMemo, useState } from "react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Filter, TrendingUp, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MonthlyScheduleTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoices: any[];
}

export default function MonthlyScheduleTab({ invoices }: MonthlyScheduleTabProps) {
    const [selectedMonth, setSelectedMonth] = useState<string>("All");

    // Extract unique months from invoices that have a month explicitly set, or generate from date
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        invoices.forEach(inv => {
            if (inv.month) {
                months.add(inv.month);
            } else {
                const date = new Date(inv.date);
                months.add(date.toLocaleString('default', { month: 'long', year: 'numeric' }));
            }
        });
        return Array.from(months).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [invoices]);

    // Handle default selection
    if (selectedMonth === "All" && availableMonths.length > 0) {
        setSelectedMonth(availableMonths[0]);
    }

    // Filter invoices by selected month
    const filteredInvoices = useMemo(() => {
        if (selectedMonth === "All") return invoices;

        return invoices.filter(inv => {
            if (inv.month === selectedMonth) return true;
            const dateStr = new Date(inv.date).toLocaleString('default', { month: 'long', year: 'numeric' });
            return dateStr === selectedMonth;
        });
    }, [invoices, selectedMonth]);

    // Calculate Report KPIs
    const totalBilledThisMonth = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaidThisMonth = filteredInvoices.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);
    const collectionRate = totalBilledThisMonth > 0 ? Math.round((totalPaidThisMonth / totalBilledThisMonth) * 100) : 0;

    return (
        <div className="space-y-6">

            {/* Action Bar & Filters */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Filter className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-sm">Filter Schedule By Month:</span>
                </div>

                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-64 bg-background/50">
                        <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableMonths.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PremiumCard className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 hover:from-indigo-500/20 hover:to-indigo-500/10 transition-colors border-indigo-500/20">
                    <div className="flex flex-col gap-1 p-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Billed</span>
                            <TrendingUp className="h-4 w-4 text-indigo-500" />
                        </div>
                        <span className="text-3xl font-black font-mono mt-2 text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(totalBilledThisMonth)}
                        </span>
                        <span className="text-xs font-semibold text-indigo-600/60 dark:text-indigo-400/60 mt-1">
                            For {selectedMonth}
                        </span>
                    </div>
                </PremiumCard>

                <PremiumCard className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/20 hover:to-emerald-500/10 transition-colors border-emerald-500/20">
                    <div className="flex flex-col gap-1 p-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Collected</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className="text-3xl font-black font-mono mt-2 text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalPaidThisMonth)}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600/60 dark:text-emerald-400/60 mt-1">
                            From invoices billed this month
                        </span>
                    </div>
                </PremiumCard>

                <PremiumCard className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 hover:from-orange-500/20 hover:to-orange-500/10 transition-colors border-orange-500/20">
                    <div className="flex flex-col gap-1 p-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Collection Rate</span>
                            <div className="rounded-full h-4 px-2 flex items-center justify-center bg-orange-500/20 text-[10px] font-bold text-orange-600">KPI</div>
                        </div>
                        <span className="text-3xl font-black font-mono mt-2 text-orange-600 dark:text-orange-400">
                            {collectionRate}%
                        </span>
                        <div className="w-full bg-orange-500/20 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${collectionRate}%` }}></div>
                        </div>
                    </div>
                </PremiumCard>
            </div>

            {/* Schedule Data Table */}
            <PremiumCard
                title={`${selectedMonth} - Authorized Invoice Schedule`}
                description="List of all invoices authorized or scheduled to be generated boundaries for the selected month."
                icon={CalendarDays}
            >
                <div className="rounded-xl border border-white/10 dark:border-white/5 overflow-hidden mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="font-semibold px-4 py-3">Invoice No / Project</TableHead>
                                <TableHead className="font-semibold py-3">Type</TableHead>
                                <TableHead className="font-semibold py-3">Scheduled / Due Date</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Amount Billed</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                        No invoices scheduled for {selectedMonth}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <TableRow key={inv.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-bold text-foreground">{inv.invoiceNo}</span>
                                                <span className="text-xs font-semibold text-muted-foreground">{inv.project.name}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <Badge variant="outline" className="text-[10px] px-2 bg-background/50">
                                                {inv.type}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm">{formatDate(inv.date)}</span>
                                                {inv.dueDate && (
                                                    <span className="text-xs text-muted-foreground mt-0.5">
                                                        <strong className="opacity-70">Due:</strong> {formatDate(inv.dueDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right py-3 font-mono font-bold text-foreground">
                                            {formatCurrency(inv.amount)}
                                        </TableCell>

                                        <TableCell className="text-right py-3">
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] border shadow-none ${inv.status === 'PAID'
                                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                                    : inv.status === 'PARTIALLY_PAID'
                                                        ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                                        : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                                    }`}
                                            >
                                                {inv.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </PremiumCard>
        </div>
    );
}
