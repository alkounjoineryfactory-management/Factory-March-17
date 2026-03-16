"use client";

import { useState } from "react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileText, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateProjectPricedBoq } from "@/app/actions/financials";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;

interface ProjectFinancialsTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    financials: any[];
}

export default function ProjectFinancialsTab({ financials }: ProjectFinancialsTabProps) {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [boqFile, setBoqFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [page, setPage] = useState(1);

    const pagedFinancials = financials.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUploadClick = (project: any) => {
        setSelectedProject(project);
        setBoqFile(null);
        setIsUploadOpen(true);
    };

    const handleFileUpload = async () => {
        if (!selectedProject || !boqFile) return;
        setIsUploading(true);

        try {
            // Mock file upload logic - typically to S3 / Vercel Blob
            // For now, simulate upload delay and save a mock URL
            await new Promise(r => setTimeout(r, 1500));
            const mockUrl = `/uploads/priced_boq_${selectedProject.id}_${Date.now()}.pdf`;

            const res = await updateProjectPricedBoq(selectedProject.id, mockUrl);
            if (res.success) {
                toast.success("Priced BOQ Uploaded Successfully");
                setIsUploadOpen(false);
                // Parent page revalidates and refreshes data
            } else {
                toast.error(res.error || "Failed to upload BOQ");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PremiumCard
                title="Project Financials & Billing Status"
                description="Monitor total project values against amounts invoiced to date and pending balances."
                icon={FileText}
            >
                <div className="rounded-xl border border-white/10 dark:border-white/5 overflow-hidden mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="font-semibold px-4 py-3">Project Ref</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Total Amount Value</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Total Invoiced (Billed)</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Balance to Invoice</TableHead>
                                <TableHead className="font-semibold py-3 text-center">Priced BOQ Docs</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {financials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                        No active projects found to track.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagedFinancials.map((proj) => {
                                    const progress = proj.totalAmount > 0
                                        ? Math.round((proj.totalInvoiced / proj.totalAmount) * 100)
                                        : 0;

                                    return (
                                        <TableRow key={proj.id} className="hover:bg-muted/10 transition-colors">
                                            <TableCell className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground">{proj.name}</span>
                                                    <span className="font-mono text-xs text-muted-foreground">{proj.projectNumber || 'N/A'}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right py-3">
                                                <span className="font-mono font-medium">{formatCurrency(proj.totalAmount)}</span>
                                            </TableCell>

                                            <TableCell className="text-right py-3">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`font-mono font-bold ${proj.totalInvoiced > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'}`}>
                                                        {formatCurrency(proj.totalInvoiced)}
                                                    </span>
                                                    {progress > 0 && (
                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 absolute-center font-bold bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-900 shadow-none">
                                                            {progress}% Billed
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right py-3">
                                                <span className={`font-mono font-black ${proj.balanceToInvoice <= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                    {formatCurrency(proj.balanceToInvoice)}
                                                </span>
                                            </TableCell>

                                            <TableCell className="py-3">
                                                <div className="flex justify-center items-center gap-2">
                                                    {proj.pricedBoqUrl ? (
                                                        <a
                                                            href={proj.pricedBoqUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-colors border border-emerald-500/20"
                                                        >
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            View BOQ
                                                        </a>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleUploadClick(proj)}
                                                            className="h-7 text-xs px-2.5 border-dashed border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                                                        >
                                                            <UploadCloud className="h-3 w-3 mr-1.5" />
                                                            Upload
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <PaginationBar
                    page={page}
                    totalPages={Math.ceil(financials.length / PAGE_SIZE)}
                    totalItems={financials.length}
                    pageSize={PAGE_SIZE}
                    onPrev={() => setPage(p => Math.max(1, p - 1))}
                    onNext={() => setPage(p => p + 1)}
                />
            </PremiumCard>

            {/* Upload BOQ Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UploadCloud className="h-5 w-5 text-indigo-500" />
                            Upload Priced BOQ
                        </DialogTitle>
                        <DialogDescription>
                            Attach the official priced Bill of Quantities for <strong>{selectedProject?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="file">BOQ Document (PDF/Excel)</Label>
                            <Input
                                id="file"
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                onChange={(e) => setBoqFile(e.target.files?.[0] || null)}
                                className="cursor-pointer file:cursor-pointer file:bg-primary/10 file:text-primary file:border-0 file:mr-4 file:py-1 file:px-3 file:rounded-md file:text-xs file:font-semibold hover:file:bg-primary/20"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFileUpload}
                            disabled={!boqFile || isUploading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isUploading ? "Uploading..." : "Save Document"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
