"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Loader2, KeyRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFactoryEmployees, createFactoryEmployee, updateFactoryEmployee, deleteFactoryEmployee, getFactorySections, getFactoryMachines } from "@/app/actions/factory-settings";
import { cn } from "@/lib/utils";

export default function EmployeesTab() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [machines, setMachines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    // Controlled states for Selects
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedSubSectionId, setSelectedSubSectionId] = useState<string>("none");
    const [selectedMachineId, setSelectedMachineId] = useState<string>("none");

    const activeSection = useMemo(() => sections.find(s => s.id === selectedSectionId), [sections, selectedSectionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [eList, sList, mList] = await Promise.all([
                getFactoryEmployees(),
                getFactorySections(),
                getFactoryMachines()
            ]);
            setEmployees(eList);
            setSections(sList);
            setMachines(mList);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenCreate = () => {
        setEditingEmployee(null);
        setSelectedSectionId("");
        setSelectedSubSectionId("none");
        setSelectedMachineId("none");
        setModalOpen(true);
    };

    const handleOpenEdit = (employee: any) => {
        setEditingEmployee(employee);
        setSelectedSectionId(employee.sectionId || "");
        setSelectedSubSectionId(employee.subSectionId || "none");
        setSelectedMachineId(employee.assignedMachineId || "none");
        setModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete employee "${name}"?`)) {
            try {
                await deleteFactoryEmployee(id);
                loadData();
            } catch (error) {
                alert("Failed to delete employee.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);

        // Ensure values are attached if missing due to component nature
        if (!formData.get("sectionId") && selectedSectionId) formData.set("sectionId", selectedSectionId);
        
        if (selectedSubSectionId === "none") {
            formData.set("subSectionId", "");
        } else if (!formData.get("subSectionId") && selectedSubSectionId) {
            formData.set("subSectionId", selectedSubSectionId);
        }

        if (!formData.get("assignedMachineId") && selectedMachineId) formData.set("assignedMachineId", selectedMachineId);

        try {
            if (editingEmployee) {
                await updateFactoryEmployee(editingEmployee.id, formData);
            } else {
                await createFactoryEmployee(formData);
            }
            setModalOpen(false);
            loadData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 dark:border-white/5 p-6 md:p-8 text-card-foreground relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10 group-hover:bg-primary/10 transition-colors duration-700"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner border border-blue-500/20">
                            <Users className="w-5 h-5" />
                        </div>
                        Factory Employees
                    </h2>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2 opacity-80">
                        Manage factory workforce, system logins, and active assignments.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="h-11 rounded-xl px-6 font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                    <Plus className="w-4 h-4 mr-2" /> Add Employee
                </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/5 dark:border-white/5 shadow-inner bg-background/30 backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black tracking-widest text-muted-foreground uppercase bg-muted/30 border-b border-black/5 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-5">Code</th>
                                <th className="px-6 py-5">Name</th>
                                <th className="px-6 py-5">Department</th>
                                <th className="px-6 py-5">Machine</th>
                                <th className="px-6 py-5">Contact / Login</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {employees.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No employees found.</td></tr>
                            ) : (
                                employees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-5 font-mono text-xs font-bold text-muted-foreground">{employee.employeeCode || <span className="opacity-50">-</span>}</td>
                                        <td className="px-6 py-5 font-bold text-foreground">{employee.name}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-primary/20 shadow-sm">
                                                    {employee.section?.name || "Unknown"}
                                                </span>
                                                {employee.subSection && (
                                                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide border border-border/50">
                                                        ↳ {employee.subSection.name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-muted-foreground font-medium text-xs">{employee.assignedMachine?.name || <span className="opacity-50">-</span>}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1.5 text-[11px]">
                                                <span className="text-muted-foreground font-medium">{employee.phoneNumber || "No Phone"}</span>
                                                <span className="text-foreground font-bold flex items-center gap-1.5 bg-background/50 border border-black/5 dark:border-white/5 rounded-md px-2 py-1 w-fit">
                                                    <KeyRound className="w-3 h-3 text-primary" /> {employee.username}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(employee)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id, employee.name)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-xl bg-card/70 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-[0_15px_50px_rgb(0,0,0,0.12)] rounded-3xl p-6">
                    <DialogHeader className="pb-4">
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner border border-blue-500/20">
                                {editingEmployee ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </div>
                            {editingEmployee ? "Edit Employee" : "Add New Employee"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-8 pt-4">

                        {/* Personal Details */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-black/5 dark:border-white/5 pb-2">Personal Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name <span className="text-red-500">*</span></Label>
                                    <Input id="name" name="name" defaultValue={editingEmployee?.name} required placeholder="e.g. John Doe" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="employeeCode" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Employee Code</Label>
                                    <Input id="employeeCode" name="employeeCode" defaultValue={editingEmployee?.employeeCode} placeholder="e.g. EMP-001" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium font-mono text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                                    <Input id="phoneNumber" name="phoneNumber" defaultValue={editingEmployee?.phoneNumber} placeholder="e.g. +1 234 567 8900" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium" />
                                </div>
                            </div>
                        </div>

                        {/* Assignments */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-black/5 dark:border-white/5 pb-2">Assignments</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 relative z-[80]">
                                    <Label htmlFor="sectionId" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Department / Section <span className="text-red-500">*</span></Label>
                                    <Select name="sectionId" value={selectedSectionId} onValueChange={(val) => { setSelectedSectionId(val); setSelectedSubSectionId("none"); }} required>
                                        <SelectTrigger className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium">
                                            <SelectValue placeholder="Select Section" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card/90 backdrop-blur-xl border-black/10 dark:border-white/10">
                                            {sections.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <input type="hidden" name="sectionId" value={selectedSectionId} />
                                </div>
                                <div className="space-y-2 relative z-[70]">
                                    <Label htmlFor="subSectionId" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sub-Section</Label>
                                    <Select name="subSectionId" value={selectedSubSectionId} onValueChange={setSelectedSubSectionId} disabled={!selectedSectionId || !activeSection?.subSections?.length}>
                                        <SelectTrigger className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium">
                                            <SelectValue placeholder="Select Sub-Section" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card/90 backdrop-blur-xl border-black/10 dark:border-white/10">
                                            <SelectItem value="none">None (General)</SelectItem>
                                            {activeSection?.subSections?.map((sub: any) => (
                                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <input type="hidden" name="subSectionId" value={selectedSubSectionId} />
                                </div>
                                <div className="space-y-2 relative z-[60] col-span-2 md:col-span-2">
                                    <Label htmlFor="assignedMachineId" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Machine</Label>
                                    <Select name="assignedMachineId" value={selectedMachineId} onValueChange={setSelectedMachineId}>
                                        <SelectTrigger className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium">
                                            <SelectValue placeholder="Select Machine" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card/90 backdrop-blur-xl border-black/10 dark:border-white/10">
                                            <SelectItem value="none">None (General Worker)</SelectItem>
                                            {machines.map(m => (
                                                <SelectItem key={m.id} value={m.id}>{m.name} ({m.section?.name})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <input type="hidden" name="assignedMachineId" value={selectedMachineId} />
                                </div>
                            </div>
                        </div>

                        {/* Login Credentials */}
                        <div className="space-y-4 bg-primary/5 p-5 rounded-2xl border border-primary/10">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <KeyRound className="w-4 h-4" /> Kiosk Login Credentials
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Username <span className="text-red-500">*</span></Label>
                                    <Input id="username" name="username" defaultValue={editingEmployee?.username} required placeholder="Unique username" className="h-11 bg-background/80 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-bold text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Password {editingEmployee ? <span className="opacity-50">(Leave blank to keep)</span> : <span className="text-red-500">*</span>}
                                    </Label>
                                    <Input id="password" name="password" type="password" required={!editingEmployee} placeholder="Secure password" className="h-11 bg-background/80 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium text-xs tracking-[0.2em]" />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-6 border-t border-black/5 dark:border-white/5 gap-3">
                            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="h-11 rounded-xl px-6 font-bold uppercase tracking-wider text-[10px] hover:bg-black/5 dark:hover:bg-white/5">Cancel</Button>
                            <Button type="submit" disabled={submitting} className="h-11 rounded-xl px-8 font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {editingEmployee ? "Save Changes" : "Create Employee"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
