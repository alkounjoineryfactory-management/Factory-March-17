"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Search, Download, Banknote, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/admin/premium-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSalaryPayments, getMonthlyOTPay, paySalary } from "@/app/actions/hr";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// Note: Depending on existing dependencies, you might need to adapt PDF generation. Assuming window.print for simplicity, or jsPDF if available.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";
import { Employee, Section, User, SalaryPayment } from "@prisma/client";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;
export function HrPaySalaryTab({ employees, users }: { employees: (Employee & { section?: Section | null })[], users: User[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "MMMM yyyy"));
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [otPayMap, setOtPayMap] = useState<Record<string, number>>({});
    const [empPage, setEmpPage] = useState(1);
    const [usersPage, setUsersPage] = useState(1);

    // Payment Dialog State
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<(Employee & { section?: Section | null }) | User | null>(null);
    const [entityType, setEntityType] = useState<"EMPLOYEE" | "ADMIN" | null>(null);

    // Generate last 12 months for dropdown
    const monthsList = useMemo(() => {
        const list = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            list.push(format(d, "MMMM yyyy"));
        }
        return list;
    }, []);

    // Fetch payments when month changes
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                const [paymentData, otData] = await Promise.all([
                    getSalaryPayments(selectedMonth),
                    getMonthlyOTPay(selectedMonth)
                ]);
                if (isMounted) {
                    setPayments(paymentData);
                    setOtPayMap(otData);
                }
            } catch {
                toast.error("Failed to load salary payments");
            }
        };
        load();
        return () => { isMounted = false; };
    }, [selectedMonth]);

    const refreshPayments = async () => {
        try {
            const [paymentData, otData] = await Promise.all([
                getSalaryPayments(selectedMonth),
                getMonthlyOTPay(selectedMonth)
            ]);
            setPayments(paymentData);
            setOtPayMap(otData);
        } catch {
            toast.error("Failed to load salary payments");
        }
    };

    // Data Processing
    const processedEmployees = useMemo(() => {
        return employees
            .filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(emp => {
                const payment = payments.find(p => p.employeeId === emp.id);
                const basic = emp.basicSalary || 0;
                const ot = otPayMap[emp.id] || 0;
                const total = basic + ot;

                return {
                    ...emp,
                    isPaid: !!payment,
                    paymentDate: payment?.paymentDate,
                    amountPaid: payment?.amount,
                    otPay: ot,
                    totalSalary: total
                };
            })
            // Sort: Unpaid first, then alphabetically
            .sort((a, b) => {
                if (a.isPaid === b.isPaid) return a.name.localeCompare(b.name);
                return a.isPaid ? 1 : -1;
            });
    }, [employees, payments, searchQuery]);

    const processedUsers = useMemo(() => {
        return users
            .filter(user => user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.username.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(user => {
                const payment = payments.find(p => p.userId === user.id);
                const basic = user.basicSalary || 0;
                const ot = otPayMap[user.id] || 0;
                const total = basic + ot;

                return {
                    ...user,
                    isPaid: !!payment,
                    paymentDate: payment?.paymentDate,
                    amountPaid: payment?.amount,
                    otPay: ot,
                    totalSalary: total
                };
            })
            .sort((a, b) => {
                if (a.isPaid === b.isPaid) return (a.name || a.username).localeCompare(b.name || b.username);
                return a.isPaid ? 1 : -1;
            });
    }, [users, payments, searchQuery]);


    const handlePayClick = (entity: (Employee & { section?: Section | null }) | User, type: "EMPLOYEE" | "ADMIN") => {
        setSelectedEntity(entity);
        setEntityType(type);
        setIsPaymentDialogOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedEntity || !entityType) return;
        if (!selectedEntity.basicSalary || selectedEntity.basicSalary <= 0) {
            toast.error("Please assign a primary Basic Salary first.");
            return;
        }

        try {
            const amountToPay = 'totalSalary' in selectedEntity 
                // @ts-ignore
                ? selectedEntity.totalSalary 
                : (selectedEntity.basicSalary || 0);

            await paySalary({
                employeeId: entityType === "EMPLOYEE" ? selectedEntity.id : undefined,
                userId: entityType === "ADMIN" ? selectedEntity.id : undefined,
                amount: amountToPay as number,
                month: selectedMonth
            });
            toast.success(`Salary paid successfully to ${'name' in selectedEntity && selectedEntity.name ? selectedEntity.name : ('username' in selectedEntity ? selectedEntity.username : 'Entity')}`);
            setIsPaymentDialogOpen(false);
            refreshPayments(); // Refresh real-time
        } catch {
            toast.error("Error processing payment");
        }
    };

    const downloadReport = () => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("Payroll Report", 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Month: ${selectedMonth}`, 14, 30);
        doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 36);

        // Employee Table
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Employees", 14, 46);

        autoTable(doc, {
            startY: 50,
            head: [["Code", "Name", "Section", "Status", "Basic", "OT", "Total"]],
            body: processedEmployees.map(emp => [
                emp.employeeCode || "N/A",
                emp.name,
                emp.section?.name || "N/A",
                emp.isPaid ? "PAID" : "UNPAID",
                formatCurrency(emp.basicSalary || 0),
                formatCurrency(emp.otPay as number),
                emp.isPaid ? formatCurrency(emp.amountPaid || emp.totalSalary || 0) : formatCurrency(emp.totalSalary || 0)
            ]),
        });

        const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 50;

        // Admin Table
        doc.setFontSize(14);
        doc.text("Admins & Management", 14, finalY + 10);

        autoTable(doc, {
            startY: finalY + 14,
            head: [["Username", "Name", "Role", "Status", "Basic", "OT", "Total"]],
            body: processedUsers.map(user => [
                user.username,
                user.name || "N/A",
                user.role,
                user.isPaid ? "PAID" : "UNPAID",
                formatCurrency(user.basicSalary || 0),
                formatCurrency((user as any).otPay as number),
                user.isPaid ? formatCurrency(user.amountPaid || (user as any).totalSalary || 0) : formatCurrency((user as any).totalSalary || 0)
            ]),
        });

        doc.save(`payroll_report_${selectedMonth.replace(" ", "_")}.pdf`);
    };

    return (
        <div className="space-y-6">
            <PremiumCard className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold">Payroll Processing</h2>
                        <p className="text-sm text-muted-foreground">Manage monthly salaries and track payments</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthsList.map(month => (
                                    <SelectItem key={month} value={month}>{month}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search personnel..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setEmpPage(1); setUsersPage(1); }}
                                className="pl-9 bg-white dark:bg-zinc-900 border-white/20"
                            />
                        </div>

                        <Button variant="outline" onClick={downloadReport} className="gap-2">
                            <Download className="w-4 h-4" /> Export Report
                        </Button>
                    </div>
                </div>

                <div className="mt-8">
                    <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                        Employees Payroll
                    </h3>
                    <div className="rounded-xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead>Code & Name</TableHead>
                                    <TableHead>Section</TableHead>
                                    <TableHead>Basic Salary</TableHead>
                                    <TableHead>OT Pay</TableHead>
                                    <TableHead>Total Salary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedEmployees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No employees found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    processedEmployees.slice((empPage - 1) * PAGE_SIZE, empPage * PAGE_SIZE).map(emp => (
                                        <TableRow key={emp.id} className={emp.isPaid ? 'opacity-80 bg-emerald-500/5' : ''}>
                                            <TableCell>
                                                <div className="font-medium">{emp.name}</div>
                                                <div className="text-xs text-muted-foreground">{emp.employeeCode || "No Code"}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{emp.section?.name || "Unassigned"}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-muted-foreground line-through opacity-70">
                                                {formatCurrency(emp.basicSalary || 0)}
                                            </TableCell>
                                            <TableCell className="font-mono text-amber-600 dark:text-amber-400">
                                                {emp.otPay > 0 ? `+${formatCurrency(emp.otPay)}` : "-"}
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(emp.isPaid ? (emp.amountPaid || emp.totalSalary) : emp.totalSalary)}
                                            </TableCell>
                                            <TableCell>
                                                {emp.isPaid ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Paid on {format(new Date(emp.paymentDate || new Date()), "MMM dd")}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                                                        Pending
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!emp.isPaid && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() => handlePayClick(emp, "EMPLOYEE")}
                                                        disabled={!emp.basicSalary}
                                                    >
                                                        <Banknote className="w-4 h-4 mr-1" /> Mark Paid
                                                    </Button>
                                                )}
                                                {!emp.basicSalary && !emp.isPaid && (
                                                    <span className="text-xs text-rose-500 italic block mt-1">Salary not set</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationBar
                        page={empPage}
                        totalPages={Math.ceil(processedEmployees.length / PAGE_SIZE)}
                        totalItems={processedEmployees.length}
                        pageSize={PAGE_SIZE}
                        onPrev={() => setEmpPage(p => Math.max(1, p - 1))}
                        onNext={() => setEmpPage(p => p + 1)}
                    />
                </div>

                <div className="mt-12">
                    <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-6 bg-slate-500 rounded-full"></span>
                        Admins & Management Payroll
                    </h3>
                    <div className="rounded-xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead>Username & Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Basic Salary</TableHead>
                                    <TableHead>OT Pay</TableHead>
                                    <TableHead>Total Salary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No admins found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    processedUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE).map(user => (
                                        <TableRow key={user.id} className={user.isPaid ? 'opacity-80 bg-emerald-500/5' : ''}>
                                            <TableCell>
                                                <div className="font-medium">{user.name || "Admin User"}</div>
                                                <div className="text-xs text-muted-foreground">@{user.username}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{user.role.toLowerCase().replace("_", " ")}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-muted-foreground line-through opacity-70">
                                                {formatCurrency(user.basicSalary || 0)}
                                            </TableCell>
                                            <TableCell className="font-mono text-amber-600 dark:text-amber-400">
                                                {user.otPay > 0 ? `+${formatCurrency(user.otPay)}` : "-"}
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(user.isPaid ? (user.amountPaid || user.totalSalary) : user.totalSalary)}
                                            </TableCell>
                                            <TableCell>
                                                {user.isPaid ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Paid on {format(new Date(user.paymentDate || new Date()), "MMM dd")}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                                                        Pending
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!user.isPaid && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() => handlePayClick(user, "ADMIN")}
                                                        disabled={!user.basicSalary}
                                                    >
                                                        <Banknote className="w-4 h-4 mr-1" /> Mark Paid
                                                    </Button>
                                                )}
                                                {!user.basicSalary && !user.isPaid && (
                                                    <span className="text-xs text-rose-500 italic block mt-1">Salary not set</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationBar
                        page={usersPage}
                        totalPages={Math.ceil(processedUsers.length / PAGE_SIZE)}
                        totalItems={processedUsers.length}
                        pageSize={PAGE_SIZE}
                        onPrev={() => setUsersPage(p => Math.max(1, p - 1))}
                        onNext={() => setUsersPage(p => p + 1)}
                    />
                </div>

            </PremiumCard>

            {/* Payment Confirm Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Salary Payment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to mark the salary as paid for {'name' in (selectedEntity || {}) && selectedEntity?.name ? selectedEntity.name : ('username' in (selectedEntity || {}) ? (selectedEntity as User).username : 'Entity')} for the month of <strong>{selectedMonth}</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Payment Amount:</span>
                            <span className="text-lg font-bold font-mono text-emerald-500">
                                {formatCurrency('totalSalary' in (selectedEntity || {}) ? (selectedEntity as any).totalSalary : (selectedEntity?.basicSalary || 0))}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            This action will automatically create a Ledger Transaction deducting from Cash and adding to Salary Expense.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmPayment}>
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
