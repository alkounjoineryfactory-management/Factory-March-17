"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeftRight, PackageSearch, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { transferStoreStock, getProjectsForDropdown, getStoreItemProjectBreakdown } from "@/app/actions/store";

interface StoreItemTransferModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: any | null;
    onTransferred: () => void;
}

export function StoreItemTransferModal({ open, onOpenChange, item, onTransferred }: StoreItemTransferModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // Form State
    const [transferType, setTransferType] = useState<"TRANSFER_TO_PROJECT" | "TRANSFER_TO_GENERAL">("TRANSFER_TO_PROJECT");
    const [projectId, setProjectId] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("");
    const [reference, setReference] = useState("");
    
    // Data State
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [projectAvailableStock, setProjectAvailableStock] = useState<number>(0);
    const [isFetchingStock, setIsFetchingStock] = useState(false);

    useEffect(() => {
        if (open) {
            fetchProjects();
            setQuantity("");
            setReference("");
            setTransferType("TRANSFER_TO_PROJECT");
            setProjectId("");
            setProjectAvailableStock(0);
        }
    }, [open]);

    useEffect(() => {
        if (transferType === "TRANSFER_TO_GENERAL" && projectId && item) {
            const fetchStock = async () => {
                setIsFetchingStock(true);
                try {
                    const res = await getStoreItemProjectBreakdown(projectId, item.itemCode, item.name);
                    if (res.success && res.breakdown && res.breakdown.length > 0) {
                        const data = res.breakdown[0];
                        const strictTrueProjectStock = data.deliveredQty + data.netTransfers;
                        const remainingQty = strictTrueProjectStock - data.usedQty;
                        setProjectAvailableStock(remainingQty > 0 ? remainingQty : 0);
                    } else {
                        setProjectAvailableStock(0);
                    }
                } catch (error) {
                    setProjectAvailableStock(0);
                } finally {
                    setIsFetchingStock(false);
                }
            };
            fetchStock();
        } else {
            setProjectAvailableStock(0);
        }
    }, [projectId, transferType, item]);

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

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item || !projectId || !quantity || parseFloat(quantity) <= 0) {
            toast.error("Please fill in all required fields logically.");
            return;
        }

        const qty = parseFloat(quantity);

        setIsLoading(true);
        const loadToastId = toast.loading("Processing transfer...");

        try {
            const res = await transferStoreStock({
                storeItemId: item.id,
                projectId: projectId,
                type: transferType,
                quantity: qty,
                reference: reference || undefined
            });

            if (res.success) {
                toast.success("Stock transferred successfully!", { id: loadToastId });
                onTransferred();
                onOpenChange(false);
            } else {
                toast.error(res.error || "Failed to transfer stock", { id: loadToastId });
            }
        } catch (error: any) {
            toast.error("An unexpected error occurred", { id: loadToastId });
        } finally {
            setIsLoading(false);
        }
    };

    if (!item) return null;

    const availableStock = transferType === "TRANSFER_TO_PROJECT" ? item.currentStock : projectAvailableStock;
    const isValidQuantity = parseFloat(quantity) > 0 && parseFloat(quantity) <= availableStock;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] bg-card/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                            <ArrowLeftRight className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-1 text-left">
                            <span>Transfer Stock</span>
                            <span className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs shadow-sm bg-background/50 border-input">{item.itemCode}</Badge>
                                {item.name}
                            </span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleTransfer} className="space-y-6 mt-4">
                    {/* Visual Current Balances */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                        <div className="flex flex-col items-center justify-center p-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">General</span>
                            <span className="text-xl font-black">{item.currentStock}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 border-l border-border/50">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-indigo-500/80">Project</span>
                            <span className="text-xl font-black text-indigo-500">{item.projectStock || 0}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Transfer Direction</Label>
                            <Select value={transferType} onValueChange={(val: any) => setTransferType(val)}>
                                <SelectTrigger className="w-full bg-background/50">
                                    <SelectValue placeholder="Select Direction" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TRANSFER_TO_PROJECT">General to Project</SelectItem>
                                    <SelectItem value="TRANSFER_TO_GENERAL">Project to General</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{transferType === "TRANSFER_TO_PROJECT" ? "Target Project" : "Source Project"}</Label>
                            <Select value={projectId} onValueChange={setProjectId} disabled={isLoadingProjects}>
                                <SelectTrigger className="w-full bg-background/50">
                                    <SelectValue placeholder={isLoadingProjects ? "Loading..." : "Select a Project"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((proj) => (
                                        <SelectItem key={proj.id} value={proj.id}>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{proj.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{proj.projectNumber || 'No Code'}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Transfer Quantity <span className="text-muted-foreground font-normal">({item.unit})</span></Label>
                                <span className="text-xs text-muted-foreground font-semibold">
                                    Available: {isFetchingStock ? "Loading..." : availableStock}
                                </span>
                            </div>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={availableStock}
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Enter amount to move"
                                    className="pr-12 bg-background/50 h-10 font-mono text-lg"
                                    required
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold uppercase">
                                    {item.unit}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Reference Note <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Why is this being moved?"
                                className="bg-background/50"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || isFetchingStock || !projectId || !quantity || !isValidQuantity}
                            className={`${transferType === 'TRANSFER_TO_PROJECT' ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white border-0 shadow-lg`}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Transfer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
