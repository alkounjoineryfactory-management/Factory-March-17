"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import KioskJobCard from "./kiosk-job-card";
import { Filter, CalendarIcon } from "lucide-react";

interface Machine {
    id: string;
    name: string;
}

interface Employee {
    id: string;
    name: string;
    sectionId: string;
}

interface Project {
    name: string;
    client: string | null;
}

interface JobCard {
    id: string;
    projectId: string;
    description: string;
    status: string;
    targetHours: number;
    targetQty: number;
    machineId: string | null;
    sectionId: string;
    project: Project;
    employeeId: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
}

export default function KioskClient({
    machines,
    employees,
    initialJobs,
    systemSettings,
    selectedDateStr
}: {
    machines: Machine[],
    employees: Employee[],
    initialJobs: JobCard[],
    systemSettings?: any,
    selectedDateStr?: string
}) {
    const [selectedMachineId, setSelectedMachineId] = useState<string>("all");
    const [date, setDate] = useState<Date | undefined>(() => {
        if (!selectedDateStr) return new Date();
        const [year, month, day] = selectedDateStr.split("-").map(Number);
        return new Date(year, month - 1, day);
    });
    const router = useRouter();

    // Auto-refresh every 30 seconds to fetch new assignments
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 30000);

        return () => clearInterval(interval);
    }, [router]);

    // Update URL when date changes
    useEffect(() => {
        if (date) {
            // Compare normalized dates to avoid pushing the same URL repeatedly
            const newDateStr = format(date, "yyyy-MM-dd");
            const currentDateStr = selectedDateStr || format(new Date(), "yyyy-MM-dd");
            
            if (newDateStr !== currentDateStr) {
                router.push(`/kiosk?date=${newDateStr}`);
            }
        }
    }, [date, router, selectedDateStr]);

    const filteredJobs = selectedMachineId === "all"
        ? initialJobs
        : initialJobs.filter(j => j.machineId === selectedMachineId);

    const activeJobs = filteredJobs.filter(j => j.status !== "COMPLETED");

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm gap-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <Filter className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium hidden sm:inline">Filters:</span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Date Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={`w-full sm:w-[220px] h-11 justify-start text-left font-normal bg-slate-950 border-slate-700 hover:bg-slate-800 hover:text-slate-200 ${!date ? "text-muted-foreground" : "text-slate-200"}`}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-400" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-950 border-slate-800" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                className="bg-slate-950 text-slate-200"
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Machine Select */}
                    <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                        <SelectTrigger className="w-full sm:w-[220px] h-11 bg-slate-950 border-slate-700 text-slate-200">
                            <SelectValue placeholder="All Machines" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                            <SelectItem value="all">View All Assigned</SelectItem>
                            {machines.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeJobs.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600">
                        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                            <span className="text-4xl">🎉</span>
                        </div>
                        <div className="text-xl font-medium text-slate-400">All Caught Up!</div>
                        <p className="mt-2 text-sm">No pending jobs for this station right now.</p>
                    </div>
                ) : (
                    activeJobs.map((job) => (
                        <KioskJobCard key={job.id} job={job} systemSettings={systemSettings} />
                    ))
                )}
            </div>
        </div>
    );
}
