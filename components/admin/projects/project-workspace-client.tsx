"use client";

import React from "react";
import { format } from "date-fns";
import {
    FolderKanban,
    Building2,
    CalendarClock,
    UserCircle2,
    FileText,
    Boxes,
    FileCheck2,
    LucideIcon,
    Download,
    CheckCircle2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Define interfaces for data structures
interface ProductionOrderItem {
    id: string;
    // Add other properties if needed
}

interface ProductionOrder {
    id: string;
    productionOrderNumber: string;
    date: string | Date;
    items: ProductionOrderItem[];
    pdfDrawingUrl?: string | null;
}

interface MaterialRequisitionItem {
    id: string;
    // Add other properties if needed
}

interface MaterialRequisition {
    id: string;
    mrNumber: string;
    items: MaterialRequisitionItem[];
    requester?: { name: string | null } | null;
    status: string;
}

interface JobCard {
    id: string;
    // Add other properties if needed
}

interface WeeklyTask {
    id: string;
    description: string;
    section?: { name: string } | null;
    status: string;
    jobCards: JobCard[];
}

interface WeeklyPlan {
    id: string;
    weekNumber: number;
    title?: string | null;
    tasks: WeeklyTask[];
}

interface Statistics {
    completionPercentage: number;
    completedJobCards: number;
    totalJobCards: number;
    totalHoursSpent: number;
}

interface ProjectData {
    name: string;
    projectNumber?: string | null;
    client?: string | null;
    location?: string | null;
    blankBoqUrl?: string | null;
    idDrawingUrl?: string | null;
    productionOrders: ProductionOrder[];
    materialRequisitions: MaterialRequisition[];
    purchaseOrders: any[]; // Assuming purchaseOrders structure is not detailed in this snippet
    weeklyPlans: WeeklyPlan[];
    statistics: Statistics;
    id: string; // Added for the `window.open` call
}


const KpiCard = ({ title, value, subtitle, icon: Icon, color }: { title: string, value: string | number, subtitle: string, icon: LucideIcon, color: string }) => (
    <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all rounded-3xl p-6 relative overflow-hidden group">
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none ${color}`} />
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
        <div className="space-y-1 relative z-10">
            <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">{value}</h3>
            <p className="font-bold text-gray-700 dark:text-gray-300">{title}</p>
            <p className="text-sm font-medium text-gray-500">{subtitle}</p>
        </div>
    </div>
);

// We will split the file into smaller logic chunks later if needed
export function ProjectWorkspaceClient({ data }: { data: ProjectData }) {

    // Extracted stats
    const {
        productionOrders,
        materialRequisitions,
        purchaseOrders,
        weeklyPlans,
        statistics
    } = data;

    return (
        <div className="w-full space-y-8 pb-20">
            {/* Header Area */}
            <div className="relative bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[2rem] p-8 md:p-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                            <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 tracking-wide uppercase">Workspace Active</span>
                        </div>

                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                {data.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                                {data.projectNumber && (
                                    <span className="text-lg font-mono font-medium text-gray-500">#{data.projectNumber}</span>
                                )}
                                {data.client && (
                                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-medium">
                                        <UserCircle2 className="w-4 h-4 opacity-70" /> {data.client}
                                    </div>
                                )}
                                {data.location && (
                                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-medium">
                                        <Building2 className="w-4 h-4 opacity-70" /> {data.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Total POs"
                    value={productionOrders.length}
                    subtitle="Production Orders Issued"
                    icon={FileText}
                    color="bg-indigo-500 text-indigo-600"
                />
                <KpiCard
                    title="Material Requisitions"
                    value={materialRequisitions.length}
                    subtitle="Active Supply Requests"
                    icon={Boxes}
                    color="bg-amber-500 text-amber-600"
                />
                <KpiCard
                    title="External LPOs"
                    value={purchaseOrders.length}
                    subtitle="Linked Purchase Orders"
                    icon={FileCheck2}
                    color="bg-emerald-500 text-emerald-600"
                />
                <KpiCard
                    title="Phase Completion"
                    value={`${statistics.completionPercentage}%`}
                    subtitle={`${statistics.completedJobCards} of ${statistics.totalJobCards} Jobs Done`}
                    icon={CheckCircle2}
                    color="bg-sky-500 text-sky-600"
                />
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <div className="bg-white/40 dark:bg-white/5 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 inline-flex mb-8 backdrop-blur-xl w-full md:w-auto overflow-x-auto">
                    <TabsList className="bg-transparent h-auto p-0 flex gap-1 w-max">
                        <TabsTrigger
                            value="overview"
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5"
                        >
                            Overview & Docs
                        </TabsTrigger>
                        <TabsTrigger
                            value="production"
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5"
                        >
                            Production Orders
                        </TabsTrigger>
                        <TabsTrigger
                            value="procurement"
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5"
                        >
                            Procurement Hub
                        </TabsTrigger>
                        <TabsTrigger
                            value="schedule"
                            className="rounded-xl px-5 py-3 text-sm font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5"
                        >
                            Schedule & Tasks
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Project Documents Component Placeholder */}
                        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2rem] p-8">
                            <h3 className="text-xl font-bold mb-6">Core Documents</h3>
                            <div className="space-y-4">
                                {data.blankBoqUrl && (
                                    <a href={data.blankBoqUrl} target="_blank" className="flex items-center justify-between p-4 rounded-xl border border-black/5 hover:border-indigo-500/30 hover:bg-indigo-50/50 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg"><FileText className="w-5 h-5" /></div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-gray-100">Blank BOQ</p>
                                                <p className="text-xs text-gray-500">Main Project Bill of Quantities</p>
                                            </div>
                                        </div>
                                        <Download className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                                    </a>
                                )}
                                {data.idDrawingUrl && (
                                    <a href={data.idDrawingUrl} target="_blank" className="flex items-center justify-between p-4 rounded-xl border border-black/5 hover:border-indigo-500/30 hover:bg-indigo-50/50 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-sky-100 text-sky-600 rounded-lg"><FileCheck2 className="w-5 h-5" /></div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-gray-100">ID Drawing & 3D</p>
                                                <p className="text-xs text-gray-500">Design Specifications</p>
                                            </div>
                                        </div>
                                        <Download className="w-5 h-5 text-gray-400 group-hover:text-sky-600" />
                                    </a>
                                )}
                                {!data.blankBoqUrl && !data.idDrawingUrl && (
                                    <div className="text-center p-8 border border-dashed rounded-2xl bg-gray-50 dark:bg-zinc-800/50">
                                        <p className="text-gray-500">No core documents uploaded.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="production">
                    <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2rem] p-8 overflow-hidden">
                        <h3 className="text-xl font-bold mb-6">Linked Production Orders</h3>
                        {productionOrders.length === 0 ? (
                            <div className="text-center p-12 border border-dashed rounded-2xl bg-gray-50 dark:bg-zinc-800/50">
                                <p className="text-gray-500">No Production Orders linked to this project yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {productionOrders.map((po: ProductionOrder) => (
                                    <div key={po.id} className="p-5 border border-black/5 dark:border-white/5 rounded-2xl hover:shadow-md transition-shadow bg-gray-50/50 dark:bg-zinc-800/30">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{po.productionOrderNumber}</span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs font-semibold text-gray-500">{format(new Date(po.date), 'MMM d, yyyy')}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{po.items.length} Line Items</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {po.pdfDrawingUrl && (
                                                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => {
                                                        if (po.pdfDrawingUrl) window.open(po.pdfDrawingUrl, '_blank');
                                                    }}>
                                                        <FileText className="w-3.5 h-3.5" /> PDF
                                                    </Button>
                                                )}
                                                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => window.open(`/admin/production-orders/${po.id}`, '_blank')}>
                                                    View Full
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="procurement">
                    <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2rem] p-8 overflow-hidden">
                        <h3 className="text-xl font-bold mb-6">Material Requisitions</h3>
                        {materialRequisitions.length === 0 ? (
                            <div className="text-center p-12 border border-dashed rounded-2xl bg-gray-50 dark:bg-zinc-800/50">
                                <p className="text-gray-500">No Material Requisitions filed.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {materialRequisitions.map((mr: MaterialRequisition) => (
                                    <div key={mr.id} className="p-5 border border-black/5 dark:border-white/5 rounded-2xl flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/30">
                                        <div>
                                            <div className="font-mono font-bold text-amber-600 dark:text-amber-400 mr-2">{mr.mrNumber}</div>
                                            <div className="text-sm text-gray-500">{mr.items.length} Items Requested by {mr.requester?.name || 'Unknown'}</div>
                                        </div>
                                        <Badge variant="outline">{mr.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="schedule">
                    <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2rem] p-8 overflow-hidden">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Phase Schedule</h3>
                            <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-4 py-2 rounded-xl font-bold text-sm">
                                Total Tracked: {statistics.totalHoursSpent} Hrs
                            </div>
                        </div>
                        {weeklyPlans.length === 0 ? (
                            <div className="text-center p-12 border border-dashed rounded-2xl bg-gray-50 dark:bg-zinc-800/50">
                                <p className="text-gray-500">No schedule or timeline mapped out yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {weeklyPlans.map((plan: WeeklyPlan) => (
                                    <div key={plan.id} className="space-y-4">
                                        <h4 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 border-b pb-2">
                                            <CalendarClock className="w-5 h-5" /> Phase {plan.weekNumber}: {plan.title || 'General Execution'}
                                        </h4>
                                        <div className="pl-6 border-l-2 border-black/5 dark:border-white/5 space-y-3">
                                            {plan.tasks.map((task: WeeklyTask) => (
                                                <div key={task.id} className="p-4 border border-black/5 dark:border-white/5 rounded-xl bg-white dark:bg-zinc-800/50 flex justify-between items-center overflow-hidden">
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-gray-100">{task.description}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{task.section?.name || 'General'}</p>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end">
                                                        <Badge variant="secondary" className="mb-1">{task.status}</Badge>
                                                        <span className="text-xs text-gray-400">{task.jobCards.length} Jobs</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
