"use client";

import { useState } from "react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, CheckCircle2, Clock, Factory, Briefcase, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FolderOpen } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PaginationBar } from "@/components/ui/pagination-bar";

interface ReportsDashboardClientProps {
    kpiData: any;
    projects: any[];
    productionOrders: any[];
    weeklyTasks: any[];
    dailyJobCards: any[];
    settings: any;
}

export default function ReportsDashboardClient({ kpiData, projects, productionOrders, weeklyTasks, dailyJobCards, settings }: ReportsDashboardClientProps) {
    const [activeTab, setActiveTab] = useState("projects");
    const [dateFilter, setDateFilter] = useState("all");
    const [projectFilter, setProjectFilter] = useState("all");

    // Pagination states — one per tab
    const [projPage, setProjPage] = useState(1);
    const [poPage, setPoPage] = useState(1);
    const [tasksPage, setTasksPage] = useState(1);
    const [jobsPage, setJobsPage] = useState(1);
    const PAGE_SIZE = 10;

    // Reset all pages when filters change
    const handleDateFilter = (v: string) => { setDateFilter(v); setProjPage(1); setPoPage(1); setTasksPage(1); setJobsPage(1); };
    const handleProjectFilter = (v: string) => { setProjectFilter(v); setProjPage(1); setPoPage(1); setTasksPage(1); setJobsPage(1); };

    // Extract unique projects for the filter dropdown
    const allProjects = Array.from(new Set(projects.map(p => p.name))).filter(Boolean);

    // Filter Logic
    const filterByDate = (dateStr: string | Date | null | undefined) => {
        if (dateFilter === "all" || !dateStr) return true;
        const d = new Date(dateStr);
        if (dateFilter === "today") return isToday(d);
        if (dateFilter === "week") return isThisWeek(d);
        if (dateFilter === "month") return isThisMonth(d);
        return true;
    };

    const filterByProject = (projectName: string | null | undefined) => {
        if (projectFilter === "all") return true;
        return projectName === projectFilter;
    };

    // Apply Filters
    const filteredProjects = projects.filter(p => filterByProject(p.name) && filterByDate(p.startingDate));
    const filteredPO = productionOrders.filter(po => filterByProject(po.project?.name) && filterByDate(po.date));
    const filteredTasks = weeklyTasks.filter(t => filterByProject(t.weeklyPlan?.project?.name) && filterByDate(t.startDate));
    const filteredJobCards = dailyJobCards.filter(j => filterByProject(j.project?.name) && filterByDate(j.day));

    // Paginated slices
    const pagedProjects = filteredProjects.slice((projPage - 1) * PAGE_SIZE, projPage * PAGE_SIZE);
    const pagedPO = filteredPO.slice((poPage - 1) * PAGE_SIZE, poPage * PAGE_SIZE);
    const pagedTasks = filteredTasks.slice((tasksPage - 1) * PAGE_SIZE, tasksPage * PAGE_SIZE);
    const pagedJobCards = filteredJobCards.slice((jobsPage - 1) * PAGE_SIZE, jobsPage * PAGE_SIZE);

    // Helper function to export CSV
    const downloadCSV = () => {
        let dataToExport: any[] = [];
        let filename = `${activeTab}_report_${format(new Date(), "yyyy-MM-dd")}.csv`;

        if (activeTab === "projects") {
            dataToExport = filteredProjects.map(p => {
                const totalJobs = p.jobCards?.length || 0;
                const completedJobs = p.jobCards?.filter((j: any) => j.status === "COMPLETED").length || 0;
                const completionPct = totalJobs === 0 ? 0 : Math.round((completedJobs / totalJobs) * 100);

                return {
                    "Project Name": p.name || "",
                    "Client": p.clientName || "",
                    "PO Number": p.projectNumber || "",
                    "Status": p.status || "",
                    "Start Date": p.startingDate ? format(new Date(p.startingDate), "yyyy-MM-dd") : "",
                    "Deadline": p.targetDate ? format(new Date(p.targetDate), "yyyy-MM-dd") : "",
                    "Total Amount": p.amount || 0,
                    "Completion %": `${completionPct}%`
                };
            });
        } else if (activeTab === "production") {
            dataToExport = filteredPO.flatMap(po =>
                (po.items || []).map((item: any) => ({
                    "Date": po.date ? format(new Date(po.date), "yyyy-MM-dd") : "",
                    "PO Number": po.poNumber || "",
                    "Project": po.project?.name || "",
                    "Item Description": item.itemDescription || "",
                    "Qty": item.qty || 0,
                    "Unit": item.unit || "",
                    "Budgeted Labour Hrs": (item.carpentryLabourHrs || 0) + (item.polishLabourHrs || 0),
                    "Material Amount": (item.carpentryMaterialAmount || 0) + (item.polishMaterialAmount || 0)
                }))
            );
        } else if (activeTab === "tasks") {
            dataToExport = filteredTasks.map(t => ({
                "Week #": t.weeklyPlan?.weekNumber || "",
                "Project": t.weeklyPlan?.project?.name || "",
                "Task Description": t.description || "",
                "Assigned Section": t.section?.name || "",
                "Assigned To": t.assignedTo || "",
                "Target Qty": t.targetQty || 0,
                "Start Date": t.startDate ? format(new Date(t.startDate), "yyyy-MM-dd") : "",
                "End Date": t.endDate ? format(new Date(t.endDate), "yyyy-MM-dd") : "",
                "Status": t.status || ""
            }));
        } else if (activeTab === "jobcards") {
            dataToExport = filteredJobCards.map(j => ({
                "Date": j.day ? format(new Date(j.day), "yyyy-MM-dd") : "",
                "Project": j.project?.name || "",
                "Item Code": j.itemCode || "",
                "Employee": j.employee?.name || j.assignedTo || "",
                "Machine": j.machine?.name || "Manual",
                "Budgeted Hrs": j.budgetedLabourHrs || 0,
                "Actual Hrs": j.actualHrs || 0,
                "Variance (Hrs)": ((j.budgetedLabourHrs || 0) - (j.actualHrs || 0)).toFixed(2),
                "Target Qty": j.targetQty || 0,
                "Actual Qty": j.actualQty || 0,
                "Status": j.status || "",
                "Remarks": j.remarks || ""
            }));
        }

        if (dataToExport.length === 0) {
            alert("No data available to export for this tab.");
            return;
        }

        const headers = Object.keys(dataToExport[0]);
        const csvContent = [
            headers.join(","),
            ...dataToExport.map(row => headers.map(header => `"${(row as any)[header] ?? ""}"`).join(","))
        ].join("\\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper function to export Ultra-Premium PDF
    const downloadPDF = () => {
        const doc = new jsPDF("portrait", "mm", "a4");
        const filename = `${activeTab}_report_${format(new Date(), "yyyy-MM-dd")}.pdf`;

        // 1. Add Premium Header & Logo
        const companyName = settings?.factoryName || "Factory Manager";

        if (settings?.logoUrl) {
            // If they uploaded a logo (base64 expected from the settings DB)
            try {
                // Adjust dimensions to fit nicely in the header depending on square/rectangle constraints
                // Assuming max height of 18
                // Make sure to pass the correct image format to jsPDF
                let imgFormat = "PNG";
                if (settings.logoUrl.startsWith("data:image/jpeg") || settings.logoUrl.startsWith("data:image/jpg")) {
                    imgFormat = "JPEG";
                }
                doc.addImage(settings.logoUrl, imgFormat, 14, 14, 18, 18);
            } catch (e) {
                // Fallback if image is somehow corrupted or unsupported format
                doc.setFillColor(settings?.primaryColor || "#4f46e5");
                doc.roundedRect(14, 14, 18, 18, 3, 3, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(companyName.substring(0, 2).toUpperCase(), 17, 26);
            }
        } else {
            // A placeholder logo (blue square with text) if no logo is uploaded
            doc.setFillColor(settings?.primaryColor || "#4f46e5");
            doc.roundedRect(14, 14, 18, 18, 3, 3, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(companyName.substring(0, 2).toUpperCase(), 17, 26);
        }

        // Company Name
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(companyName.toUpperCase(), 38, 26);

        // Report Title
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const reportTitleMap: Record<string, string> = {
            projects: "Active Projects Overview",
            production: "Production Orders Log",
            tasks: "Weekly Tasks & Assignments",
            jobcards: "Daily Job Cards & Costing"
        };
        doc.text(`FACTORY REPORT: ${reportTitleMap[activeTab].toUpperCase()}`, 38, 32);

        // Date and Filter Info
        doc.setFontSize(8);
        const rightAlignX = doc.internal.pageSize.getWidth() - 14;
        doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy - HH:mm")}`, rightAlignX, 18, { align: "right" });
        doc.text(`Date Filter: ${dateFilter.toUpperCase()}`, rightAlignX, 24, { align: "right" });
        doc.text(`Project Filter: ${projectFilter === 'all' ? 'All Projects' : projectFilter}`, rightAlignX, 30, { align: "right" });

        // Divider Line
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(0.5);
        doc.line(14, 38, rightAlignX, 38);

        // 2. Prepare Table Data
        let head: string[][] = [];
        let body: any[][] = [];

        if (activeTab === "projects") {
            head = [["Project Name", "Client", "PO Number", "Status", "Start Date", "Total Value (QAR)", "Progress"]];
            body = filteredProjects.map(p => {
                const totalJobs = p.jobCards?.length || 0;
                const completedJobs = p.jobCards?.filter((j: any) => j.status === "COMPLETED").length || 0;
                const completionPct = totalJobs === 0 ? 0 : Math.round((completedJobs / totalJobs) * 100);
                return [
                    p.name,
                    p.clientName || "-",
                    p.projectNumber || "-",
                    p.status,
                    p.startingDate ? format(new Date(p.startingDate), "yyyy-MM-dd") : "-",
                    (p.amount || 0).toLocaleString(),
                    `${completionPct}%`
                ];
            });
        } else if (activeTab === "production") {
            head = [["Date", "PO Number", "Project", "Item Details", "Qty/Unit", "Labour Hrs", "Material (QAR)"]];
            body = filteredPO.flatMap(po =>
                (po.items || []).map((item: any) => [
                    po.date ? format(new Date(po.date), "yyyy-MM-dd") : "-",
                    po.poNumber,
                    po.project?.name || "-",
                    item.itemDescription || "-",
                    `${item.qty} ${item.unit}`,
                    `${(item.carpentryLabourHrs || 0) + (item.polishLabourHrs || 0)}h`,
                    ((item.carpentryMaterialAmount || 0) + (item.polishMaterialAmount || 0)).toLocaleString()
                ])
            );
        } else if (activeTab === "tasks") {
            head = [["Week", "Project", "Task Description", "Section", "Assignee", "Dates", "Qty", "Status"]];
            body = filteredTasks.map(t => [
                `W${t.weeklyPlan?.weekNumber || "-"}`,
                t.weeklyPlan?.project?.name || "-",
                t.description,
                t.section?.name || "-",
                t.assignedTo || "-",
                `${t.startDate ? format(new Date(t.startDate), "MMM d") : "-"} to ${t.endDate ? format(new Date(t.endDate), "MMM d") : "-"}`,
                t.targetQty,
                t.status
            ]);
        } else if (activeTab === "jobcards") {
            head = [["Date", "Project", "Job", "Assignee", "Act Hrs", "Var", "Qty", "Status"]];
            body = filteredJobCards.map(j => {
                const variance = (j.budgetedLabourHrs || 0) - (j.actualHrs || 0);
                return [
                    j.day ? format(new Date(j.day), "MMM d") : "-",
                    j.project?.name?.substring(0, 15) || "-",
                    (j.itemCode || j.description || "-").substring(0, 15),
                    j.employee?.name || j.assignedTo || "Unassigned",
                    `${j.actualHrs ? j.actualHrs.toFixed(1) : 0}h`,
                    `${variance > 0 ? '+' : ''}${variance.toFixed(1)}h`,
                    `${j.actualQty || 0}/${j.targetQty}`,
                    j.status
                ];
            });
        }

        if (body.length === 0) {
            alert("No data available to export for this tab.");
            return;
        }

        // 3. Render Table
        autoTable(doc, {
            head: head,
            body: body,
            startY: 45,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 7, // Smaller font to fit portrait A4
                cellPadding: 3,
                textColor: [15, 23, 42],
                lineColor: [226, 232, 240],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [248, 250, 252], // Slate 50
                textColor: [71, 85, 105], // Slate 600
                fontStyle: "bold"
            },
            alternateRowStyles: {
                fillColor: [250, 251, 253] // Very light blue/slate
            },
            didDrawPage: (data) => {
                // Footer
                const str = "Page " + doc.internal.pages.length.toString();
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); // Slate 400
                doc.text(
                    str,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: "center" }
                );
            }
        });

        // 4. Save
        doc.save(filename);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background rounded-3xl pb-8">
            {/* Global Actions */}
            <div className="flex justify-between items-center mb-6 bg-card/60 backdrop-blur-xl p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] relative overflow-hidden">
                {/* Decorative ambient background */}
                <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60">
                        Operational Overview
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Real-time insights across your factory floors.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={downloadCSV} variant="outline" className="border-border shadow-sm transition-all hover:bg-muted gap-2 rounded-full px-5">
                        <FileText className="w-4 h-4 text-emerald-600" /> Export CSV
                    </Button>
                    <Button onClick={downloadPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105 gap-2 rounded-full px-6">
                        <Download className="w-4 h-4" /> Download Report (PDF)
                    </Button>
                </div>
            </div>

            {/* KPI Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <PremiumCard className="p-6 flex items-center justify-between rounded-3xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.15)] hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px] group-hover:bg-indigo-500/30 transition-colors duration-500 pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-indigo-500 shadow-indigo-500/20 drop-shadow-sm uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Active Projects</p>
                        <h3 className="text-5xl font-black text-foreground tracking-tighter drop-shadow-md">{kpiData.totalActiveProjects}</h3>
                    </div>
                    <div className="relative z-10 w-16 h-16 bg-background/50 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                        <Briefcase className="w-7 h-7 drop-shadow-md" />
                    </div>
                </PremiumCard>

                <PremiumCard className="p-6 flex items-center justify-between rounded-3xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.15)] hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/20 rounded-full blur-[40px] group-hover:bg-amber-500/30 transition-colors duration-500 pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-amber-500 drop-shadow-sm uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Production Orders</p>
                        <h3 className="text-5xl font-black text-foreground tracking-tighter drop-shadow-md">{kpiData.totalProductionOrders}</h3>
                    </div>
                    <div className="relative z-10 w-16 h-16 bg-background/50 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                        <FileSpreadsheet className="w-7 h-7 drop-shadow-md" />
                    </div>
                </PremiumCard>

                <PremiumCard className="p-6 flex items-center justify-between rounded-3xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_15px_40px_rgba(244,63,94,0.15)] hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-rose-500/20 rounded-full blur-[40px] group-hover:bg-rose-500/30 transition-colors duration-500 pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-rose-500 drop-shadow-sm uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Pending Tasks</p>
                        <h3 className="text-5xl font-black text-foreground tracking-tighter drop-shadow-md">{kpiData.weeklyTasksPending}</h3>
                    </div>
                    <div className="relative z-10 w-16 h-16 bg-background/50 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-inner">
                        <Clock className="w-7 h-7 drop-shadow-md" />
                    </div>
                </PremiumCard>

                <PremiumCard className="p-6 flex items-center justify-between rounded-3xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.15)] hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/20 rounded-full blur-[40px] group-hover:bg-emerald-500/30 transition-colors duration-500 pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-emerald-500 drop-shadow-sm uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Labor Hrs (Today)</p>
                        <h3 className="text-5xl font-black text-foreground tracking-tighter drop-shadow-md">{(kpiData.laborHoursToday).toFixed(1)}</h3>
                    </div>
                    <div className="relative z-10 w-16 h-16 bg-background/50 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                        <TrendingUp className="w-7 h-7 drop-shadow-md" />
                    </div>
                </PremiumCard>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-6 bg-card/50 backdrop-blur-xl p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative z-20">
                <div className="flex-1 max-w-xs">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 ml-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> TIME RANGE
                    </label>
                    <Select value={dateFilter} onValueChange={handleDateFilter}>
                        <SelectTrigger className="bg-background/80 backdrop-blur-md border-white/10 dark:border-border/40 font-semibold h-12 rounded-2xl shadow-inner focus:ring-primary/20">
                            <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-xl bg-card/95">
                            <SelectItem value="all" className="rounded-xl my-1 cursor-pointer hover:bg-primary/5">All Time</SelectItem>
                            <SelectItem value="today" className="rounded-xl my-1 cursor-pointer hover:bg-primary/5">Today</SelectItem>
                            <SelectItem value="week" className="rounded-xl my-1 cursor-pointer hover:bg-primary/5">This Week</SelectItem>
                            <SelectItem value="month" className="rounded-xl my-1 cursor-pointer hover:bg-primary/5">This Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 max-w-sm">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 ml-1">
                        <FolderOpen className="w-3.5 h-3.5 text-primary" /> PROJECT CONTEXT
                    </label>
                    <Select value={projectFilter} onValueChange={handleProjectFilter}>
                        <SelectTrigger className="bg-background/80 backdrop-blur-md border-white/10 dark:border-border/40 font-semibold h-12 rounded-2xl shadow-inner focus:ring-primary/20">
                            <SelectValue placeholder="All Projects" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-xl bg-card/95">
                            <SelectItem value="all" className="rounded-xl my-1 cursor-pointer hover:bg-primary/5">All Projects</SelectItem>
                            {allProjects.map((pName, i) => (
                                <SelectItem key={i} value={pName as string} className="rounded-xl my-1 cursor-pointer hover:bg-primary/5">{pName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="projects" onValueChange={setActiveTab} className="w-full relative z-10">
                <TabsList className="w-full sm:w-auto overflow-x-auto justify-start bg-card/40 backdrop-blur-xl p-2 rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-8 h-auto gap-2">
                    <TabsTrigger value="projects" className="rounded-2xl px-6 py-3 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] hover:bg-black/5 dark:hover:bg-white/5">
                        Projects Tracking
                    </TabsTrigger>
                    <TabsTrigger value="production" className="rounded-2xl px-6 py-3 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] hover:bg-black/5 dark:hover:bg-white/5">
                        Production Orders
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="rounded-2xl px-6 py-3 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] hover:bg-black/5 dark:hover:bg-white/5">
                        Weekly Tasks
                    </TabsTrigger>
                    <TabsTrigger value="jobcards" className="rounded-2xl px-6 py-3 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] hover:bg-black/5 dark:hover:bg-white/5">
                        Daily Job Records
                    </TabsTrigger>
                </TabsList>

                {/* PROJECTS TAB */}
                <TabsContent value="projects" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <PremiumCard className="overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl rounded-3xl bg-card/60 backdrop-blur-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-gradient-to-r from-muted/80 to-muted/30 text-muted-foreground border-b border-border/60">
                                    <tr>
                                        <th className="px-8 py-5 font-bold tracking-wider">Project Name</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Project No</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Client</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Status</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Start Date</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-right">Value (QAR)</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Progress</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {pagedProjects.map(p => {
                                        const totalJobs = p.jobCards?.length || 0;
                                        const completedJobs = p.jobCards?.filter((j: any) => j.status === "COMPLETED").length || 0;
                                        const pct = totalJobs === 0 ? 0 : Math.round((completedJobs / totalJobs) * 100);

                                        return (
                                            <tr key={p.id} className="hover:bg-primary/5 hover:shadow-sm transition-all duration-200 group">
                                                <td className="px-8 py-5 font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</td>
                                                <td className="px-8 py-5 font-mono text-xs text-muted-foreground">{p.projectNumber || 'N/A'}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-muted-foreground font-medium">{p.clientName || 'N/A'}</td>
                                                <td className="px-8 py-5 text-center">
                                                    <Badge variant={p.status === 'COMPLETED' ? 'default' : 'secondary'} className={`px-4 py-1.5 uppercase font-bold tracking-widest text-[10px] ${p.status === 'ACTIVE' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' : ''}`}>
                                                        {p.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-5 text-muted-foreground font-medium">
                                                    {p.startingDate ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                                                            {format(new Date(p.startingDate), "MMM dd, yyyy")}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-foreground tracking-tight">QAR {(p.amount || 0).toLocaleString()}</td>
                                                <td className="px-8 py-5 w-48">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold">
                                                            <span className="text-muted-foreground">Completion</span>
                                                            <span className={pct === 100 ? "text-emerald-500" : "text-primary"}>{pct}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden border border-border/50">
                                                            <div className={`h-full rounded-full transition-all duration-1000 ${pct === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {filteredProjects.length === 0 && (
                                        <tr><td colSpan={7} className="px-8 py-10 text-center text-muted-foreground w-full">No projects found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationBar
                            page={projPage}
                            totalPages={Math.ceil(filteredProjects.length / PAGE_SIZE)}
                            totalItems={filteredProjects.length}
                            pageSize={PAGE_SIZE}
                            onPrev={() => setProjPage(p => Math.max(1, p - 1))}
                            onNext={() => setProjPage(p => p + 1)}
                        />
                    </PremiumCard>
                </TabsContent>

                {/* PRODUCTION ORDERS TAB */}
                <TabsContent value="production" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <PremiumCard className="overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl rounded-3xl bg-card/60 backdrop-blur-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase tracking-[0.2em] bg-muted/30 backdrop-blur-md text-muted-foreground border-b border-black/5 dark:border-white/5">
                                    <tr>
                                        <th className="px-8 py-5 font-bold tracking-wider">Date</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">PO Number</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Project</th>
                                        <th className="px-8 py-5 font-bold tracking-wider w-1/3">Item Details</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Qty / Unit</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-right">Labour Hrs</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-right">Material (QAR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 dark:divide-white/5">
                                    {pagedPO.flatMap(po =>
                                        (po.items || []).map((item: any, idx: number) => (
                                            <tr key={`${po.id}-${idx}`} className="hover:bg-primary/5 hover:shadow-md transition-all duration-300 transform-gpu hover:scale-[1.005] group">
                                                <td className="px-8 py-5 text-muted-foreground font-medium group-hover:text-primary transition-colors">{po.date ? format(new Date(po.date), "MMM dd, yy") : '-'}</td>
                                                <td className="px-8 py-5 font-mono text-xs font-bold text-foreground">{po.poNumber}</td>
                                                <td className="px-8 py-5 font-bold text-indigo-600 dark:text-indigo-400">{po.project?.name}</td>
                                                <td className="px-8 py-5 text-muted-foreground">{item.itemDescription || '-'}</td>
                                                <td className="px-8 py-5 text-center font-black">{item.qty} <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">{item.unit}</span></td>
                                                <td className="px-8 py-5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors border-l border-r border-black/5 dark:border-white/5">{(item.carpentryLabourHrs || 0) + (item.polishLabourHrs || 0)}h</td>
                                                <td className="px-8 py-5 text-right font-black tracking-tight text-foreground bg-primary/5 group-hover:bg-primary/10 transition-colors">QAR {((item.carpentryMaterialAmount || 0) + (item.polishMaterialAmount || 0)).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                    {filteredPO.length === 0 && (
                                        <tr><td colSpan={7} className="px-8 py-10 text-center text-muted-foreground w-full">No production orders found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationBar
                            page={poPage}
                            totalPages={Math.ceil(filteredPO.length / PAGE_SIZE)}
                            totalItems={filteredPO.length}
                            pageSize={PAGE_SIZE}
                            onPrev={() => setPoPage(p => Math.max(1, p - 1))}
                            onNext={() => setPoPage(p => p + 1)}
                        />
                    </PremiumCard>
                </TabsContent>

                {/* WEEKLY TASKS TAB */}
                <TabsContent value="tasks" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <PremiumCard className="overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl rounded-3xl bg-card/60 backdrop-blur-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase tracking-[0.2em] bg-muted/30 backdrop-blur-md text-muted-foreground border-b border-black/5 dark:border-white/5">
                                    <tr>
                                        <th className="px-8 py-5 font-bold tracking-wider">Week</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Project</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Section & Assignment</th>
                                        <th className="px-8 py-5 font-bold tracking-wider w-1/3">Task Description</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Dates</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Target Qty</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 dark:divide-white/5">
                                    {pagedTasks.map(t => (
                                        <tr key={t.id} className="hover:bg-primary/5 hover:shadow-md transition-all duration-300 transform-gpu hover:scale-[1.005] group">
                                            <td className="px-8 py-5 font-bold text-foreground">
                                                <Badge variant="outline" className="bg-muted text-foreground">W{t.weeklyPlan?.weekNumber}</Badge>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-indigo-600 dark:text-indigo-400">{t.weeklyPlan?.project?.name}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <Badge variant={'secondary'} className="w-fit text-[10px] tracking-wider uppercase font-bold">{t.section?.name}</Badge>
                                                    <span className="text-muted-foreground font-medium text-xs flex items-center gap-1">
                                                        <div className="w-1 h-1 rounded-full bg-border"></div>
                                                        {t.assignedTo || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-foreground font-medium leading-relaxed">{t.description}</td>
                                            <td className="px-8 py-5 text-sm whitespace-nowrap text-muted-foreground font-medium">
                                                {t.startDate && format(new Date(t.startDate), "MMM d")} <span className="text-border mx-1">→</span> {t.endDate && format(new Date(t.endDate), "MMM d, yyyy")}
                                            </td>
                                            <td className="px-8 py-5 text-center font-black text-foreground">{t.targetQty}</td>
                                            <td className="px-8 py-5 text-center">
                                                <Badge className={`px-4 py-1.5 uppercase font-bold tracking-widest text-[10px] ${t.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                                                    t.status === 'IN_PROGRESS' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' :
                                                        'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {t.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTasks.length === 0 && (
                                        <tr><td colSpan={7} className="px-8 py-10 text-center text-muted-foreground w-full">No weekly tasks found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationBar
                            page={tasksPage}
                            totalPages={Math.ceil(filteredTasks.length / PAGE_SIZE)}
                            totalItems={filteredTasks.length}
                            pageSize={PAGE_SIZE}
                            onPrev={() => setTasksPage(p => Math.max(1, p - 1))}
                            onNext={() => setTasksPage(p => p + 1)}
                        />
                    </PremiumCard>
                </TabsContent>

                {/* DAILY JOB CARDS TAB */}
                <TabsContent value="jobcards" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <PremiumCard className="overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl rounded-3xl bg-card/60 backdrop-blur-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase tracking-[0.2em] bg-muted/30 backdrop-blur-md text-muted-foreground border-b border-black/5 dark:border-white/5">
                                    <tr>
                                        <th className="px-8 py-5 font-bold tracking-wider">Date</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Project & Context</th>
                                        <th className="px-8 py-5 font-bold tracking-wider">Resource</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Status</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Qty Progress</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Budget Hrs</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Actual Hrs</th>
                                        <th className="px-8 py-5 font-bold tracking-wider text-center">Variance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 dark:divide-white/5">
                                    {pagedJobCards.map(j => {
                                        const variance = (j.budgetedLabourHrs || 0) - (j.actualHrs || 0);
                                        const hasOverrun = variance < 0; // Negative variance = overrun budget

                                        return (
                                            <tr key={j.id} className="hover:bg-primary/5 hover:shadow-md transition-all duration-300 transform-gpu hover:scale-[1.005] group">
                                                <td className="px-8 py-5 whitespace-nowrap text-muted-foreground font-medium">{j.day ? format(new Date(j.day), "MMM d, yyyy") : '-'}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{j.project?.name}</span>
                                                        <span className="text-xs text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded-sm">{j.itemCode || j.description || 'No context'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        {j.employee?.name ? (
                                                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                                {j.employee.name}
                                                            </span>
                                                        ) : j.assignedTo ? (
                                                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                                {j.assignedTo}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-xs">Unassigned</span>
                                                        )}
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-widest font-bold ml-3">{j.machine?.name || 'Manual'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <Badge className={`px-4 py-1.5 uppercase font-bold tracking-widest text-[10px] ${j.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm' :
                                                        j.status === 'IN_PROGRESS' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' :
                                                            'bg-muted text-muted-foreground shadow-none'
                                                        }`}>{j.status}</Badge>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-foreground text-lg tracking-tighter">{j.actualQty || 0} <span className="text-muted-foreground text-sm font-normal">/ {j.targetQty}</span></span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">{j.unit}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center font-mono font-medium text-muted-foreground bg-muted/10 border-l border-border/30">{j.budgetedLabourHrs || 0}h</td>
                                                <td className="px-8 py-5 text-center font-mono font-bold text-foreground bg-muted/10">{j.actualHrs ? `${j.actualHrs.toFixed(1)}h` : '-'}</td>
                                                <td className="px-8 py-5 text-center font-mono font-black border-r border-border/30 bg-muted/10">
                                                    {variance !== 0 ? (
                                                        <span className={`px-3 py-1 rounded-sm ${hasOverrun ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                                            {hasOverrun ? '' : '+'}{variance.toFixed(1)}h
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {filteredJobCards.length === 0 && (
                                        <tr><td colSpan={8} className="px-8 py-10 text-center text-muted-foreground w-full">No job cards found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationBar
                            page={jobsPage}
                            totalPages={Math.ceil(filteredJobCards.length / PAGE_SIZE)}
                            totalItems={filteredJobCards.length}
                            pageSize={PAGE_SIZE}
                            onPrev={() => setJobsPage(p => Math.max(1, p - 1))}
                            onNext={() => setJobsPage(p => p + 1)}
                        />
                    </PremiumCard>
                </TabsContent>
            </Tabs>
        </div>
    );
}
