export default function ViewJobCardDialog({ job, open, onOpenChange }: any) {
    if (!job) return null;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Job Card Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4 text-sm">
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border">
                        <div><span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Description</span> <span className="font-medium text-foreground">{job.description}</span></div>
                        <div><span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Status</span> <Badge variant={job.status === "COMPLETED" ? "default" : "secondary"}>{job.status}</Badge></div>
                        <div><span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Item Code</span> <span className="font-medium text-foreground">{job.itemCode || "N/A"}</span></div>
                        <div><span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Section</span> <span className="font-medium text-foreground">{job.section?.name || "N/A"}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Worker</span>
                            <span className="font-medium text-foreground">{job.employee?.name || "Unassigned"}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Incharge</span>
                            <span className="font-medium text-foreground">{job.assignedTo || "None"}</span>
                        </div>
                        <div><span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Machine</span> <span className="font-medium text-foreground">{job.machine?.name || "N/A"}</span></div>
                        <div><span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Target Qty</span> <span className="font-medium text-foreground">{job.targetQty} {job.unit}</span></div>
                        <div><span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Labour Hrs</span> <span className="font-medium text-foreground">{job.budgetedLabourHrs || 0} Hrs</span></div>
                    </div>
                    {job.budgetedMaterialList && (
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Materials Needed</span>
                            <div className="p-3 bg-muted/20 border border-border rounded-md text-foreground">
                                {job.budgetedMaterialList.split(',').map((m: string, i: number) => <div key={i}>• {m.trim()}</div>)}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
