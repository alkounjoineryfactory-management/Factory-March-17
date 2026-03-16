"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, Receipt, CalendarDays, Wallet, Users, FolderTree, ArrowRightLeft } from "lucide-react";

// Individual Tab Components (To be built next)
import ProjectFinancialsTab from "./project-financials-tab";
import InvoiceManagementTab from "./invoice-management-tab";
import MonthlyScheduleTab from "./monthly-schedule-tab";
import CashFlowTab from "./cash-flow-tab";
import VendorsTab from "./vendors-tab";
import ChartOfAccountsTab from "./chart-of-accounts-tab";
import LedgerTab from "./ledger-tab";
import FinancialSummaryCards from "./financial-summary-cards";

interface FinancialDashboardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projects: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    financials: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoices: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cashFlow: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendors: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accounts: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings?: any;
}

export default function FinancialDashboardClient({ projects, financials, invoices, cashFlow, vendors, accounts, transactions, settings }: FinancialDashboardProps) {
    const [activeTab, setActiveTab] = useState("project-financials");

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-[1600px] mx-auto">

            {/* 🌟 New: Ultimate Financial Summary Cards at the top 🌟 */}
            <FinancialSummaryCards accounts={accounts} cashFlow={cashFlow} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

                {/* Premium Pill Tabs */}
                <div className="w-full overflow-x-auto no-scrollbar pb-2 mb-6">
                    <TabsList className="bg-card/40 backdrop-blur-xl p-1.5 rounded-2xl flex w-full min-w-max gap-1 lg:gap-2 border border-black/5 dark:border-white/5 shadow-sm">

                        <TabsTrigger
                            value="project-financials"
                            className="flex-1 justify-center rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap group"
                        >
                            <div className="flex items-center gap-2">
                                <FolderKanban className="w-4 h-4 group-data-[state=active]:scale-110 transition-transform" />
                                Projects
                            </div>
                        </TabsTrigger>

                        <TabsTrigger
                            value="invoice-management"
                            className="flex-1 justify-center rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap group"
                        >
                            <div className="flex items-center gap-2">
                                <Receipt className="w-4 h-4 group-data-[state=active]:scale-110 transition-transform" />
                                Invoices
                            </div>
                        </TabsTrigger>

                        <TabsTrigger
                            value="monthly-schedule"
                            className="flex-1 justify-center rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap group"
                        >
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 group-data-[state=active]:scale-110 transition-transform" />
                                Schedule
                            </div>
                        </TabsTrigger>

                        <TabsTrigger
                            value="cash-flow"
                            className="flex-1 justify-center rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap group"
                        >
                            <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 group-data-[state=active]:scale-110 transition-transform" />
                                Cash Flow
                            </div>
                        </TabsTrigger>

                        <TabsTrigger
                            value="vendors"
                            className="flex-1 justify-center rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap group"
                        >
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 group-data-[state=active]:scale-110 transition-transform" />
                                Vendors
                            </div>
                        </TabsTrigger>

                        <TabsTrigger
                            value="chart-of-accounts"
                            className="flex-1 justify-center rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap group"
                        >
                            <div className="flex items-center gap-2">
                                <FolderTree className="w-4 h-4 group-data-[state=active]:scale-110 transition-transform" />
                                Accounts
                            </div>
                        </TabsTrigger>

                        <TabsTrigger
                            value="ledger"
                            className="flex-1 justify-center rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap group"
                        >
                            <div className="flex items-center gap-2">
                                <ArrowRightLeft className="w-4 h-4 group-data-[state=active]:scale-110 transition-transform" />
                                Ledger
                            </div>
                        </TabsTrigger>

                    </TabsList>
                </div>

                <div className="relative mt-6 min-h-[500px]">

                    <TabsContent value="project-financials" className="mt-0 outline-none">
                        <ProjectFinancialsTab financials={financials} />
                    </TabsContent>

                    <TabsContent value="invoice-management" className="mt-0 outline-none">
                        <InvoiceManagementTab invoices={invoices} projects={projects} settings={settings} />
                    </TabsContent>

                    <TabsContent value="monthly-schedule" className="mt-0 outline-none">
                        <MonthlyScheduleTab invoices={invoices} />
                    </TabsContent>

                    <TabsContent value="cash-flow" className="mt-0 outline-none">
                        <CashFlowTab cashFlow={cashFlow} projects={projects} vendors={vendors} settings={settings} />
                    </TabsContent>

                    <TabsContent value="vendors" className="mt-0 outline-none">
                        <VendorsTab vendors={vendors} />
                    </TabsContent>

                    <TabsContent value="chart-of-accounts" className="outline-none mt-0">
                        <ChartOfAccountsTab accounts={accounts} />
                    </TabsContent>

                    <TabsContent value="ledger" className="outline-none mt-0">
                        <LedgerTab transactions={transactions} accounts={accounts} settings={settings} />
                    </TabsContent>

                </div>
            </Tabs>
        </div>
    );
}
