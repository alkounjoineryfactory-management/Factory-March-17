"use client";

import { useState, Fragment } from "react";
import { format } from "date-fns";
import { Employee, Attendance, Section, SubSection } from "@prisma/client";
import { PremiumCard } from "@/components/admin/premium-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { markAttendance } from "@/app/actions/hr";
import { Calendar as CalendarIcon, Clock, Edit2, Loader2, Search, ArrowUpDown } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;

type EmployeeWithSection = Employee & { section: Section; subSection?: SubSection | null };
type AttendanceWithEmployee = Attendance & { employee: EmployeeWithSection };

interface HrAttendanceTabProps {
    employees: EmployeeWithSection[];
    attendance: AttendanceWithEmployee[];
}

export function HrAttendanceTab({ employees, attendance }: HrAttendanceTabProps) {
    const [date, setDate] = useState<Date>(new Date());
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);

    // Modal State
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithSection | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [checkInTime, setCheckInTime] = useState("");
    const [checkOutTime, setCheckOutTime] = useState("");
    const [status, setStatus] = useState("PRESENT");

    const getEmployeeAttendance = (empId: string) => {
        return attendance.find(a => a.employeeId === empId);
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employeeCode && emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
        const recordA = getEmployeeAttendance(a.id);
        const recordB = getEmployeeAttendance(b.id);
        let comparison = 0;

        if (sortBy === "name") {
            comparison = a.name.localeCompare(b.name);
        } else if (sortBy === "checkIn") {
            const timeA = recordA?.checkIn ? new Date(recordA.checkIn).getTime() : 0;
            const timeB = recordB?.checkIn ? new Date(recordB.checkIn).getTime() : 0;
            comparison = timeA - timeB;
        } else if (sortBy === "checkOut") {
            const timeA = recordA?.checkOut ? new Date(recordA.checkOut).getTime() : 0;
            const timeB = recordB?.checkOut ? new Date(recordB.checkOut).getTime() : 0;
            comparison = timeA - timeB;
        } else if (sortBy === "status") {
            const statA = recordA?.status || "UNMARKED";
            const statB = recordB?.status || "UNMARKED";
            comparison = statA.localeCompare(statB);
        }
        return sortOrder === "asc" ? comparison : -comparison;
    });

    const groupedBySection = sortedEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).reduce((acc, emp) => {
        const sectionName = emp.section?.name || "Unassigned";
        if (!acc[sectionName]) acc[sectionName] = [];
        acc[sectionName].push(emp);
        return acc;
    }, {} as Record<string, typeof sortedEmployees>);

    const sectionKeys = Object.keys(groupedBySection).sort();

    const handleMarkClick = (employee: EmployeeWithSection) => {
        setSelectedEmployee(employee);
        const record = getEmployeeAttendance(employee.id);

        if (record) {
            setCheckInTime(record.checkIn ? format(new Date(record.checkIn), "HH:mm") : "");
            setCheckOutTime(record.checkOut ? format(new Date(record.checkOut), "HH:mm") : "");
            setStatus(record.status);
        } else {
            setCheckInTime("08:00");
            setCheckOutTime("17:00");
            setStatus("PRESENT");
        }

        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedEmployee) return;

        try {
            setIsLoading(true);

            // Build absolute Date objects based on the selected target date + time input
            const targetDateStr = format(date, "yyyy-MM-dd");
            const parsedCheckIn = checkInTime ? new Date(`${targetDateStr}T${checkInTime}`) : undefined;
            const parsedCheckOut = checkOutTime ? new Date(`${targetDateStr}T${checkOutTime}`) : undefined;

            await markAttendance({
                employeeId: selectedEmployee.id,
                date: date,
                checkIn: parsedCheckIn,
                checkOut: parsedCheckOut,
                status: status,
            });

            toast("Attendance Logged", {
                description: `Updated record for ${selectedEmployee.name} on ${format(date, "MMM d")}.`,
            });
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Error", {
                description: "Failed to update attendance.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/60 backdrop-blur-xl border border-black/5 dark:border-white/5 p-2 rounded-2xl shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="pl-9 h-10 w-full bg-background/50 border-black/5 dark:border-white/5 rounded-xl"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background/50 border-black/5 dark:border-white/5">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="checkIn">Check-In</SelectItem>
                                <SelectItem value="checkOut">Check-Out</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                            className="h-10 w-10 shrink-0 rounded-xl"
                        >
                            <ArrowUpDown className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-background/50 border border-black/5 dark:border-white/5 p-0.5 rounded-xl shadow-sm w-full md:w-auto shrink-0">
                    <Button variant="ghost" className="h-9 px-3 text-muted-foreground hover:text-foreground hidden sm:flex" onClick={() => setDate(new Date())}>
                        Today
                    </Button>
                    <div className="relative flex items-center">
                        <CalendarIcon className="absolute left-3 w-4 h-4 text-indigo-500 pointer-events-none" />
                        <Input
                            type="date"
                            value={format(date, "yyyy-MM-dd")}
                            onChange={(e) => setDate(new Date(e.target.value))}
                            className="h-9 pl-10 border-transparent bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-lg w-full sm:w-40 font-medium text-gray-700 dark:text-gray-300 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <PremiumCard className="p-0 overflow-hidden" contentClassName="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-xs uppercase font-bold text-muted-foreground tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Section</th>
                                <th className="px-6 py-4">Check-In</th>
                                <th className="px-6 py-4">Check-Out</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {sectionKeys.map(sectionName => (
                                <Fragment key={sectionName}>
                                    <tr>
                                        <td colSpan={6} className="px-6 py-3 bg-primary/5 border-y border-black/5 dark:border-white/5">
                                            <span className="font-bold text-sm text-primary uppercase tracking-widest">{sectionName}</span>
                                            <span className="ml-2 text-xs text-muted-foreground font-medium">({groupedBySection[sectionName].length} employees)</span>
                                        </td>
                                    </tr>
                                    {groupedBySection[sectionName].map((emp) => {
                                        const record = getEmployeeAttendance(emp.id);
                                        return (
                                            <tr key={emp.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 dark:text-gray-100">{emp.name}</div>
                                                    <div className="text-xs text-muted-foreground">{emp.employeeCode || "—"}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{emp.section.name}</div>
                                                    {emp.subSection && (
                                                        <div className="text-[10px] font-semibold text-muted-foreground/80 mt-0.5">
                                                            ↳ {emp.subSection.name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-gray-600 dark:text-gray-400">
                                                    {record?.checkIn ? format(new Date(record.checkIn), "HH:mm") : "—"}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium text-gray-600 dark:text-gray-400">
                                                    {record?.checkOut ? format(new Date(record.checkOut), "HH:mm") : "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {!record ? (
                                                        <Badge variant="outline" className="opacity-50 text-xs">Unmarked</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className={`
                                                            ${record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}
                                                            ${record.status === 'ABSENT' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : ''}
                                                            ${record.status === 'HALF_DAY' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : ''}
                                                            ${record.status === 'LEAVE' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : ''}
                                                        `}>
                                                            {record.status}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm bg-white dark:bg-white/5 border-black/10 dark:border-white/10"
                                                        onClick={() => handleMarkClick(emp)}
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Log
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            ))}
                            {sectionKeys.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No employees found for this search.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </PremiumCard>
            <PaginationBar
                page={page}
                totalPages={Math.ceil(sortedEmployees.length / PAGE_SIZE)}
                totalItems={sortedEmployees.length}
                pageSize={PAGE_SIZE}
                onPrev={() => setPage(p => Math.max(1, p - 1))}
                onNext={() => setPage(p => p + 1)}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Log Attendance</DialogTitle>
                        <DialogDescription>
                            Date: {format(date, "MMMM d, yyyy")} <br />
                            Employee: <span className="font-bold text-foreground">{selectedEmployee?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="checkIn" className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Check-In</Label>
                                <Input
                                    id="checkIn"
                                    type="time"
                                    value={checkInTime}
                                    onChange={(e) => setCheckInTime(e.target.value)}
                                    className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all font-mono"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="checkOut" className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Check-Out</Label>
                                <Input
                                    id="checkOut"
                                    type="time"
                                    value={checkOutTime}
                                    onChange={(e) => setCheckOutTime(e.target.value)}
                                    className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all font-mono"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Daily Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus:ring-indigo-500 transition-all">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-black/10 dark:border-white/10 shadow-xl backdrop-blur-xl bg-card/90">
                                    <SelectItem value="PRESENT" className="rounded-lg">Present</SelectItem>
                                    <SelectItem value="HALF_DAY" className="rounded-lg">Half-Day</SelectItem>
                                    <SelectItem value="ABSENT" className="rounded-lg">Absent</SelectItem>
                                    <SelectItem value="LEAVE" className="rounded-lg text-muted-foreground">On Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="rounded-xl border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Record"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
