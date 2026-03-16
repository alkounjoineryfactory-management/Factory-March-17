"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel
} from "@/components/ui/select";
import { updateMesJobCardDetails } from "@/app/actions/mes";
import { MultiSelect } from "@/components/ui/multi-select";
import { format } from "date-fns";

export default function EditJobCardDialog({ job, open, onOpenChange, sections, employees, machines, users, weeklyPlans, productionOrders }: any) {
    const [submitting, setSubmitting] = useState(false);

    // State initialization from job
    const [selectedItemCode, setSelectedItemCode] = useState<string>("none");
    const [targetQty, setTargetQty] = useState<string>("1");
    const [unit, setUnit] = useState<string>("pcs");
    const [materialsList, setMaterialsList] = useState<string[]>([""]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("none");
    const [selectedMachine, setSelectedMachine] = useState<string>("none");
    const [selectedWeeklyTaskId, setSelectedWeeklyTaskId] = useState<string>("none");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string>("none");
    const [selectedSubSectionId, setSelectedSubSectionId] = useState<string>("none");

    const activeSection = sections?.find((s: any) => s.id === selectedSectionId);

    useEffect(() => {
        if (open && job) {
            setSelectedItemCode(job.itemCode || "none");
            setTargetQty(job.targetQty?.toString() || "1");
            setUnit(job.unit || "pcs");
            setMaterialsList(job.budgetedMaterialList ? job.budgetedMaterialList.split(",").map((s: string) => s.trim()) : [""]);
            setSelectedEmployee(job.employeeId || "none");
            setSelectedMachine(job.machineId || "none");
            setSelectedWeeklyTaskId(job.weeklyTaskId || "none");
            setSelectedUsers(job.assignedTo ? job.assignedTo.split(",").map((s: string) => s.trim()) : []);
            setSelectedSectionId(job.sectionId || "none");

            // Infer subSectionId from employee or machine
            let initialSubSectionId = "none";
            if (job.employeeId && employees) {
                const emp = employees.find((e: any) => e.id === job.employeeId);
                if (emp && emp.subSectionId) initialSubSectionId = emp.subSectionId;
            } else if (job.machineId && machines) {
                const mac = machines.find((m: any) => m.id === job.machineId);
                if (mac && mac.subSectionId) initialSubSectionId = mac.subSectionId;
            }
            setSelectedSubSectionId(initialSubSectionId);
        }
    }, [open, job, employees, machines]);

    const addMaterialRow = () => setMaterialsList([...materialsList, ""]);
    const updateMaterialRow = (index: number, val: string) => {
        const newArr = [...materialsList];
        newArr[index] = val;
        setMaterialsList(newArr);
    };
    const removeMaterialRow = (index: number) => {
        setMaterialsList(materialsList.filter((_, i) => i !== index));
    };

    const productionOrderItems = (productionOrders || []).flatMap((po: any) => po.items || []);
    const allTasks = (weeklyPlans || []).flatMap((p: any) => p.tasks || []);
    const selectedTask = allTasks.find((t: any) => t.id === selectedWeeklyTaskId);
    const taskAssignees = selectedTask?.assignedTo ? selectedTask.assignedTo.split(",").map((s: string) => s.trim()) : [];

    const availableAdminUsers = selectedWeeklyTaskId !== "none" && taskAssignees.length > 0
        ? (users || []).filter((u: any) => taskAssignees.includes(u.name) || taskAssignees.includes(u.username))
        : (users || []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // VALIDATION
        if (!selectedSectionId || selectedSectionId === "none" || selectedSectionId === "") {
            alert("Please select a Section.");
            return;
        }
        if ((!selectedEmployee || selectedEmployee === "none") && (!selectedMachine || selectedMachine === "none")) {
            alert("Please assign at least one Employee or one Machine to this Job Card.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);

            if (selectedWeeklyTaskId !== "none") {
                formData.append("weeklyTaskId", selectedWeeklyTaskId);
            }
            if (selectedUsers.length > 0) {
                formData.set("assignedTo", selectedUsers.join(", "));
            }

            const validMaterials = materialsList.filter((m) => m.trim() !== "");
            if (validMaterials.length > 0) {
                formData.set("budgetedMaterialList", validMaterials.join(", "));
            }

            formData.set("sectionId", selectedSectionId);
            formData.set("employeeId", selectedEmployee);
            formData.set("machineId", selectedMachine);

            await updateMesJobCardDetails(job.id, formData);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert("Failed to update job card");
        } finally {
            setSubmitting(false);
        }
    };

    if (!job) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Edit Job Card</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border">
                        <Label className="text-primary font-semibold">Link to Weekly Phase Task (Optional)</Label>
                        <Select
                            value={selectedWeeklyTaskId}
                            onValueChange={(val) => {
                                setSelectedWeeklyTaskId(val);
                                setSelectedUsers([]);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Standalone Job (No Phase)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Standalone Job (No Phase)</SelectItem>
                                {(weeklyPlans || []).map((plan: any) => (
                                    <SelectGroup key={plan.id}>
                                        <SelectLabel>Phase {plan.weekNumber}</SelectLabel>
                                        {plan.tasks?.map((t: any) => (
                                            <SelectItem key={t.id} value={t.id}>{t.description}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Day</Label>
                            <Input
                                type="date"
                                name="day"
                                required
                                defaultValue={job.day ? format(new Date(job.day), 'yyyy-MM-dd') : ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Section</Label>
                            <Select
                                value={selectedSectionId}
                                onValueChange={(val) => {
                                    setSelectedSectionId(val);
                                    setSelectedSubSectionId("none");
                                }}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select section..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections?.map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input type="hidden" name="sectionId" value={selectedSectionId === "none" ? "" : selectedSectionId} />
                        </div>
                        {activeSection?.subSections && activeSection.subSections.length > 0 && (
                            <div className="space-y-2 col-span-2">
                                <Label>Sub-Section (Optional filter)</Label>
                                <Select
                                    value={selectedSubSectionId}
                                    onValueChange={(val) => {
                                        setSelectedSubSectionId(val);
                                        // clear assignees if they don't match the new sub-section?
                                        // keeping it simple: just update the filter
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Sub-Sections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">All Sub-Sections</SelectItem>
                                        {activeSection.subSections.map((sub: any) => (
                                            <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Task Description / Title</Label>
                        <Input name="description" defaultValue={job.description} placeholder="e.g. Cut 5mm mirror boards" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Extra Details / Instructions</Label>
                        <Input name="extraDetails" defaultValue={job.extraDetails || ''} placeholder="Add specific task requirements, links, or notes..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Item Code</Label>
                            <Select
                                value={selectedItemCode}
                                onValueChange={(val) => {
                                    setSelectedItemCode(val);
                                    if (val !== "none") {
                                        const foundItem = productionOrderItems.find((i: any) => (i.itemCode || i.boqRef || "Unknown") === val);
                                        if (foundItem && foundItem.unit) {
                                            setUnit(foundItem.unit);
                                        }
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Item Code..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Item Code</SelectItem>
                                    {productionOrderItems.map((item: any) => (
                                        <SelectItem key={`${item.itemCode}-${item.boqRef}`} value={item.itemCode || item.boqRef || "Unknown"}>
                                            {item.itemCode} {item.boqRef ? `(${item.boqRef})` : ""} - {item.itemDescription}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input type="hidden" name="itemCode" value={selectedItemCode === "none" ? "" : selectedItemCode} />
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Incharge (Multi-select)</Label>
                            <MultiSelect
                                options={(availableAdminUsers || []).map((u: any) => {
                                    const displayName = u.name || u.username || 'Unknown User';
                                    return { label: displayName, value: displayName };
                                })}
                                selected={selectedUsers}
                                onChange={setSelectedUsers}
                                placeholder="Select assigned admins..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Qty</Label>
                            <Input type="number" name="targetQty" value={targetQty} onChange={(e) => setTargetQty(e.target.value)} required />
                            {selectedItemCode && selectedItemCode !== "none" && (
                                (() => {
                                    const selectedPoItem = productionOrderItems.find((i: any) => (i.itemCode || i.boqRef || "Unknown") === selectedItemCode);
                                    if (selectedPoItem && selectedPoItem.qty !== undefined && selectedPoItem.qty !== null) {
                                        return (
                                            <div className="text-[10px] text-red-500 font-medium leading-tight">
                                                BOQ Target Qty: {selectedPoItem.qty} {selectedPoItem.unit || ''}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Unit</Label>
                            <Input name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} required />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Budgeted Labour Hrs</Label>
                            <Input type="number" step="0.5" name="budgetedLabourHrs" defaultValue={job.budgetedLabourHrs || 0} />
                            {selectedItemCode && selectedItemCode !== "none" && (
                                (() => {
                                    const selectedPoItem = productionOrderItems.find((i: any) => (i.itemCode || i.boqRef || "Unknown") === selectedItemCode);
                                    if (selectedPoItem && (selectedPoItem.carpentryLabourHrs > 0 || selectedPoItem.polishLabourHrs > 0)) {
                                        return (
                                            <div className="text-[10px] text-red-500 font-medium leading-tight">
                                                Estimations: {selectedPoItem.carpentryLabourHrs > 0 ? `Carpentry ${selectedPoItem.carpentryLabourHrs}h` : ""}
                                                {selectedPoItem.carpentryLabourHrs > 0 && selectedPoItem.polishLabourHrs > 0 ? " | " : ""}
                                                {selectedPoItem.polishLabourHrs > 0 ? `Polish ${selectedPoItem.polishLabourHrs}h` : ""}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Budgeted Material List</Label>
                        {materialsList.map((mat, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <Input
                                    value={mat}
                                    onChange={(e) => updateMaterialRow(idx, e.target.value)}
                                    placeholder={idx === 0 ? "e.g. 2x Wood Panels" : "Add another material..."}
                                />
                                {materialsList.length > 1 && (
                                    <Button type="button" variant="outline" size="icon" onClick={() => removeMaterialRow(idx)} className="shrink-0 text-destructive hover:text-destructive">
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addMaterialRow} className="mt-1">
                            <Plus className="w-4 h-4 mr-2" /> Add Material
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Assign Employee</Label>
                            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {(employees || []).filter((e: any) => {
                                        if (selectedSectionId && selectedSectionId !== 'none' && e.sectionId !== selectedSectionId) return false;
                                        if (selectedSubSectionId !== "none" && e.subSectionId !== selectedSubSectionId) return false;
                                        return true;
                                    }).map((e: any) => (
                                        <SelectItem key={e.id} value={e.id}>{`${e.employeeCode ? '[' + e.employeeCode + '] ' : ''}${e.name}`.trim()}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Machine</Label>
                            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select machine..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {(machines || []).filter((m: any) => {
                                        if (selectedSectionId && selectedSectionId !== 'none' && m.sectionId !== selectedSectionId) return false;
                                        if (selectedSubSectionId !== "none" && m.subSectionId !== selectedSubSectionId) return false;
                                        return true;
                                    }).map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>{m.operatorName ? `${m.name} (${m.operatorName})` : m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-indigo-600 dark:bg-indigo-500 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600">
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
