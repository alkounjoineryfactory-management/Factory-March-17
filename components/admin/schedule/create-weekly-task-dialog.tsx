"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMesWeeklyTask } from "@/app/actions/mes";
import { MultiSelect } from "@/components/ui/multi-select";

export default function CreateWeeklyTaskDialog({ open, onOpenChange, projectId, weekNum, sections, users }: any) {
    const [submitting, setSubmitting] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string>("none");
    const [selectedSubSectionId, setSelectedSubSectionId] = useState<string>("none");

    const currentSection = selectedSectionId !== "none" ? sections?.find((s: any) => s.id === selectedSectionId) : null;
    const allowedUserNames = new Set<string>();
    if (currentSection) {
        if (currentSection.incharges) {
            currentSection.incharges.forEach((u: any) => allowedUserNames.add(u.name || u.username));
        }
        if (currentSection.foremen) {
            currentSection.foremen.forEach((u: any) => allowedUserNames.add(u.name || u.username));
        }
    }

    const availableUsers = currentSection
        ? (users || []).filter((u: any) => allowedUserNames.has(u.name) || allowedUserNames.has(u.username))
        : (users || []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);
            formData.append("projectId", projectId);
            if (selectedUsers.length > 0) {
                formData.set("assignedTo", selectedUsers.join(", "));
            }
            if (selectedSubSectionId !== "none") {
                formData.set("subSectionId", selectedSubSectionId);
            }
            await createMesWeeklyTask(formData);
            onOpenChange(false);
            setSelectedUsers([]); // reset state
            setSelectedSectionId("none"); // reset state
            setSelectedSubSectionId("none"); // reset state
        } catch (error) {
            console.error(error);
            alert("Failed to create weekly task");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Weekly Schedule</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Week / Phase Number</Label>
                            <Input type="number" name="weekNumber" required placeholder="e.g. 1" min={1} />
                        </div>
                        <div className="space-y-2">
                            <Label>Section</Label>
                            <select
                                name="sectionId"
                                value={selectedSectionId}
                                onChange={(e) => {
                                    const newSectionId = e.target.value;
                                    setSelectedSectionId(newSectionId);
                                    setSelectedSubSectionId("none"); // reset subsection
                                    
                                    const newSection = newSectionId !== "none" ? sections?.find((s: any) => s.id === newSectionId) : null;
                                    const defaultUsers = new Set<string>();
                                    if (newSection) {
                                        if (newSection.incharges) newSection.incharges.forEach((u: any) => defaultUsers.add(u.name || u.username));
                                        if (newSection.foremen) newSection.foremen.forEach((u: any) => defaultUsers.add(u.name || u.username));
                                    }
                                    setSelectedUsers(Array.from(defaultUsers));
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="none">No Section</option>
                                {sections?.map((sec: any) => (
                                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground -mt-4">Assign this task to a custom phase and optionally link it to a section.</p>

                    {currentSection && currentSection.subSections && currentSection.subSections.length > 0 && (
                        <div className="space-y-2">
                            <Label>Sub-Section <span className="text-muted-foreground font-normal lowercase">(Optional)</span></Label>
                            <select
                                name="subSectionId"
                                value={selectedSubSectionId}
                                onChange={(e) => {
                                    setSelectedSubSectionId(e.target.value);
                                    setSelectedUsers([]); // clear selected users
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="none">All Sub-Sections</option>
                                {currentSection.subSections.map((sub: any) => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Task Title / Description</Label>
                        <Input name="description" placeholder="e.g. Complete Phase 1 Assembly" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Assigned To</Label>
                        <MultiSelect
                            options={availableUsers.map((u: any) => {
                                const displayName = u.name || u.username || 'Unknown User';
                                return { label: displayName, value: displayName };
                            })}
                            selected={selectedUsers}
                            onChange={setSelectedUsers}
                            placeholder="Select users..."
                        />
                        <p className="text-[10px] text-muted-foreground">Select one or more administrative users to assign to this task.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" name="startDate" />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input type="date" name="endDate" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium">
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Create Task
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
