"use client";

import { useState, useEffect } from "react";
import { Plus, Link as LinkIcon, Download, CheckCircle, FileText, ArrowRight } from "lucide-react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { awardQuotation } from "@/app/actions/procurement";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface QuotationsTabProps {
    settings?: any;
}

export function QuotationsTab({ settings }: QuotationsTabProps) {
    const [availableMRs, setAvailableMRs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMrId, setSelectedMrId] = useState<string>("");

    useEffect(() => {
        const fetchAvailableMRs = async () => {
            setIsLoading(true);
            const { getMaterialRequisitions } = await import("@/app/actions/procurement");
            const res = await getMaterialRequisitions({
                page: 1,
                limit: 100, // Cap dropdown list to 100 manually active items
                status: "APPROVED,QUOTING,LPO_ISSUED"
            });
            
            if (res.success && res.requisitions) {
                setAvailableMRs(res.requisitions);
            }
            setIsLoading(false);
        };
        fetchAvailableMRs();
    }, []);

    const [awardModalOpen, setAwardModalOpen] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [poNumber, setPoNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const activeMR = availableMRs.find(mr => mr.id === selectedMrId);

    const filteredQuotes = activeMR?.quotations?.filter((q: any) =>
        q.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleAwardClick = (quote: any) => {
        setSelectedQuote(quote);
        // generate a draft PO number based on MR number
        const draftPoNo = `PO-${activeMR?.mrNumber.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}`;
        setPoNumber(draftPoNo);
        setAwardModalOpen(true);
    };

    const confirmAward = async () => {
        if (!poNumber) {
            toast.error("Purchase Order Number is required.");
            return;
        }

        setIsSubmitting(true);
        const res = await awardQuotation(selectedQuote.id, poNumber);
        if (res.success) {
            toast.success("Quotation awarded! Draft LPO generated.");
            setAwardModalOpen(false);
            // In a real app we'd refresh the parent data here, but revalidatePath handles the reload.
        } else {
            toast.error(res.error || "Failed to award quotation.");
        }
        setIsSubmitting(false);
    };

    const handleDownloadSummaryPDF = async () => {
        if (!activeMR || !activeMR.quotations) return;

        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;

        const primaryColor: [number, number, number] = [15, 23, 42]; 
        const textMuted: [number, number, number] = [100, 116, 139]; 

        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("QUOTATION COMPARISON", 14, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 200);
        doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 32);
        doc.text(`MR Ref: ${activeMR.mrNumber}`, pageWidth - 14, 32, { align: 'right' });

        const totalBids = activeMR.quotations.length;
        const pendingBids = activeMR.quotations.filter((q: any) => !q.isSelected).length;
        
        const bidAmounts = activeMR.quotations.map((q: any) => q.totalAmount);
        const lowestBid = bidAmounts.length > 0 ? Math.min(...bidAmounts) : 0;
        const highestBid = bidAmounts.length > 0 ? Math.max(...bidAmounts) : 0;

        const startY = 48;
        const boxWidth = (pageWidth - 28 - 15) / 4;
        const metrics = [
            { label: 'Total Bids', value: totalBids.toString(), isAlert: false },
            { label: 'Pending Decisions', value: pendingBids.toString(), isAlert: false },
            { label: 'Lowest Bid', value: `QAR ${lowestBid.toLocaleString()}`, isAlert: false, color: lowestBid > 0 ? [16, 185, 129] : [30, 41, 59] },
            { label: 'Highest Bid', value: `QAR ${highestBid.toLocaleString()}`, isAlert: false, color: highestBid > 0 ? [245, 158, 11] : [30, 41, 59] }
        ];

        metrics.forEach((metric, index) => {
            const x = 14 + (boxWidth + 5) * index;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, startY, boxWidth, 20, 2, 2, 'FD');
            
            doc.setFontSize(9);
            doc.setTextColor(...textMuted);
            doc.text(metric.label, x + boxWidth / 2, startY + 7, { align: 'center' });
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            if (metric.color) {
               // @ts-ignore
               doc.setTextColor(...metric.color);
            } else if (metric.isAlert) {
               doc.setTextColor(239, 68, 68);
            } else {
               doc.setTextColor(30, 41, 59);
            }
            doc.text(metric.value, x + boxWidth / 2, startY + 16, { align: 'center' });
        });

        // Comparative Table
        const tableData = activeMR.quotations.map((quote: any, index: number) => [
            index + 1,
            quote.vendor?.name || "Unknown",
            new Date(quote.createdAt).toLocaleDateString(),
            `QAR ${quote.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            quote.isSelected ? "AWARDED" : "PENDING"
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['#', 'Vendor Name', 'Submitted Date', 'Total Bid Amount', 'Status']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { fontStyle: 'bold' },
                3: { halign: 'right', fontStyle: 'bold' },
                4: { halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 },
            willDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 4) {
                    if (data.cell.raw === "AWARDED") {
                        data.cell.styles.textColor = [16, 185, 129];
                    } else {
                        data.cell.styles.textColor = [245, 158, 11];
                    }
                }
            }
        });

        // @ts-ignore
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.height - 10, { align: 'right' });
            doc.text(`Factory Manager Pro - Confidential & Proprietary  |  Generated securely via system`, 14, doc.internal.pageSize.height - 10);
        }

        doc.save(`Premium_Quotes_Summary_${activeMR.mrNumber}.pdf`);
    };

    return (
        <div className="space-y-6">
            <PremiumCard>
                <div className="space-y-6">
                    <div>
                        <Label className="text-muted-foreground mb-2 block">Select Material Requisition</Label>
                        <Select value={selectedMrId} onValueChange={setSelectedMrId}>
                            <SelectTrigger className="w-full sm:w-[400px] bg-card border-border/50">
                                <SelectValue placeholder="Choose an MR to view quotes..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoading ? (
                                    <SelectItem value="loading" disabled>Loading requisitions...</SelectItem>
                                ) : availableMRs.length === 0 ? (
                                    <SelectItem value="none" disabled>No active requisitions available.</SelectItem>
                                ) : (
                                    availableMRs.map(mr => (
                                        <SelectItem key={mr.id} value={mr.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{mr.mrNumber}</span>
                                                <span className="text-muted-foreground">- {mr.project?.name || 'General Supply'}</span>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {activeMR && (
                        <div className="pt-4 border-t border-border/50">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        Quotations for {activeMR.mrNumber}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">Compare received bids and award a Purchase Order.</p>
                                </div>
                                <div>
                                    <Badge variant="outline" className={`px-3 py-1 ${activeMR.status === 'LPO_ISSUED' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-primary/20 text-primary border-primary/20'}`}>
                                        {activeMR.status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-between items-center bg-card/40 p-3 rounded-xl border border-border/50">
                                <Input
                                    placeholder="Search vendors..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="max-w-sm bg-background/50 border-white/10"
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadSummaryPDF}
                                    disabled={!activeMR.quotations || activeMR.quotations.length === 0}
                                    className="bg-card w-full sm:w-auto"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Comparison PDF
                                </Button>
                            </div>

                            {(!activeMR.quotations || activeMR.quotations.length === 0) ? (
                                <div className="text-center py-12 border border-dashed border-border/50 rounded-xl bg-muted/10">
                                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                                    <p className="text-muted-foreground font-medium">No quotations received yet for this requisition.</p>
                                    <p className="text-xs text-muted-foreground mt-1">Add them via the Material Requisitions tab.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredQuotes.map((quote: any) => (
                                        <div key={quote.id} className={`p-5 rounded-2xl border transition-all ${quote.isSelected ? 'border-primary ring-1 ring-primary/50 bg-primary/5' : 'border-border/50 bg-card/60 hover:bg-card/80 shadow-sm'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-semibold text-lg text-foreground">{quote.vendor?.name}</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Submitted on {new Date(quote.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                {quote.isSelected && (
                                                    <Badge variant="default" className="bg-primary hover:bg-primary text-primary-foreground pointer-events-none">
                                                        <CheckCircle className="h-3 w-3 mr-1" /> Awarded
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="py-4 my-4 flex flex-col gap-1">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm tracking-wide text-muted-foreground uppercase">Itemized Pricing</span>
                                                </div>
                                                <div className="bg-background/40 rounded-lg p-3 space-y-2 text-xs">
                                                    {quote.items && quote.items.length > 0 ? (
                                                        <>
                                                            {quote.items.map((item: any) => (
                                                                <div key={item.id} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0 last:pb-0">
                                                                    <span className="text-muted-foreground truncate pr-2 max-w-[120px]" title={item.materialRequisitionItem?.itemDescription}>
                                                                        {item.materialRequisitionItem?.itemCode && <span className="font-mono text-[10px] text-muted-foreground/70 mr-1">[{item.materialRequisitionItem.itemCode}]</span>}
                                                                        {item.materialRequisitionItem?.itemDescription || "Item"}
                                                                    </span>
                                                                    <div className="text-right whitespace-nowrap">
                                                                        <span className="text-foreground">{item.unitPrice.toFixed(2)}</span>
                                                                        <span className="text-muted-foreground/50 mx-1">x</span>
                                                                        <span className="text-foreground">{item.materialRequisitionItem?.quantity}</span>
                                                                        <span className="text-muted-foreground/50 mx-1">=</span>
                                                                        <span className="font-semibold text-primary">{item.totalPrice.toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <div className="text-center text-muted-foreground py-2 italic">Legacy total-only quote</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="py-4 mb-4 border-y border-border/50 flex flex-col gap-1">
                                                <span className="text-sm tracking-wide text-muted-foreground uppercase">Grand Total</span>
                                                <span className="text-3xl font-bold tracking-tight text-primary font-mono">
                                                    QAR {quote.totalAmount.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {quote.attachmentUrl ? (
                                                    <a href={quote.attachmentUrl} target="_blank" rel="noreferrer" className="flex-[1]">
                                                        <Button variant="outline" className="w-full bg-card/60 border-white/10 text-muted-foreground hover:text-foreground">
                                                            <Download className="h-4 w-4 mr-2" /> PDF Quote
                                                        </Button>
                                                    </a>
                                                ) : (
                                                    <Button variant="outline" disabled className="flex-[1] bg-card/60 border-white/5 opacity-50">
                                                        No Attachment
                                                    </Button>
                                                )}

                                                {activeMR.status !== 'LPO_ISSUED' && !quote.isSelected && (
                                                    <Button
                                                        className="flex-[1] bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 shadow-none"
                                                        onClick={() => handleAwardClick(quote)}
                                                    >
                                                        Award LPO <ArrowRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </PremiumCard>

            <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-white/10">
                    <DialogHeader>
                        <DialogTitle>Award Quotation</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                            <h4 className="font-medium text-sm text-muted-foreground">Selected Vendor</h4>
                            <p className="text-lg font-semibold">{selectedQuote?.vendor?.name}</p>
                            <div className="mt-2 text-primary font-bold font-mono">QAR {selectedQuote?.totalAmount.toLocaleString()}</div>
                        </div>

                        <div className="space-y-2">
                            <Label>Generate LPO Number</Label>
                            <Input
                                value={poNumber}
                                onChange={e => setPoNumber(e.target.value)}
                                className="font-mono"
                                placeholder="e.g. PO-1029"
                            />
                            <p className="text-xs text-muted-foreground">A draft Purchase Order will be created with this number. You can edit the individual item allocations later.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAwardModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmAward} disabled={isSubmitting}>
                            {isSubmitting ? "Generating..." : "Confirm & Create Draft LPO"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
