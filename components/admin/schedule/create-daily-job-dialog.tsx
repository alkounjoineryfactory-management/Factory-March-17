"use client";

import React, { useState } from "react";
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
import { createMesDailyJob } from "@/app/actions/mes";
import { MultiSelect } from "@/components/ui/multi-select";

export default function CreateDailyJobDialog({ open, onOpenChange, projectId, sections, employees, machines, users, weeklyPlans, productionOrders, currentDate, employeesOnLeave = [], allApprovedLeaves = [], allApprovedMaintenances = [] }: any) {
    const [submitting, setSubmitting] = useState(false);
    const [selectedItemCode, setSelectedItemCode] = useState<string>("");
    const [targetQty, setTargetQty] = useState<string>("1");
    const [unit, setUnit] = useState<string>("pcs");
    const [materialsList, setMaterialsList] = useState<string[]>([""]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [selectedMachines, setSelectedMachines] = useState<string[]>([]);

    const addMaterialRow = () => setMaterialsList([...materialsList, ""]);
    const updateMaterialRow = (index: number, val: string) => {
        const newArr = [...materialsList];
        newArr[index] = val;
        setMaterialsList(newArr);
    };
    const removeMaterialRow = (index: number) => {
        setMaterialsList(materialsList.filter((_, i) => i !== index));
    };

    const [selectedDay, setSelectedDay] = useState<string>(currentDate || "");

    React.useEffect(() => {
        if (open) {
            setSelectedDay(currentDate || "");
        }
    }, [open, currentDate]);

    const dynamicEmployeesOnLeave = React.useMemo(() => {
        if (!selectedDay) return employeesOnLeave;
        const targetDateStart = new Date(`${selectedDay}T00:00:00.000Z`);
        const targetDateEnd = new Date(targetDateStart.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);

        return allApprovedLeaves.filter((l: any) => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            return start <= targetDateEnd && end >= targetDateStart;
        }).map((l: any) => l.employeeId);
    }, [selectedDay, allApprovedLeaves, employeesOnLeave]);

    const dynamicMachinesOnMaintenance = React.useMemo(() => {
        if (!selectedDay) return [];
        const targetDateStart = new Date(`${selectedDay}T00:00:00.000Z`);
        const targetDateEnd = new Date(targetDateStart.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);

        return allApprovedMaintenances.filter((m: any) => {
            const start = new Date(m.startDate);
            const end = new Date(m.endDate);
            return start <= targetDateEnd && end >= targetDateStart;
        }).map((m: any) => m.machineId);
    }, [selectedDay, allApprovedMaintenances]);

    const productionOrderItems = (productionOrders || []).flatMap((po: any) => po.items || []);
    const [selectedWeeklyTaskId, setSelectedWeeklyTaskId] = useState<string>("none");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedSubSectionId, setSelectedSubSectionId] = useState<string>("none");

    const activeSection = React.useMemo(() => sections?.find((s: any) => s.id === selectedSectionId), [sections, selectedSectionId]);

    const allTasks = (weeklyPlans || []).flatMap((p: any) => p.tasks || []);
    const selectedTask = allTasks.find((t: any) => t.id === selectedWeeklyTaskId);

    // Sync section ID and sub-section ID when a task is selected
    React.useEffect(() => {
        if (selectedTask?.sectionId) {
            setSelectedSectionId(selectedTask.sectionId);
            if (selectedTask.subSection?.id) {
                setSelectedSubSectionId(selectedTask.subSection.id);
            } else if (selectedTask.subSectionId) {
                // Fallback depending on what Prisma returned
                setSelectedSubSectionId(selectedTask.subSectionId);
            } else {
                setSelectedSubSectionId("none");
            }
        }
    }, [selectedWeeklyTaskId, selectedTask]);

    const taskAssignees = selectedTask?.assignedTo ? selectedTask.assignedTo.split(",").map((s: string) => s.trim()) : [];

    // If a task is selected and it has assignees, show those. Else show all.
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

        if (selectedEmployees.length === 0 && selectedMachines.length === 0) {
            alert("Please assign at least one Employee or one Machine to this Job Card.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);
            formData.append("projectId", projectId);
            if (selectedWeeklyTaskId !== "none") {
                formData.append("weeklyTaskId", selectedWeeklyTaskId);
            }
            if (selectedUsers.length > 0) {
                formData.set("assignedTo", selectedUsers.join(", "));
            }

            // Combine materials list
            const validMaterials = materialsList.filter((m) => m.trim() !== "");
            if (validMaterials.length > 0) {
                formData.set("budgetedMaterialList", validMaterials.join(", "));
            }

            formData.set("sectionId", selectedSectionId); // Ensure sectionId is passed since it's controlled
            if (selectedEmployees.length > 0) {
                formData.set("employeeIds", selectedEmployees.join(","));
            }
            if (selectedMachines.length > 0) {
                formData.set("machineIds", selectedMachines.join(","));
            }

            await createMesDailyJob(formData);
            setSelectedWeeklyTaskId("none");
            setSelectedUsers([]);
            setSelectedSectionId("");
            setSelectedEmployees([]);
            setSelectedMachines([]);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert("Failed to create job card");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Create Daily Task</DialogTitle>
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
                        <p className="text-[10px] text-muted-foreground mt-1 text-right">Selecting a task will auto-fill your section and description.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Day</Label>
                            <Input type="date" name="day" required value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Section</Label>
                            <Select
                                value={selectedSectionId || undefined}
                                onValueChange={(val) => {
                                    setSelectedSectionId(val);
                                    setSelectedSubSectionId("none");
                                    setSelectedEmployees([]);
                                    setSelectedMachines([]);
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
                            <input type="hidden" name="sectionId" value={selectedSectionId} />
                        </div>
                        {activeSection?.subSections && activeSection.subSections.length > 0 && (
                            <div className="space-y-2 col-span-2">
                                <Label>Sub-Section (Optional filter)</Label>
                                <Select
                                    value={selectedSubSectionId}
                                    onValueChange={(val) => {
                                        setSelectedSubSectionId(val);
                                        setSelectedEmployees([]);
                                        setSelectedMachines([]);
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
                        <Input name="description" defaultValue={selectedTask?.description || ""} placeholder="e.g. Cut 5mm mirror boards" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Extra Details / Instructions</Label>
                        <Input name="extraDetails" placeholder="Add specific task requirements, links, or notes..." />
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
                                        if (foundItem) {
                                            if (foundItem.unit) setUnit(foundItem.unit);
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
                            <Label>Assign Admins (Multi-select)</Label>
                            <MultiSelect
                                options={(availableAdminUsers || []).map((u: any) => {
                                    const displayName = u.name || u.username || 'Unknown User';
                                    return { label: displayName, value: displayName };
                                })}
                                selected={selectedUsers}
                                onChange={setSelectedUsers}
                                placeholder="Select assigned admins..."
                            />
                            {selectedWeeklyTaskId !== "none" && taskAssignees.length > 0 && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Filtered to users assigned to this phase task.</p>
                            )}
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
                            <Input type="number" step="0.5" name="budgetedLabourHrs" defaultValue="0" />
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
                        <div className="space-y-2">
                            <Label>Target (Allowed) Hrs</Label>
                            <Input type="number" step="0.5" name="targetHours" defaultValue="0" />
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
                            <Label>Assign Employee(s)</Label>
                            <MultiSelect
                                key={`emp-${selectedSectionId}-${selectedSubSectionId}-${selectedDay}`}
                                options={(employees || []).filter((e: any) => {
                                    if (selectedSectionId && e.sectionId !== selectedSectionId) return false;
                                    if (selectedSubSectionId !== "none" && e.subSectionId !== selectedSubSectionId) return false;
                                    return true;
                                }).map((e: any) => ({
                                    label: `${e.employeeCode ? '[' + e.employeeCode + '] ' : ''}${e.name} ${dynamicEmployeesOnLeave.includes(e.id) ? '(On Leave)' : ''}`.trim(),
                                    value: e.id,
                                    disabled: dynamicEmployeesOnLeave.includes(e.id)
                                }))}
                                selected={selectedEmployees}
                                onChange={setSelectedEmployees}
                                placeholder="Select employee(s)..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Machine(s)</Label>
                            <MultiSelect
                                key={`mac-${selectedSectionId}-${selectedSubSectionId}-${selectedDay}`}
                                options={(machines || []).filter((m: any) => {
                                    if (selectedSectionId && m.sectionId !== selectedSectionId) return false;
                                    if (selectedSubSectionId !== "none" && m.subSectionId !== selectedSubSectionId) return false;
                                    return true;
                                }).map((m: any) => ({
                                    label: `${m.operatorName ? `${m.name} (${m.operatorName})` : m.name} ${dynamicMachinesOnMaintenance.includes(m.id) ? '(Maintenance)' : ''}`,
                                    value: m.id,
                                    disabled: dynamicMachinesOnMaintenance.includes(m.id)
                                }))}
                                selected={selectedMachines}
                                onChange={setSelectedMachines}
                                placeholder="Select machine(s)..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-indigo-600 dark:bg-indigo-500 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600">
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Create Job Card
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
