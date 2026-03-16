"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PackageSearch, FolderTree, ArrowDownToLine, Factory, CheckCircle2 } from "lucide-react";
import { getStoreItemProjectBreakdown, getProjectsForDropdown } from "@/app/actions/store";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logManualFactoryConsumption } from "@/app/actions/store-consumption";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface StoreItemProjectBreakdownModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: any | null;
}
export function StoreItemProjectBreakdownModal({ open, onOpenChange, item }: StoreItemProjectBreakdownModalProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [breakdown, setBreakdown] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);

    // Consumption UI State
    const [isConsuming, setIsConsuming] = useState(false);
    const [consumeData, setConsumeData] = useState<{ projectId: string, projectName: string, maxQty: number }>({ projectId: "", projectName: "", maxQty: 0 });
    const [consumeQty, setConsumeQty] = useState("");
    const [consumeReference, setConsumeReference] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            fetchProjects();
        } else {
            setBreakdown([]);
            setSelectedProjectId("");
        }
    }, [open]);

    useEffect(() => {
        if (open && item && selectedProjectId) {
            fetchBreakdown();
        } else if (!selectedProjectId) {
            setBreakdown([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProjectId, item]);

    const fetchProjects = async () => {
        setIsLoadingProjects(true);
        try {
            const res = await getProjectsForDropdown();
            if (res.success && res.projects) {
                setProjects(res.projects);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const fetchBreakdown = async () => {
        setIsLoading(true);
        try {
            const res = await getStoreItemProjectBreakdown(selectedProjectId, item.itemCode, item.name);
            if (res.success && res.breakdown) {
                setBreakdown(res.breakdown);
            }
        } catch (error) {
            console.error("Failed to fetch breakdown:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenConsume = (data: any, remainingQty: number) => {
        setConsumeData({
            projectId: data.projectId,
            projectName: data.projectName,
            maxQty: remainingQty
        });
        setConsumeQty("");
        setConsumeReference("");
        setIsConsuming(true);
    };

    const handleSubmitConsume = async () => {
        const qty = parseFloat(consumeQty);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Please enter a valid positive quantity.");
            return;
        }
        if (qty > consumeData.maxQty) {
            toast.error(`Cannot consume more than the available Project Stock (${consumeData.maxQty}).`);
            return;
        }

        setIsSubmitting(true);
        const res = await logManualFactoryConsumption({
            storeItemId: item.id,
            projectId: consumeData.projectId,
            quantity: qty,
            reference: consumeReference
        });

        if (res.success) {
            toast.success("Manual factory consumption logged successfully.");
            setIsConsuming(false);
            fetchBreakdown(); // Refresh the table
        } else {
            toast.error(res.error || "Failed to log consumption.");
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border-white/10">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <PackageSearch className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span>Project Breakdown Tracker</span>
                            <span className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs shadow-sm bg-background/50 border-input">{item?.itemCode || 'Unknown Code'}</Badge>
                                {item?.name}
                            </span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="px-1 mt-6">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoadingProjects}>
                        <SelectTrigger className="w-full bg-background/50 border-border/50 h-12 rounded-xl text-base shadow-sm">
                            <SelectValue placeholder={isLoadingProjects ? "Loading active projects..." : "Select a project to view its breakdown..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {projects.map((proj) => (
                                <SelectItem key={proj.id} value={proj.id} className="py-3">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{proj.name}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{proj.projectNumber || 'No Code'}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 mt-6 space-y-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-28 w-full rounded-2xl bg-muted/40" />
                            ))}
                        </div>
                    ) : !selectedProjectId ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/50">
                            <FolderTree className="h-10 w-10 mb-4 opacity-30" />
                            <p className="text-sm font-medium">No project selected.</p>
                            <p className="text-xs mt-1 max-w-sm text-center">Please select a project from the dropdown above to calculate the consumption tracker.</p>
                        </div>
                    ) : breakdown.length === 0 || breakdown[0].requestedQty === 0 && breakdown[0].orderedQty === 0 && breakdown[0].deliveredQty === 0 && breakdown[0].usedQty === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/50">
                            <PackageSearch className="h-10 w-10 mb-4 opacity-30" />
                            <p className="text-sm font-medium">No activity found for this project.</p>
                            <p className="text-xs mt-1 max-w-sm text-center">This material hasn&apos;t been requested, ordered, or consumed actively in the selected project yet.</p>
                        </div>
                    ) : (
                        breakdown.map((data, idx) => {
                            // Enforce strict definition: True Project Stock = Delivered + Transferred
                            const strictTrueProjectStock = data.deliveredQty + data.netTransfers;
                            const remainingQty = strictTrueProjectStock - data.usedQty;

                            return (
                                <div key={idx} className="relative group p-5 rounded-2xl border border-white/5 dark:border-white/5 bg-gradient-to-br from-background/90 to-muted/20 hover:from-card/90 hover:to-card/60 shadow-sm transition-all duration-300">
                                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-border/40">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                                                <FolderTree className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-foreground">{data.projectName}</h4>
                                                <p className="text-xs text-muted-foreground font-mono">{data.projectCode}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right border-r border-border/50 pr-6">
                                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">True Project Stock</p>
                                                <div className="text-2xl font-black font-mono tracking-tighter text-indigo-500">
                                                    {strictTrueProjectStock} <span className="text-sm font-bold opacity-60 ml-1 tracking-normal">{item?.unit}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Unused Balance</p>
                                                <div className={`text-2xl font-black font-mono tracking-tighter ${remainingQty < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {remainingQty > 0 ? '+' : ''}{remainingQty} <span className="text-sm font-bold opacity-60 ml-1 tracking-normal">{item?.unit}</span>
                                                </div>
                                            </div>
                                            {remainingQty > 0 && (
                                                <div className="pl-6 border-l border-border/50">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOpenConsume(data, remainingQty)}
                                                        className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 w-32"
                                                    >
                                                        <Factory className="h-4 w-4 mr-2" /> Log Usage
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-3">
                                        {/* Requested */}
                                        <div className="flex flex-col bg-background/50 p-3 rounded-xl border border-border/30">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5"><ArrowDownToLine className="h-3 w-3" /> Requested</span>
                                            <span className="font-mono font-medium text-lg">{data.requestedQty}</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">Via Material Requisition</span>
                                        </div>

                                        {/* Ordered */}
                                        <div className="flex flex-col bg-background/50 p-3 rounded-xl border border-border/30">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5"><ArrowDownToLine className="h-3 w-3" /> Ordered</span>
                                            <span className="font-mono font-medium text-lg">{data.orderedQty}</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">Via LPO</span>
                                        </div>

                                        {/* Delivered */}
                                        <div className="flex flex-col bg-background/50 p-3 rounded-xl border border-border/30">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500/80 mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Received</span>
                                            <span className="font-mono font-medium text-lg text-blue-500">{data.deliveredQty}</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">LPO GRN (Direct)</span>
                                        </div>

                                        {/* Net Transfers */}
                                        <div className="flex flex-col bg-background/50 p-3 rounded-xl border border-border/30">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500/80 mb-1 flex items-center gap-1.5"><ArrowDownToLine className="h-3 w-3" /> Transferred</span>
                                            <span className="font-mono font-medium text-lg text-indigo-500">{data.netTransfers > 0 ? '+' : ''}{data.netTransfers}</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">Manual (From Gen)</span>
                                        </div>

                                        {/* Used */}
                                        <div className="flex flex-col bg-background/50 p-3 rounded-xl border border-border/30">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500/80 mb-1 flex items-center gap-1.5"><Factory className="h-3 w-3" /> Used</span>
                                            <span className="font-mono font-medium text-lg text-orange-500">{data.usedQty}</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">Consumed by Factory</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>

            {/* Consume Modal Overlay */}
            <Dialog open={isConsuming} onOpenChange={setIsConsuming}>
                <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Log Factory Consumption</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-sm">
                            <p className="text-muted-foreground mb-1">Project</p>
                            <p className="font-semibold">{consumeData.projectName}</p>
                            <p className="text-muted-foreground mt-2 mb-1">Available Project Stock</p>
                            <p className="font-mono text-emerald-500 font-bold text-lg">{consumeData.maxQty} {item?.unit}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Quantity to Consume</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    max={consumeData.maxQty}
                                    value={consumeQty}
                                    onChange={(e) => setConsumeQty(e.target.value)}
                                    placeholder={`Max ${consumeData.maxQty}`}
                                    className="pr-12 font-mono"
                                />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">{item?.unit}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Reference Note / Location</Label>
                            <Input
                                value={consumeReference}
                                onChange={(e) => setConsumeReference(e.target.value)}
                                placeholder="e.g. Sub-assembly block A"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsConsuming(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmitConsume} disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                            {isSubmitting ? "Logging..." : "Confirm Usage"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </Dialog>
    );
}
