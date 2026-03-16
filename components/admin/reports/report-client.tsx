"use client";

import { useState, useEffect } from "react";
import { getProjectReport } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Printer, PieChart as PieIcon, Activity, Users, Clock, Calendar, TrendingUp } from "lucide-react";
import { handleExportExcel, handleExportPDF } from "./report-utils";
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface Project {
    id: string;
    name: string;
}

interface ReportData {
    summary: {
        totalHours: number;
        totalQty: number;
        totalTasks: number;
        completionPercentage: number;
    };
    weeklyBreakdown: {
        weekNumber: number;
        hoursWorked: number;
        qtyProduced: number;
    }[];
    sectionBreakdown: {
        sectionName: string;
        totalHours: number;
        machineUsageHours: number;
    }[];
    employeeStats: {
        workerName: string;
        totalHours: number;
        tasksCompleted: number;
        efficiency: number;
    }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportClient({ projects }: { projects: Project[] }) {
    const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    // Date Range State
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [filterLabel, setFilterLabel] = useState("All Time");

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const sDate = startDate ? new Date(startDate) : undefined;
        const eDate = endDate ? new Date(endDate) : undefined;

        getProjectReport(selectedProjectId, sDate, eDate)
            .then(res => {
                if (isMounted) {
                    setData(res);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Failed to fetch report", err);
                setLoading(false);
            });

        return () => { isMounted = false; };
    }, [selectedProjectId, startDate, endDate]);

    const handleDownloadPDF = () => {
        if (!data) return;
        const projectName = projects.find(p => p.id === selectedProjectId)?.name || "All Projects";
        handleExportPDF(data, projectName, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    };

    const handleDownloadExcel = () => {
        if (!data) return;
        const projectName = projects.find(p => p.id === selectedProjectId)?.name || "All Projects";
        handleExportExcel(data, projectName, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    };

    // Quick Select Handlers - SATURDAY START
    const setThisWeek = () => {
        const now = new Date();
        const start = startOfWeek(now, { weekStartsOn: 6 }); // Saturday
        const end = endOfWeek(now, { weekStartsOn: 6 });
        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
        setFilterLabel("This Week");
    };

    const setLastWeek = () => {
        const now = new Date();
        const lastWeek = subWeeks(now, 1);
        const start = startOfWeek(lastWeek, { weekStartsOn: 6 }); // Saturday
        const end = endOfWeek(lastWeek, { weekStartsOn: 6 });
        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
        setFilterLabel("Last Week");
    };

    const setThisMonth = () => {
        const now = new Date();
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        setFilterLabel("This Month");
    };

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        setFilterLabel("All Time");
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted"></div>
                    <div className="h-4 w-48 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    if (!data) return <div className="text-center p-10 text-red-500">Failed to load report data.</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Control Panel */}
            <div className="bg-card/80 backdrop-blur-sm sticky top-0 z-10 p-4 rounded-xl shadow-sm border border-border flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Production Reports
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {filterLabel}
                        {startDate && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">{startDate} - {endDate}</span>}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-[180px] bg-background">
                            <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex bg-muted p-1 rounded-lg">
                        <Button variant={filterLabel === "This Week" ? "outline" : "ghost"} size="sm" onClick={setThisWeek} className={cn("text-xs h-7 border-0", filterLabel === "This Week" && "bg-background text-foreground shadow-sm font-medium")}>This Week</Button>
                        <Button variant={filterLabel === "Last Week" ? "outline" : "ghost"} size="sm" onClick={setLastWeek} className={cn("text-xs h-7 border-0", filterLabel === "Last Week" && "bg-background text-foreground shadow-sm font-medium")}>Last Week</Button>
                        <Button variant={filterLabel === "This Month" ? "outline" : "ghost"} size="sm" onClick={setThisMonth} className={cn("text-xs h-7 border-0", filterLabel === "This Month" && "bg-background text-foreground shadow-sm font-medium")}>Month</Button>
                        <Button variant={filterLabel === "All Time" ? "outline" : "ghost"} size="sm" onClick={clearFilters} className={cn("text-xs h-7 border-0", filterLabel === "All Time" && "bg-background text-foreground shadow-sm font-medium")}>All</Button>
                    </div>

                    <div className="w-px h-8 bg-border mx-2 hidden md:block"></div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={handleDownloadPDF} title="Download PDF"><Printer className="w-4 h-4 text-muted-foreground" /></Button>
                        <Button variant="outline" size="icon" onClick={handleDownloadExcel} title="Download Excel"><Download className="w-4 h-4 text-muted-foreground" /></Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-24 h-24" /></div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-blue-100">Total Hours</CardDescription>
                        <CardTitle className="text-4xl font-bold">{data.summary.totalHours.toFixed(1)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-blue-100 flex items-center gap-1">
                            <Activity className="w-4 h-4" /> Across {data.weeklyBreakdown.length} active weeks
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-md border-border relative overflow-hidden group hover:shadow-lg transition-all">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Production</CardDescription>
                        <CardTitle className="text-3xl font-bold text-foreground">{data.summary.totalQty.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <span className="bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded text-xs font-medium">Verified</span> Units Produced
                        </div>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                </Card>

                <Card className="bg-card shadow-md border-border relative overflow-hidden group hover:shadow-lg transition-all">
                    <CardHeader className="pb-2">
                        <CardDescription>Tasks Completed</CardDescription>
                        <CardTitle className="text-3xl font-bold text-foreground">{data.summary.completionPercentage.toFixed(0)}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${data.summary.completionPercentage}%` }}></div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">{data.summary.completionPercentage}% of scheduled tasks done</div>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
                </Card>

                <Card className="bg-card shadow-md border-border relative overflow-hidden group hover:shadow-lg transition-all">
                    <CardHeader className="pb-2">
                        <CardDescription>Efficiency Score</CardDescription>
                        <CardTitle className="text-3xl font-bold text-foreground">-</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            Target vs Actual (Coming Soon)
                        </div>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weekly Trend */}
                <Card className="lg:col-span-2 shadow-sm border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            Weekly Production Trend
                        </CardTitle>
                        <CardDescription>Hours worked per week</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.weeklyBreakdown}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="weekNumber" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: '#F3F4F6' }}
                                />
                                <Bar dataKey="hoursWorked" name="Hours Worked" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Section Breakdown Pie */}
                <Card className="shadow-sm border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PieIcon className="w-5 h-5 text-purple-500" />
                            Section Distribution
                        </CardTitle>
                        <CardDescription>Hours by Section</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.sectionBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="totalHours"
                                    nameKey="sectionName"
                                >
                                    {data.sectionBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Employee Performance Table */}
            <Card className="shadow-sm border-border overflow-hidden">
                <CardHeader className="bg-muted/50 border-b border-border">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-500" />
                        Team Performance
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/80">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Employee</th>
                                    <th className="px-6 py-4 font-medium text-center">Tasks Completed</th>
                                    <th className="px-6 py-4 font-medium text-right">Total Hours</th>
                                    <th className="px-6 py-4 font-medium text-center">Efficiency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.employeeStats.map((emp, i) => (
                                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                                                {emp.workerName.charAt(0)}
                                            </div>
                                            {emp.workerName}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                                                {emp.tasksCompleted}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-muted-foreground">{emp.totalHours.toFixed(1)}h</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="w-full bg-muted rounded-full h-1.5 max-w-[100px] mx-auto overflow-hidden">
                                                <div
                                                    className="bg-blue-500 h-1.5 rounded-full"
                                                    style={{ width: `${Math.min(emp.efficiency || 0, 100)}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
