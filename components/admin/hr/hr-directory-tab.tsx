"use client";

import { useState, Fragment } from "react";
import { format } from "date-fns";
import { Employee, Section, SubSection } from "@prisma/client";
import { PremiumCard } from "@/components/admin/premium-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateEmployeeHRDetails } from "@/app/actions/hr";
import { toast } from "sonner";
import { Edit2, Loader2, Users, Search, ArrowUpDown } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;

type EmployeeWithSection = Employee & { section: Section; subSection?: SubSection | null };

interface HrDirectoryTabProps {
    employees: EmployeeWithSection[];
}

export function HrDirectoryTab({ employees }: HrDirectoryTabProps) {
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithSection | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Search & Sort State
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);

    // Form State
    const [basicSalary, setBasicSalary] = useState("");
    const [joiningDate, setJoiningDate] = useState("");
    const [status, setStatus] = useState("ACTIVE");

    const handleEditClick = (employee: EmployeeWithSection) => {
        setSelectedEmployee(employee);
        setBasicSalary(employee.basicSalary ? employee.basicSalary.toString() : "");
        setJoiningDate(employee.joiningDate ? format(new Date(employee.joiningDate), "yyyy-MM-dd") : "");
        setStatus(employee.status || "ACTIVE");
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedEmployee) return;

        try {
            setIsLoading(true);
            await updateEmployeeHRDetails(selectedEmployee.id, {
                basicSalary: basicSalary ? parseFloat(basicSalary) : null,
                joiningDate: joiningDate ? new Date(joiningDate) : null,
                status: status,
            });

            toast("Employee Updated", {
                description: `HR details for ${selectedEmployee.name} have been saved.`,
            });
            setIsDialogOpen(false);
        } catch (error) {
            toast.error("Error", {
                description: "Failed to update employee details.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Filter, Sort, and Group data
    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employeeCode && emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
        let comparison = 0;
        if (sortBy === "name") {
            comparison = a.name.localeCompare(b.name);
        } else if (sortBy === "joiningDate") {
            const dateA = a.joiningDate ? new Date(a.joiningDate).getTime() : 0;
            const dateB = b.joiningDate ? new Date(b.joiningDate).getTime() : 0;
            comparison = dateA - dateB;
        } else if (sortBy === "basicSalary") {
            comparison = (a.basicSalary || 0) - (b.basicSalary || 0);
        } else if (sortBy === "status") {
            comparison = (a.status || "").localeCompare(b.status || "");
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 backdrop-blur-xl border border-black/5 dark:border-white/5 p-2 rounded-2xl shadow-sm mb-6 w-full">
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
                            <SelectItem value="joiningDate">Joining Date</SelectItem>
                            <SelectItem value="basicSalary">Base Salary</SelectItem>
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

            <PremiumCard className="p-0 overflow-hidden" contentClassName="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-xs uppercase font-bold text-muted-foreground tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Section / Role</th>
                                <th className="px-6 py-4 hidden md:table-cell">Joining Date</th>
                                <th className="px-6 py-4 hidden md:table-cell">Base Salary</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
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
                                    {groupedBySection[sectionName].map((emp) => (
                                        <tr key={emp.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-gray-100 tracking-wide leading-tight">{emp.name}</div>
                                                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{emp.employeeCode || "—"}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-700 dark:text-gray-300">{emp.role}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{emp.section.name}</div>
                                                {emp.subSection && (
                                                    <div className="text-[10px] font-semibold text-muted-foreground/80 mt-0.5">
                                                        ↳ {emp.subSection.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell text-gray-600 dark:text-gray-400 font-medium">
                                                {emp.joiningDate ? format(new Date(emp.joiningDate), "MMM d, yyyy") : "—"}
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                                                    {emp.basicSalary ? `$${emp.basicSalary.toLocaleString()}` : "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={`
                                                    ${emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}
                                                    ${emp.status === 'ON_LEAVE' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : ''}
                                                    ${emp.status === 'TERMINATED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : ''}
                                                `}>
                                                    {emp.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/10 rounded-xl"
                                                    onClick={() => handleEditClick(emp)}
                                                >
                                                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                            {sectionKeys.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No employees found in the directory.</p>
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
                        <DialogTitle className="text-xl">Edit HR Details</DialogTitle>
                        <DialogDescription>
                            Update payroll and employment details for {selectedEmployee?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="salary" className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Basic Salary (Monthly)</Label>
                            <Input
                                id="salary"
                                type="number"
                                placeholder="0.00"
                                value={basicSalary}
                                onChange={(e) => setBasicSalary(e.target.value)}
                                className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all font-mono"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date" className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Joining Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Employment Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-transparent focus:ring-indigo-500 transition-all">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-black/10 dark:border-white/10 shadow-xl backdrop-blur-xl bg-card/90">
                                    <SelectItem value="ACTIVE" className="rounded-lg cursor-pointer">Active</SelectItem>
                                    <SelectItem value="ON_LEAVE" className="rounded-lg cursor-pointer">On Leave</SelectItem>
                                    <SelectItem value="TERMINATED" className="rounded-lg cursor-pointer">Terminated</SelectItem>
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
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
