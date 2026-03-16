"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { Loader2, Download, Search, Briefcase, Clock, CalendarDays, Filter, FileDown, Layers, Component, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOvertimeData } from "@/app/actions/hr";
import { getProjects, getSections } from "@/app/actions";
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;

export default function HROvertimeTab() {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("week"); // today, week, month
    const [projectId, setProjectId] = useState("all");
    const [sectionId, setSectionId] = useState("all");
    const [subSectionId, setSubSectionId] = useState("all");
    const [projects, setProjects] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [overtimeRecords, setOvertimeRecords] = useState<any[]>([]);
    const [page, setPage] = useState(1);

    const pagedOvertimeRecords = overtimeRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [projs, sects] = await Promise.all([
                    getProjects(),
                    getSections()
                ]);
                setProjects(projs);
                setSections(sects);
            } catch (error) {
                console.error("Failed to fetch filters", error);
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        const fetchOvertime = async () => {
            setLoading(true);
            try {
                const endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                let startDate = new Date();
                startDate.setHours(0, 0, 0, 0);

                if (period === "week") {
                    startDate = subDays(startDate, 7);
                } else if (period === "month") {
                    startDate = subDays(startDate, 30);
                }

                const data = await getOvertimeData(startDate, endDate, projectId, sectionId, subSectionId);
                setOvertimeRecords(data);
                setPage(1); // reset on every fetch
            } catch (error) {
                console.error("Failed to load overtime data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOvertime();
    }, [period, projectId, sectionId, subSectionId]);

    const activeSubSections = sections.find(s => s.id === sectionId)?.subSections || [];

    const handleDownloadCSV = () => {
        if (overtimeRecords.length === 0) return;

        const headers = ["Date", "Employee Name", "Role", "Projects Worked", "Total Hours", "Standard Hours", "Overtime Hours", "Estimated Pay"];
        const rows = overtimeRecords.map(r => [
            r.date, 
            r.employeeName, 
            r.employeeRole, 
            `"${r.projects}"`, // quote in case of commas
            r.totalHours, 
            r.standardHours, 
            r.overtimeHours,
            r.overtimePay.toFixed(2)
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `overtime_report_${period}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = () => {
        if (overtimeRecords.length === 0) return;

        const doc = new jsPDF();
        doc.text(`Overtime Report - ${period}`, 14, 15);
        
        const headers = [["Date", "Employee Name", "Role", "Projects", "Regular Hrs", "OT Hrs", "Est. Pay"]];
        const data = overtimeRecords.map(r => [
            format(r.dateObj, 'MMM dd, yyyy'),
            r.employeeName,
            r.employeeRole,
            r.projects,
            `${Number(r.totalHours).toFixed(1)} / ${r.standardHours}`,
            r.overtimeHours > 0 ? `+${r.overtimeHours.toFixed(1)}` : "-",
            r.overtimePay > 0 ? `QR ${r.overtimePay.toFixed(2)}` : "-"
        ]);

        autoTable(doc, {
            startY: 20,
            head: headers,
            body: data,
        });

        doc.save(`overtime_report_${period}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const totalOvertime = overtimeRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
    const totalEmployeesWithOT = new Set(overtimeRecords.filter(r => r.overtimeHours > 0).map(r => r.employeeId)).size;
    const totalOvertimePay = overtimeRecords.reduce((sum, r) => sum + (r.overtimePay || 0), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card shadow-sm border border-border p-4 rounded-xl flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Clock className="w-16 h-16" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-500" /> Total Overtime (Hrs)
                    </span>
                    <span className="text-3xl font-black tracking-tight">{totalOvertime.toFixed(1)}</span>
                </div>
                <div className="bg-card shadow-sm border border-border p-4 rounded-xl flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Briefcase className="w-16 h-16" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-500" /> Employees w/ OT
                    </span>
                    <span className="text-3xl font-black tracking-tight">{totalEmployeesWithOT}</span>
                </div>
                <div className="bg-card shadow-sm border border-amber-500/20 bg-amber-500/5 p-4 rounded-xl flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none text-amber-500">
                        <Banknote className="w-16 h-16" />
                    </div>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <Banknote className="w-4 h-4" /> Estimated OT Liability
                    </span>
                    <span className="text-3xl font-black tracking-tight text-amber-700 dark:text-amber-300 gap-1 flex items-baseline">
                        <span className="text-sm font-semibold opacity-70">QR</span> {totalOvertimePay.toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card text-card-foreground p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="bg-background/50 border-black/10 dark:border-white/10">
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 min-w-[200px]">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <Select value={sectionId} onValueChange={(val) => { setSectionId(val); setSubSectionId("all"); }}>
                            <SelectTrigger className="bg-background/50 border-black/10 dark:border-white/10">
                                <SelectValue placeholder="Filter Section" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sections</SelectItem>
                                {sections.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 min-w-[200px]">
                        <Component className="w-4 h-4 text-muted-foreground" />
                        <Select value={subSectionId} onValueChange={setSubSectionId} disabled={sectionId === "all" || activeSubSections.length === 0}>
                            <SelectTrigger className="bg-background/50 border-black/10 dark:border-white/10">
                                <SelectValue placeholder="Filter Sub-section" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sub-sections</SelectItem>
                                {activeSubSections.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 min-w-[200px]">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger className="bg-background/50 border-black/10 dark:border-white/10">
                                <SelectValue placeholder="Filter Project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
                    <Button 
                        variant="outline" 
                        className="font-medium gap-2 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                        onClick={handleDownloadCSV}
                        disabled={overtimeRecords.length === 0}
                    >
                        <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button 
                        variant="outline" 
                        className="font-medium gap-2 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                        onClick={handleDownloadPDF}
                        disabled={overtimeRecords.length === 0}
                    >
                        <FileDown className="w-4 h-4" /> PDF
                    </Button>
                </div>
            </div>

            <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-24 flex justify-center items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : overtimeRecords.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p>No work logs found for this period.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">Date</th>
                                    <th className="px-5 py-4 font-semibold">Employee</th>
                                    <th className="px-5 py-4 font-semibold">Projects</th>
                                    <th className="px-5 py-4 font-semibold bg-emerald-500/5 dark:bg-emerald-500/10">Regular Hrs</th>
                                    <th className="px-5 py-4 font-semibold bg-primary/5 dark:bg-primary/10 text-primary">Overtime (Hrs)</th>
                                    <th className="px-5 py-4 font-semibold bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">Est. Payout</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedOvertimeRecords.map((record, i) => (
                                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground font-medium">
                                            {format(record.dateObj, 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-foreground">{record.employeeName}</div>
                                            <div className="text-xs text-muted-foreground">{record.employeeRole}</div>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            <div className="max-w-[200px] truncate" title={record.projects}>
                                                {record.projects || "-"}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-medium bg-emerald-500/5 dark:bg-emerald-500/10">
                                            {Number(record.totalHours).toFixed(1)} / {record.standardHours}
                                        </td>
                                        <td className="px-5 py-4 bg-primary/5 dark:bg-primary/10">
                                            {record.overtimeHours > 0 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-primary text-primary-foreground">
                                                    +{record.overtimeHours.toFixed(1)} Hrs
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/50">-</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 bg-amber-500/5 dark:bg-amber-500/10">
                                            {record.overtimePay > 0 ? (
                                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                    <span className="text-xs opacity-70 font-medium">QR </span>{record.overtimePay.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/50">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {!loading && overtimeRecords.length > 0 && (
                <PaginationBar
                    page={page}
                    totalPages={Math.ceil(overtimeRecords.length / PAGE_SIZE)}
                    totalItems={overtimeRecords.length}
                    pageSize={PAGE_SIZE}
                    onPrev={() => setPage(p => Math.max(1, p - 1))}
                    onNext={() => setPage(p => p + 1)}
                />
            )}
        </div>
    );
}
