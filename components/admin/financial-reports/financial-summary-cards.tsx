"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Banknote, Wallet2, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FinancialSummaryCardsProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accounts: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cashFlow: any;
}

export default function FinancialSummaryCards({ accounts = [], cashFlow }: FinancialSummaryCardsProps) {
    // 1. Calculate Total Revenue
    const totalRevenue = useMemo(() => {
        return accounts
            .filter(a => a.category === "Revenue")
            // Revenue accounts are normal Credit, so positive balance = good
            .reduce((sum, a) => sum + (a.balance || 0), 0);
    }, [accounts]);

    // 2. Calculate Total Expenses & COGS
    const totalExpenses = useMemo(() => {
        return accounts
            .filter(a => a.category === "Expenses" || a.category === "COGS")
            // Expense/COGS accounts are normal Debit
            .reduce((sum, a) => sum + (a.balance || 0), 0);
    }, [accounts]);

    // 3. Calculate Net Profit
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const isProfitPositive = netProfit >= 0;

    // 4. Receivables vs Payables (Net Expected Cash)
    const expectedInflow = cashFlow?.totalReceivables || 0;
    const expectedOutflow = cashFlow?.totalPayables || 0;
    const netExpectedCash = expectedInflow - expectedOutflow;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            {/* CARD 1: NET PROFIT */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1">
                {/* Glowing Background Effect */}
                <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[80px] pointer-events-none opacity-50 transition-opacity group-hover:opacity-70 ${isProfitPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-white/10 dark:bg-black/20 rounded-xl">
                        {isProfitPositive ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
                    </div>
                    {profitMargin !== 0 && (
                        <Badge variant="outline" className={`font-mono ${isProfitPositive ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>
                            {isProfitPositive ? '+' : ''}{profitMargin.toFixed(1)}% Margin
                        </Badge>
                    )}
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Net Profit (YTD)</h3>
                    <p className={`text-3xl font-bold font-mono tracking-tight ${isProfitPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(netProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        Revenue minus Expenses & COGS
                    </p>
                </div>
            </div>

            {/* CARD 2: TOTAL REVENUE */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl">
                        <Banknote className="w-5 h-5 text-blue-500" />
                    </div>
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</h3>
                    <p className="text-3xl font-bold font-mono tracking-tight text-foreground">
                        {formatCurrency(totalRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" /> Total income generated
                    </p>
                </div>
            </div>

            {/* CARD 3: TOTAL EXPENSES & COGS */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-orange-500/10 rounded-xl">
                        <Wallet2 className="w-5 h-5 text-orange-500" />
                    </div>
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Expenses & COGS</h3>
                    <p className="text-3xl font-bold font-mono tracking-tight text-foreground">
                        {formatCurrency(totalExpenses)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3 text-rose-500" /> Operating & Direct Costs
                    </p>
                </div>
            </div>

            {/* CARD 4: AR VS AP (Net Expected Cash) */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10 xl:mb-2">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl">
                        <Scale className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-bold font-mono ${netExpectedCash >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {netExpectedCash >= 0 ? '+' : ''}{formatCurrency(netExpectedCash)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Net Expected</p>
                    </div>
                </div>

                <div className="relative z-10 space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1 hidden xl:block">Working Capital</h3>

                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                        <span className="text-muted-foreground flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3 text-emerald-500" /> AR (Invoices)</span>
                        <span className="font-mono font-medium text-emerald-500">{formatCurrency(expectedInflow)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-muted-foreground flex items-center gap-1.5"><ArrowDownRight className="w-3 h-3 text-rose-500" /> AP (Bills)</span>
                        <span className="font-mono font-medium text-rose-500">{formatCurrency(expectedOutflow)}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
