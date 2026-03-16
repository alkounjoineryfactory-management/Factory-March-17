"use client";

import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// This component handles the "Quick Assignment" (aka Create Job Card) logic.
// It directly calls `createJobCard` server action.

import { createJobCard, createWeeklyPlan } from "@/app/actions";
// import { toast } from "sonner"; // Removed as not confirmed
import { CalendarIcon, User, Layers, Hammer, Briefcase, Hash, Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// ... (interfaces)
interface Machine {
    id: string;
    name: string;
    sectionId: string;
}

interface Employee {
    id: string;
    name: string;
    role: string;
    sectionId: string;
}

interface Section {
    id: string;
    name: string;
    machines: Machine[];
    employees: Employee[];
}

interface WeeklyPlan {
    id: string;
    weekNumber: number;
    title: string | null;
    projectId: string;
}

export default function JobScheduler({
    projectId,
    sections,
    weeklyPlans
}: {
    projectId: string;
    sections: Section[];
    weeklyPlans: WeeklyPlan[];
}) {
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedWeek, setSelectedWeek] = useState<string>("");
    const [isWeekDialogOpen, setIsWeekDialogOpen] = useState(false);

    // Multi-Select State
    const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [isMachineOpen, setIsMachineOpen] = useState(false);
    const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);

    const router = useRouter();

    const selectedSection = sections.find(s => s.id === selectedSectionId);
    const availableMachines = selectedSection?.machines || [];
    const availableEmployees = selectedSection?.employees || [];

    // Reset selections on section change
    const handleSectionChange = (val: string) => {
        setSelectedSectionId(val);
        setSelectedMachineIds([]);
        setSelectedEmployeeIds([]);
    }

    const toggleMachine = (id: string) => {
        if (selectedMachineIds.includes(id)) {
            setSelectedMachineIds(prev => prev.filter(m => m !== id));
        } else {
            setSelectedMachineIds(prev => [...prev, id]);
        }
    }

    const toggleEmployee = (id: string) => {
        if (selectedEmployeeIds.includes(id)) {
            setSelectedEmployeeIds(prev => prev.filter(e => e !== id));
        } else {
            setSelectedEmployeeIds(prev => [...prev, id]);
        }
    }

    return (
        <Card className="border-t-4 border-t-purple-500">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daily Assignment Scheduler</CardTitle>
                <Dialog open={isWeekDialogOpen} onOpenChange={setIsWeekDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">+ New Weekly Plan</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Weekly Plan</DialogTitle>
                        </DialogHeader>
                        <form action={async (formData) => {
                            await createWeeklyPlan(formData);
                            setIsWeekDialogOpen(false);
                        }} className="space-y-4">
                            <input type="hidden" name="projectId" value={projectId} />
                            <div className="space-y-2">
                                <Label>Week Number</Label>
                                <Input type="number" name="weekNumber" required placeholder="e.g. 1" />
                            </div>
                            <div className="space-y-2">
                                <Label>Title (Optional)</Label>
                                <Input name="title" placeholder="e.g. Cutting Phase" />
                            </div>
                            <Button type="submit" className="w-full">Create Plan</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <form action={async (formData) => {
                    await createJobCard(formData);
                    // Reset or show success
                    setSelectedMachineIds([]);
                    setSelectedEmployeeIds([]);
                    router.refresh();
                }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* Hidden Inputs for List Submission */}
                    {selectedMachineIds.map(id => <input key={`m-${id}`} type="hidden" name="machineIds" value={id} />)}
                    {selectedEmployeeIds.map(id => <input key={`e-${id}`} type="hidden" name="employeeIds" value={id} />)}

                    {/* Left Column */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Weekly Plan</Label>
                            <Select name="weeklyPlanId" onValueChange={setSelectedWeek}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign to Week (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {weeklyPlans.length === 0 ? (
                                        <SelectItem value="none" disabled>No Weekly Plans Created</SelectItem>
                                    ) : (
                                        weeklyPlans.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                Week {w.weekNumber}: {w.title || "Untitled"}
                                            </SelectItem>
                                        ))
                                    )}
                                    <SelectItem value="none">No Week (Ad-hoc)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Section</Label>
                            <Select name="sectionId" onValueChange={handleSectionChange} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label className="mb-2">Select Machine(s)</Label>
                            <Popover open={isMachineOpen} onOpenChange={setIsMachineOpen}>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" role="combobox" aria-expanded={isMachineOpen} className="justify-between font-normal" disabled={!selectedSectionId}>
                                        {selectedMachineIds.length > 0
                                            ? `${selectedMachineIds.length} Machine(s) Selected`
                                            : "Select Machines"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search machine..." />
                                        <CommandList>
                                            <CommandEmpty>No machine found.</CommandEmpty>
                                            <CommandGroup>
                                                {availableMachines.map((machine) => (
                                                    <CommandItem
                                                        key={machine.id}
                                                        value={machine.name}
                                                        onSelect={() => {
                                                            toggleMachine(machine.id);
                                                        }}
                                                        className="cursor-pointer"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4 pointer-events-none",
                                                                selectedMachineIds.includes(machine.id) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {machine.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label className="mb-2">
                                {selectedMachineIds.length > 0 ? "Assign Operator(s) *" : "Assign Employee(s)"}
                            </Label>
                            <Popover open={isEmployeeOpen} onOpenChange={setIsEmployeeOpen}>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" role="combobox" aria-expanded={isEmployeeOpen}
                                        className={`justify-between font-normal ${selectedMachineIds.length > 0 && selectedEmployeeIds.length === 0 ? "border-red-500 text-red-500" : ""}`}
                                        disabled={!selectedSectionId}>
                                        {selectedEmployeeIds.length > 0
                                            ? `${selectedEmployeeIds.length} Operator(s) Selected`
                                            : (selectedMachineIds.length > 0 ? "Select Operator (Required)" : "Select Employees")}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search employee..." />
                                        <CommandList>
                                            <CommandEmpty>No employee found.</CommandEmpty>
                                            <CommandGroup>
                                                {availableEmployees.map((employee) => (
                                                    <CommandItem
                                                        key={employee.id}
                                                        value={employee.name}
                                                        onSelect={() => toggleEmployee(employee.id)}
                                                        className="cursor-pointer"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4 pointer-events-none",
                                                                selectedEmployeeIds.includes(employee.id) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {employee.name} ({employee.role})
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedMachineIds.length > 0 && selectedEmployeeIds.length === 0 && (
                                <p className="text-xs text-red-500">
                                    * An operator is required when a machine is selected.
                                </p>
                            )}
                        </div>

                        {/* Summary Text for Bulk Assignment */}
                        {(selectedSectionId && (selectedEmployeeIds.length > 0 || selectedMachineIds.length > 0)) && (
                            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded border border-blue-100 flex items-center gap-2">
                                <span className="font-bold">Summary:</span>
                                <div>
                                    Creating <span className="font-bold">
                                        {Math.max(1, selectedEmployeeIds.length) * Math.max(1, selectedMachineIds.length)}
                                    </span> Job Cards.
                                    {selectedEmployeeIds.length > 0 && ` (${selectedEmployeeIds.length} Employees)`}
                                    {selectedMachineIds.length > 0 && ` (${selectedMachineIds.length} Machines)`}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Task Description</Label>
                            <Textarea name="description" required placeholder="Describe the daily assignment..." />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Target Date</Label>
                                <Input type="date" name="targetDate" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Target Hours</Label>
                                <Input type="number" name="targetHours" step="0.5" placeholder="e.g. 8.0" />
                            </div>
                            <div className="space-y-2">
                                <Label>Target Qty</Label>
                                <Input type="number" name="targetQty" placeholder="e.g. 100" defaultValue="1" />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Button type="submit" className="w-full md:w-auto">Create Assignments</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
