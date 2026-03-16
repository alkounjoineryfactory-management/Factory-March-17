"use client";

import { useState, useEffect } from "react";
import { Play, CheckCircle, PackageSearch, PackageOpen, Download, Search, Paperclip } from "lucide-react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createStoreTransaction } from "@/app/actions/store";
import { updatePurchaseOrderStatus, processGoodsReceipt } from "@/app/actions/procurement";
import { uploadFile } from "@/app/actions/upload";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GoodsReceiptTabProps {
    settings?: any;
}

export function GoodsReceiptTab({ settings }: GoodsReceiptTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [grnModalOpen, setGrnModalOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<any>(null);
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [attachModalOpen, setAttachModalOpen] = useState(false);
    const [selectedPOToAttach, setSelectedPOToAttach] = useState<any>(null);
    const [standaloneReceiptFile, setStandaloneReceiptFile] = useState<File | null>(null);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);

    const fetchPOs = async () => {
        setIsLoading(true);
        const { getPurchaseOrders } = await import("@/app/actions/procurement");
        let queryStatus = statusFilter;
        if (queryStatus === "ALL") {
            // Base filter for Goods Receipt tab: either waiting for receipt or already received
            queryStatus = "ISSUED,DELIVERED_PARTIAL,DELIVERED_FULL,PAID,RECEIVED";
        }

        const res = await getPurchaseOrders({
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm,
            status: queryStatus
        });

        if (res.success && res.purchaseOrders) {
            setPurchaseOrders(res.purchaseOrders);
            setHasNextPage(res.hasNextPage || false);
        } else {
            toast.error(res.error || "Failed to fetch purchase orders.");
            setPurchaseOrders([]);
            setHasNextPage(false);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchPOs();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [currentPage, searchTerm, statusFilter]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const handleOpenGRN = (po: any) => {
        setSelectedPO(po);
        // Initialize received quantites based on ordered items
        // In a complex app, we'd relate these to StoreItem IDs.
        // For now, we assume Store Items are linked/created manually or we match by Name/Code.
        // For simplicity, we just capture quantities here and update the PO status.
        const defaultQty: Record<string, number> = {};
        po.items?.forEach((item: any) => {
            defaultQty[item.id] = item.quantity;
        });
        setReceivedQuantities(defaultQty);
        setReceiptFile(null);
        setGrnModalOpen(true);
    };

    const confirmGRN = async () => {
        setIsLoading(true);
        try {
            let receiptUrl = undefined;
            if (receiptFile) {
                const formData = new FormData();
                formData.append("file", receiptFile);
                receiptUrl = await uploadFile(formData);
            }

            // Map received quantities to the format expected by processGoodsReceipt
            const receivedItems = selectedPO.items.map((item: any) => ({
                poItemId: item.id,
                itemCode: item.itemCode,
                itemDescription: item.itemDescription,
                quantity: receivedQuantities[item.id] || 0
            }));

            // Check if all received quantities match ordered quantities
            const isFullDelivery = selectedPO.items.every((item: any) => (receivedQuantities[item.id] || 0) >= item.quantity);
            const status = isFullDelivery ? "DELIVERED_FULL" : "DELIVERED_PARTIAL";

            const res = await processGoodsReceipt({
                purchaseOrderId: selectedPO.id,
                receiptUrl,
                status,
                receivedItems
            });

            if (res.success) {
                toast.success("Goods Receipt Note generated successfully!");
                setGrnModalOpen(false);
                fetchPOs();
            } else {
                toast.error(res.error || "Failed to process GRN");
            }
        } catch (e: any) {
            toast.error(e.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAttach = (po: any) => {
        setSelectedPOToAttach(po);
        setStandaloneReceiptFile(null);
        setAttachModalOpen(true);
    };

    const confirmAttachReceipt = async () => {
        if (!standaloneReceiptFile || !selectedPOToAttach) return;

        setIsUploadingReceipt(true);
        try {
            const formData = new FormData();
            formData.append("file", standaloneReceiptFile);
            const receiptUrl = await uploadFile(formData);

            const res = await updatePurchaseOrderStatus(selectedPOToAttach.id, selectedPOToAttach.status, receiptUrl);
            if (res.success) {
                toast.success("Receipt attached successfully!");
                setAttachModalOpen(false);
                fetchPOs();
            } else {
                toast.error(res.error || "Failed to attach receipt");
            }
        } catch (e: any) {
            toast.error(e.message || "An error occurred");
        } finally {
            setIsUploadingReceipt(false);
        }
    };

    const handleDownloadGRN = async (po: any) => {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;

        // 1. Elegant Header Background
        doc.setFillColor(15, 23, 42); // slate-900 like
        doc.rect(0, 0, pageWidth, 40, "F");

        const factoryName = settings?.factoryName || "FACTORY MANAGER";
        const brandLogoUrl = settings?.logoUrl?.startsWith('http')
            ? settings.logoUrl
            : settings?.logoUrl
                ? `${window.location.origin}${settings.logoUrl}`
                : null;

        // Brand Logo & Name
        if (brandLogoUrl) {
            try {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => {
                        try {
                            const canvas = document.createElement("canvas");
                            const scale = 4; // High DPI
                            canvas.width = (img.width || 200) * scale;
                            canvas.height = (img.height || 200) * scale;
                            const ctx = canvas.getContext("2d");
                            if (ctx) {
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                const dataURL = canvas.toDataURL("image/png");

                                const imgRatio = canvas.width / canvas.height;
                                const maxH = 16;
                                const maxW = 40;

                                let finalH = maxH;
                                let finalW = finalH * imgRatio;

                                if (finalW > maxW) {
                                    finalW = maxW;
                                    finalH = finalW / imgRatio;
                                }

                                const yOffset = 12 + ((16 - finalH) / 2);
                                doc.addImage(dataURL, "PNG", 14, yOffset, finalW, finalH);
                            }
                            resolve(null);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    img.onerror = (e) => reject(e);
                    img.src = brandLogoUrl;
                });
            } catch (err) {
                console.error("Error loading brand logo for PDF", err);
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.5);
                doc.rect(14, 12, 6, 6, "S");
                doc.setFillColor(56, 189, 248);
                doc.rect(17, 15, 6, 6, "F");
            }
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(factoryName, 35, 22);
        } else {
            // Text Fallback Logo
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            doc.rect(14, 12, 6, 6, "S");
            doc.setFillColor(56, 189, 248);
            doc.rect(17, 15, 6, 6, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("ANTIGRAVITY", 35, 20);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text("FACTORY MANAGER", 35, 26);
        }

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("GOODS RECEIPT NOTE", pageWidth - 14, 22, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const grnNo = `GRN-${po.poNumber.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}-${new Date().getMonth() + 1}`;
        doc.text(`Ref No: ${grnNo}`, pageWidth - 14, 28, { align: "right" });

        // Details Background Base
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, 45, pageWidth - 28, 25, "F");

        // Reset colors for text over light background
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.rect(14, 45, pageWidth - 28, 25, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("PURCHASE ORDER NO", 19, 53);
        doc.text("SUPPLIER", 120, 53);

        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(po.poNumber, 19, 59);
        doc.text(po.vendor?.name || "Unknown", 120, 59);

        // Sub details
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`Receipt Date: ${new Date().toLocaleDateString()}`, 19, 66);

        // Table
        doc.setFont("helvetica", "normal");
        const tableData = (po.items || []).map((item: any, index: number) => [
            index + 1,
            item.itemCode || '-',
            item.itemDescription,
            `${item.quantity} ${item.unit}`,
            po.status === 'DELIVERED_PARTIAL' ? 'Partial' : 'Full'
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['SN', 'ITEM CODE', 'DESCRIPTION', 'RECEIVED QTY', 'STATUS']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 10 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 4) {
                    if (data.cell.raw === 'Partial') {
                        data.cell.styles.textColor = [245, 158, 11]; // amber-500
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'Full') {
                        data.cell.styles.textColor = [16, 185, 129]; // emerald-500
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 75;

        // Signatures
        const sigY = finalY + 40;

        doc.setDrawColor(203, 213, 225); // slate-300
        doc.setLineWidth(0.5);

        doc.line(14, sigY, 70, sigY);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text("Received By (Store Keeper)", 14, sigY + 5);

        doc.line(pageWidth - 70, sigY, pageWidth - 14, sigY);
        doc.text("Approved By (Quality Control)", pageWidth - 70, sigY + 5);

        doc.save(`GRN_${po.poNumber}.pdf`);
    };

    return (
        <div className="space-y-6">
            <PremiumCard>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <PackageOpen className="h-5 w-5 text-primary" />
                        Goods Receipts
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Receive goods from Local Purchase Orders (LPO) into the Factory Store and generate GRNs.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between bg-card/40 p-3 rounded-xl border border-border/50">
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search LPO number or vendor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-background/50 border-white/10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-white/10">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="DELIVERED_FULL">Received Full</SelectItem>
                                <SelectItem value="DELIVERED_PARTIAL">Partial Receipt</SelectItem>
                                <SelectItem value="ISSUED">Pending Receipt</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-xl font-medium">LPO Number</th>
                                <th className="px-6 py-4 font-medium">Vendor</th>
                                <th className="px-6 py-4 font-medium">Total Items</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 rounded-tr-xl font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            <span>Loading purchase orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : purchaseOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        No purchase orders found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                purchaseOrders.map((po) => (
                                    <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono">
                                                    {po.poNumber}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-foreground">{po.vendor?.name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{new Date(po.date).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {po.items?.length || 0} line items
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={`
                                                ${(po.status === 'DELIVERED_FULL' || po.status === 'PAID') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                                                ${po.status === 'DELIVERED_PARTIAL' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                                                ${po.status === 'ISSUED' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                                            `}>
                                                {po.status === 'ISSUED' ? 'PENDING RECEIPT' : po.status === 'PAID' ? 'PAID & DELIVERED' : po.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            {po.status === 'ISSUED' || po.status === 'DELIVERED_PARTIAL' ? (
                                                <Button size="sm" onClick={() => handleOpenGRN(po)}>
                                                    <PackageSearch className="h-4 w-4 mr-2" />
                                                    Receive Goods
                                                </Button>
                                            ) : null}

                                            {(po.status === 'DELIVERED_FULL' || po.status === 'DELIVERED_PARTIAL') && (
                                                <Button size="sm" variant="outline" onClick={() => handleDownloadGRN(po)}>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    GRN PDF
                                                </Button>
                                            )}
                                            {(!po.receiptUrl && (po.status === 'DELIVERED_FULL' || po.status === 'DELIVERED_PARTIAL')) && (
                                                <Button size="sm" variant="outline" className="border-primary/20 bg-primary/5 text-primary" onClick={() => handleOpenAttach(po)}>
                                                    <Paperclip className="h-4 w-4 mr-2" />
                                                    Attach Receipt
                                                </Button>
                                            )}
                                            {po.receiptUrl && (
                                                <Button size="sm" variant="outline" className="border-primary/20 bg-primary/5 text-primary" onClick={() => window.open(po.receiptUrl, '_blank')}>
                                                    <Paperclip className="h-4 w-4 mr-2" />
                                                    Vendor Receipt
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-border/50 bg-muted/10 mt-4 rounded-b-xl -mx-6 -mb-6">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        Showing results for page <span className="font-medium text-foreground">{currentPage}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            disabled={!hasNextPage}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </PremiumCard>

            <Dialog open={grnModalOpen} onOpenChange={setGrnModalOpen}>
                <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-white/10">
                    <DialogHeader>
                        <DialogTitle>Goods Receipt Note (GRN)</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="p-4 bg-muted/30 rounded-xl border border-border/50 flex justify-between items-center">
                            <div>
                                <h4 className="font-medium text-muted-foreground text-sm">LPO Number</h4>
                                <p className="text-lg font-bold font-mono text-primary">{selectedPO?.poNumber}</p>
                            </div>
                            <div className="text-right">
                                <h4 className="font-medium text-muted-foreground text-sm">Vendor</h4>
                                <p className="text-sm font-semibold">{selectedPO?.vendor?.name}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/50">Received Items Checklist</h4>
                            {selectedPO?.items?.map((item: any) => (
                                <div key={item.id} className="grid grid-cols-12 gap-3 items-center py-2 border-b border-border/20 last:border-0">
                                    <div className="col-span-6">
                                        <div className="font-medium text-sm">
                                            {item.itemCode && <span className="font-mono text-xs text-muted-foreground mr-1">[{item.itemCode}]</span>}
                                            {item.itemDescription}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Ordered: {item.quantity} {item.unit}</div>
                                    </div>
                                    <div className="col-span-6 flex items-center gap-2 justify-end">
                                        <Label className="text-xs whitespace-nowrap">Rcvd Qty:</Label>
                                        <Input
                                            type="number"
                                            className="w-24 text-right font-mono"
                                            value={receivedQuantities[item.id] || 0}
                                            onChange={e => setReceivedQuantities({ ...receivedQuantities, [item.id]: parseFloat(e.target.value) })}
                                            min="0"
                                            step="0.01"
                                        />
                                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <Label htmlFor="receiptAttachment">Vendor Receipt Attachment</Label>
                            <Input
                                id="receiptAttachment"
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setReceiptFile(e.target.files[0]);
                                    } else {
                                        setReceiptFile(null);
                                    }
                                }}
                                className="cursor-pointer file:text-primary file:bg-primary/10 file:font-semibold file:px-4 file:py-1 file:border-0 file:rounded-md file:mr-4 file:cursor-pointer hover:file:bg-primary/20"
                            />
                            {receiptFile && <p className="text-xs text-muted-foreground">Selected file: {receiptFile.name}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGrnModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmGRN} disabled={isLoading}>
                            {isLoading ? "Processing..." : "Confirm Receipt & Update Inventory"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={attachModalOpen} onOpenChange={setAttachModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-white/10">
                    <DialogHeader>
                        <DialogTitle>Attach Vendor Receipt</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                            <h4 className="font-medium text-muted-foreground text-sm">LPO Number</h4>
                            <p className="text-lg font-bold font-mono text-primary">{selectedPOToAttach?.poNumber}</p>
                            <h4 className="font-medium text-muted-foreground text-sm mt-3">Vendor</h4>
                            <p className="text-sm font-semibold">{selectedPOToAttach?.vendor?.name}</p>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="standaloneReceiptAttachment">Select Receipt File</Label>
                            <Input
                                id="standaloneReceiptAttachment"
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setStandaloneReceiptFile(e.target.files[0]);
                                    } else {
                                        setStandaloneReceiptFile(null);
                                    }
                                }}
                                className="cursor-pointer file:text-primary file:bg-primary/10 file:font-semibold file:px-4 file:py-1 file:border-0 file:rounded-md file:mr-4 file:cursor-pointer hover:file:bg-primary/20"
                            />
                            {standaloneReceiptFile && <p className="text-xs text-muted-foreground">Selected: {standaloneReceiptFile.name}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAttachModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmAttachReceipt} disabled={!standaloneReceiptFile || isUploadingReceipt}>
                            {isUploadingReceipt ? "Uploading..." : "Upload Receipt"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
