import { format } from "date-fns";
import { FolderKanban, CalendarDays, ExternalLink, MapPin, Building2, Download, CheckCircle2, Clock, Share2, FileText, LayoutList, ArrowUpRight } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface StageData {
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    workers: { name: string, hours: number }[];
    totalHours: number;
    jobCardCount: number;
}

interface ProjectData {
    id: string;
    projectNumber?: string | null;
    name: string;
    client: string | null;
    amount?: number | null;
    startingDate?: Date | null;
    deadline: Date | null;
    location?: string | null;
    locationLink?: string | null;
    status: string;
    blankBoqUrl?: string | null;
    idDrawingUrl?: string | null;
    threeDDrawingUrl?: string | null;
    otherAttachmentUrl?: string | null;
    materialsDetailsUrl?: string | null;
    productionOrdersUrl?: string | null;
    productionOrders?: {
        id: string;
        productionOrderNumber: string;
        date: Date;
        pdfDrawingUrl: string | null;
        items: {
            itemDescription: string;
            qty: number;
            unit: string;
        }[];
    }[];
    stages: Record<string, StageData>;
}

export function ProjectDetailsDialog({
    project,
    open,
    onOpenChange
}: {
    project: ProjectData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!project) return null;

    const FileLink = ({ url, label }: { url?: string | null, label: string }) => {
        if (!url) return null;
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted/30 border rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="bg-primary/10 text-primary p-2 rounded-md group-hover:bg-primary/20 transition-colors">
                    <Download className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium flex-1">{label}</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b bg-muted/10">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <FolderKanban className="w-6 h-6" />
                            </div>
                            {project.name}
                        </DialogTitle>
                        <Badge variant={project.status === "COMPLETED" ? "secondary" : "default"} className={cn(
                            "px-3 py-1",
                            project.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800 border-none" : ""
                        )}>
                            {project.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-6 space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {project.projectNumber && (
                                <div className="space-y-3 p-5 bg-card border border-border/50 shadow-sm rounded-xl relative group transition-all hover:shadow-md hover:border-primary/20">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                                            <FolderKanban className="w-3.5 h-3.5 text-primary/70" /> Project No
                                        </span>
                                        <p className="font-semibold text-foreground tracking-tight">{project.projectNumber}</p>
                                    </div>
                                </div>
                            )}
                            {project.client && (
                                <div className="space-y-3 p-5 bg-card border border-border/50 shadow-sm rounded-xl relative group transition-all hover:shadow-md hover:border-primary/20">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-primary/70" /> Client
                                        </span>
                                        <p className="font-semibold text-foreground tracking-tight truncate" title={project.client}>{project.client}</p>
                                    </div>
                                </div>
                            )}
                            {project.amount ? (
                                <div className="space-y-3 p-5 bg-card border border-border/50 shadow-sm rounded-xl relative group transition-all hover:shadow-md hover:border-primary/20">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/10 text-primary text-[8px] font-bold">QR</span> Amount
                                        </span>
                                        <p className="font-semibold text-foreground tracking-tight flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground font-medium">QR</span>
                                            {project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            {project.location && (
                                <div className="space-y-4 p-5 bg-card border border-border/50 shadow-sm rounded-xl relative group transition-all hover:shadow-md hover:border-primary/20 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-primary/70" /> Location
                                        </span>
                                        <p className="font-semibold text-foreground tracking-tight truncate" title={project.location}>{project.location}</p>
                                    </div>
                                    {project.locationLink ? (
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="w-full gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors text-xs font-semibold h-8"
                                                onClick={() => window.open(project.locationLink as string, '_blank')}
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Open
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="w-full gap-1.5 hover:bg-muted/50 transition-colors text-xs font-semibold h-8 border-border/50"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(project.locationLink as string);
                                                    alert("Location link copied to clipboard!");
                                                }}
                                            >
                                                <Share2 className="w-3.5 h-3.5 text-muted-foreground" /> Share 
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full gap-2 mt-auto opacity-50 cursor-not-allowed text-xs font-semibold h-8 border-border/50 bg-muted/30"
                                            disabled
                                        >
                                            <MapPin className="w-3.5 h-3.5" /> No Link Added
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 border rounded-xl bg-muted/10">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <CalendarDays className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Start Date</p>
                                    <p className="font-medium">{project.startingDate ? format(new Date(project.startingDate), "PPP") : "Not Set"}</p>
                                </div>
                            </div>
                            <div className={cn(
                                "flex items-center gap-3 p-4 border rounded-xl bg-muted/10",
                                project.deadline && new Date(project.deadline) < new Date() && project.status !== "COMPLETED" ? "border-destructive/30 bg-destructive/5" : ""
                            )}>
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    project.deadline && new Date(project.deadline) < new Date() && project.status !== "COMPLETED" ? "bg-destructive/20 text-destructive" : "bg-emerald-100 text-emerald-600"
                                )}>
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Deadline</p>
                                    <p className="font-medium">{project.deadline ? format(new Date(project.deadline), "PPP") : "Not Set"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Documents Section */}
                        {(project.blankBoqUrl || project.idDrawingUrl || project.threeDDrawingUrl || project.materialsDetailsUrl || project.otherAttachmentUrl || (project.productionOrders && project.productionOrders.length > 0)) && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Attachment Documents</h3>
                                
                                {/* Standard Documents */}
                                {(project.blankBoqUrl || project.idDrawingUrl || project.threeDDrawingUrl || project.materialsDetailsUrl || project.otherAttachmentUrl) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                        <FileLink url={project.blankBoqUrl} label="Blank BOQ" />
                                        <FileLink url={project.idDrawingUrl} label="ID Drawing" />
                                        <FileLink url={project.threeDDrawingUrl} label="3D Drawing" />
                                        <FileLink url={project.materialsDetailsUrl} label="Material & Labour Details" />
                                        <FileLink url={project.otherAttachmentUrl} label="Other Attachments" />
                                    </div>
                                )}

                                {/* Production Orders */}
                                {project.productionOrders && project.productionOrders.length > 0 && (
                                    <div className="space-y-4 pt-2">
                                        <h4 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2 border-b pb-2">
                                            <FolderKanban className="w-4 h-4" /> Production Orders
                                        </h4>
                                        <div className="space-y-4">
                                            {project.productionOrders.map((po) => (
                                                <div key={po.id} className="border rounded-xl bg-background shadow-sm hover:border-primary/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-primary/10 text-primary p-2 rounded-lg">
                                                            <FolderKanban className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-semibold text-sm">{po.productionOrderNumber}</h5>
                                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                <CalendarDays className="w-3 h-3" />
                                                                {po.date ? format(new Date(po.date), "PPP") : "No Date"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {po.pdfDrawingUrl && (
                                                            <a 
                                                                href={po.pdfDrawingUrl} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="flex items-center justify-center p-2 bg-muted hover:bg-muted/80 text-foreground transition-colors rounded-md"
                                                                title="Download Original PDF"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        <Link 
                                                            href={`/admin/production-orders/view/${po.id}`}
                                                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md"
                                                        >
                                                            View Order <ArrowUpRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
                <div className="p-4 border-t bg-muted/10 flex justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
