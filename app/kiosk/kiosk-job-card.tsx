"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startJob, finishJob } from "../actions";
import { Play, CheckSquare, Clock, Box, PlayCircle, StopCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobCardProps {
    job: any; // Type this properly if sharing types
    systemSettings?: any;
}

export default function KioskJobCard({ job, systemSettings }: JobCardProps) {
    const [status, setStatus] = useState(job.status);
    const [startTime, setStartTime] = useState<Date | null>(job.startedAt ? new Date(job.startedAt) : null);
    const [elapsed, setElapsed] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Timer Effect
    useEffect(() => {
        const updateTimer = () => {
            if (status === "IN_PROGRESS" && startTime) {
                const now = new Date();
                const diff = now.getTime() - startTime.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setElapsed(`${hours}h ${minutes}m`);
            }
        };

        updateTimer(); // Initial call
        const interval = setInterval(updateTimer, 60000); // Every minute

        return () => clearInterval(interval);
    }, [status, startTime]);

    async function handleStart() {
        setLoading(true);
        await startJob(job.id);
        setStatus("IN_PROGRESS");
        setStartTime(new Date());
        setLoading(false);
    }

    async function handleFinish(formData: FormData) {
        setLoading(true);
        const actualQty = parseInt(formData.get("actualQty") as string);
        const isFinished = formData.get("isFinished") === "on";

        await finishJob(job.id, actualQty, isFinished);
        setIsDialogOpen(false);
        setLoading(false);

        if (isFinished) setStatus("COMPLETED");
        else setStatus("PENDING");
    }

    if (status === "COMPLETED") return null;

    const isWorking = status === "IN_PROGRESS";

    return (
        <Card className={cn(
            "border-0 shadow-lg transition-all duration-300 overflow-hidden relative",
            isWorking ? "bg-indigo-950/40 ring-2 ring-indigo-500/50" : "bg-slate-900 border-slate-800"
        )}>
            {/* Progress Bar Background */}
            <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full z-0">
                <div
                    className={cn("h-full transition-all duration-1000", isWorking ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]" : "bg-slate-600")}
                    style={{ width: `${Math.min(100, ((job.actualQty || 0) / job.targetQty) * 100)}%` }}
                ></div>
            </div>

            <CardHeader className="pb-3 relative z-10 pt-6">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-700 bg-slate-950/50">
                        {job.project.name}
                    </Badge>
                    <div className="flex gap-2 flex-wrap justify-end">
                        {job.weeklyPlan && (
                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 text-[10px]">
                                Phase {job.weeklyPlan.weekNumber}
                            </Badge>
                        )}
                        {job.machine && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                                {job.machine.name}
                            </Badge>
                        )}
                        <Badge className={cn(
                            "border-0 text-[10px]",
                            isWorking ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] animate-pulse" : "bg-slate-800 text-slate-400"
                        )}>
                            {isWorking ? "IN PROGRESS" : "READY"}
                        </Badge>
                    </div>
                </div>
                <CardTitle className="text-xl text-slate-100 leading-tight">{job.description}</CardTitle>
                <CardDescription className="flex gap-2 mt-3 flex-wrap">
                    <span className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50 text-xs">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {isWorking && elapsed ? <span className="text-indigo-300 font-bold">{elapsed}</span> : <span className="text-slate-300">{job.targetHours}h Target</span>}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50 text-xs">
                        <Box className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-slate-300">{job.actualQty || 0} / <span className="font-semibold text-white">{job.targetQty}</span> {job.unit}</span>
                    </span>
                    {job.itemCode && (
                        <span className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded border border-amber-500/20 text-xs text-amber-400 font-mono">
                            {job.itemCode}
                        </span>
                    )}
                </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 pb-4 space-y-2 mt-2">
                {(job.assignToIncharge || job.assignedTo) && (
                    <div className="flex gap-2 items-center bg-slate-950/50 p-2.5 rounded border border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-20 shrink-0">Incharge</span>
                        <span className="text-sm text-slate-300 font-medium truncate">{job.assignToIncharge || job.assignedTo}</span>
                    </div>
                )}

                {job.budgetedMaterialList && (
                    <div className="flex flex-col gap-1 bg-slate-950/50 p-2.5 rounded border border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Required Materials</span>
                        <span className="text-sm text-slate-300">{job.budgetedMaterialList}</span>
                    </div>
                )}

                {job.extraDetails && (
                    <div className="flex flex-col gap-1 bg-slate-950/50 p-2.5 rounded border border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Instructions</span>
                        <span className="text-sm text-slate-300 italic">"{job.extraDetails}"</span>
                    </div>
                )}
                
                {systemSettings && systemSettings.kioskJobStartEndEnabled === false && (
                     <div className="flex items-center gap-2 mt-4 bg-red-950/30 text-red-400 p-2.5 rounded text-xs border border-red-900/50">
                         Job actions are currently disabled by the Factory Administrator.
                     </div>
                )}
            </CardContent>

            <CardFooter className="pt-0 pb-5 relative z-10">
                {!isWorking ? (
                    <Button
                        className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_4px_20px_rgba(79,70,229,0.25)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleStart}
                        disabled={loading || (systemSettings && systemSettings.kioskJobStartEndEnabled === false)}
                    >
                        {loading ? "Starting..." : <><PlayCircle className="mr-2 w-6 h-6" /> START JOB</>}
                    </Button>
                ) : (
                    <Button
                        className="w-full h-14 text-lg font-bold bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setIsDialogOpen(true)}
                        disabled={loading || (systemSettings && systemSettings.kioskJobStartEndEnabled === false)}
                    >
                        <CheckCircle2 className="mr-2 w-6 h-6" /> FINISH / LOG
                    </Button>
                )}
            </CardFooter>

            {/* FINISH DIALOG (Dark Mode) */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-white">Log Progress</DialogTitle>
                    </DialogHeader>
                    <form action={handleFinish} className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label className="text-lg text-slate-300">Quantity Completed Now</Label>
                            <Input
                                name="actualQty"
                                type="number"
                                defaultValue={job.targetQty - (job.actualQty || 0)}
                                className="h-16 text-3xl font-mono text-center bg-slate-950 border-slate-800 text-white focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                        <div className="flex items-center space-x-3 bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                            <input type="checkbox" id="isFinished" name="isFinished" className="w-6 h-6 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900" />
                            <Label htmlFor="isFinished" className="text-lg font-medium cursor-pointer">Mark Job as Complete?</Label>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</Button>
                            <Button type="submit" disabled={loading} className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                {loading ? "Saving..." : "Confirm & Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
