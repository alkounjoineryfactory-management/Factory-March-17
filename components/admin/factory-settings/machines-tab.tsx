"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Loader2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFactoryMachines, createFactoryMachine, updateFactoryMachine, deleteFactoryMachine, getFactorySections, getFactoryEmployees } from "@/app/actions/factory-settings";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

export default function MachinesTab() {
    const [machines, setMachines] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedSubSectionId, setSelectedSubSectionId] = useState<string>("none");

    const activeSection = useMemo(() => sections.find(s => s.id === selectedSectionId), [sections, selectedSectionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [mList, sList, eList] = await Promise.all([
                getFactoryMachines(),
                getFactorySections(),
                getFactoryEmployees()
            ]);
            setMachines(mList);
            setSections(sList);
            setEmployees(eList);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const employeeOptions: Option[] = useMemo(() => {
        return employees
            .filter(e => !selectedSectionId || e.sectionId === selectedSectionId)
            .map(e => {
                const machineInfo = e.assignedMachine?.name ? ` (Current: ${e.assignedMachine.name})` : ``;
                return {
                    label: `${e.name}${machineInfo}`,
                    value: e.name
                };
            });
    }, [employees, selectedSectionId]);

    const currentSectionIncharge = useMemo(() => {
        const section = sections.find(s => s.id === selectedSectionId);
        return section?.incharge || "None assigned";
    }, [sections, selectedSectionId]);

    const handleOpenCreate = () => {
        setEditingMachine(null);
        setSelectedOperators([]);
        setSelectedSectionId("");
        setSelectedSubSectionId("none");
        setModalOpen(true);
    };

    const handleOpenEdit = (machine: any) => {
        setEditingMachine(machine);
        setSelectedOperators(machine.operatorName ? machine.operatorName.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
        setSelectedSectionId(machine.sectionId);
        setSelectedSubSectionId(machine.subSectionId || "none");
        setModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete machine "${name}"?`)) {
            try {
                await deleteFactoryMachine(id);
                loadData();
            } catch (error) {
                alert("Failed to delete machine.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);

        // ensure sectionId is set from state if missing
        if (!formData.get("sectionId") && selectedSectionId) {
            formData.set("sectionId", selectedSectionId);
        }

        if (selectedSubSectionId === "none") {
            formData.set("subSectionId", "");
        } else if (!formData.get("subSectionId") && selectedSubSectionId) {
            formData.set("subSectionId", selectedSubSectionId);
        }

        try {
            if (editingMachine) {
                await updateFactoryMachine(editingMachine.id, formData);
            } else {
                await createFactoryMachine(formData);
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
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 shadow-inner border border-orange-500/20">
                            <Monitor className="w-5 h-5" />
                        </div>
                        Factory Machines
                    </h2>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2 opacity-80">
                        Manage factory machines, work centers, and operator assignments.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="h-11 rounded-xl px-6 font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                    <Plus className="w-4 h-4 mr-2" /> Add Machine
                </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/5 dark:border-white/5 shadow-inner bg-background/30 backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black tracking-widest text-muted-foreground uppercase bg-muted/30 border-b border-black/5 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-5">Machine Number</th>
                                <th className="px-6 py-5">Name</th>
                                <th className="px-6 py-5">Section</th>
                                <th className="px-6 py-5">Operators</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {machines.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No machines found.</td></tr>
                            ) : (
                                machines.map((machine) => (
                                    <tr key={machine.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-5 font-mono text-xs font-bold text-muted-foreground">{machine.machineNumber || <span className="opacity-50">-</span>}</td>
                                        <td className="px-6 py-5 font-bold text-foreground">{machine.name}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-primary/20 shadow-sm">
                                                    {machine.section?.name || "Unknown"}
                                                </span>
                                                {machine.subSection && (
                                                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide border border-border/50">
                                                        ↳ {machine.subSection.name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-2">
                                                {machine.operatorName ? machine.operatorName.split(',').map((name: string) => (
                                                    <span key={name} className="bg-foreground/10 text-foreground px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-black/10 dark:border-white/10 shadow-sm">{name.trim()}</span>
                                                )) : <span className="text-muted-foreground opacity-50">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(machine)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(machine.id, machine.name)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
                <DialogContent className="sm:max-w-md bg-card/70 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-[0_15px_50px_rgb(0,0,0,0.12)] rounded-3xl p-6">
                    <DialogHeader className="pb-4">
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 shadow-inner border border-orange-500/20">
                                {editingMachine ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </div>
                            {editingMachine ? "Edit Machine" : "Add New Machine"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 relative z-[70]">
                                <Label htmlFor="sectionId" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Section <span className="text-red-500">*</span></Label>
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
                            <div className="space-y-2 relative z-[60]">
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
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Machine Name <span className="text-red-500">*</span></Label>
                                <Input id="name" name="name" defaultValue={editingMachine?.name} required placeholder="e.g. CNC Router 1" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="machineNumber" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Machine Number</Label>
                                <Input id="machineNumber" name="machineNumber" defaultValue={editingMachine?.machineNumber} placeholder="e.g. M-001" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium" />
                            </div>
                        </div>
                        <div className="space-y-2 relative z-[60]">
                            <div className="flex justify-between items-end mb-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operator Names</Label>
                                {selectedSectionId && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                                        Incharge: {currentSectionIncharge}
                                    </span>
                                )}
                            </div>
                            <div className="bg-background/50 border border-black/10 dark:border-white/10 shadow-inner rounded-xl">
                                <MultiSelect
                                    options={employeeOptions}
                                    selected={selectedOperators}
                                    onChange={setSelectedOperators}
                                    placeholder="Select operators (filtered by section)..."
                                />
                            </div>
                            <input type="hidden" name="operatorName" value={selectedOperators.join(', ')} />
                        </div>
                        <DialogFooter className="pt-6 border-t border-black/5 dark:border-white/5 gap-3">
                            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="h-11 rounded-xl px-6 font-bold uppercase tracking-wider text-[10px] hover:bg-black/5 dark:hover:bg-white/5">Cancel</Button>
                            <Button type="submit" disabled={submitting} className="h-11 rounded-xl px-8 font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {editingMachine ? "Save Changes" : "Create Machine"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
