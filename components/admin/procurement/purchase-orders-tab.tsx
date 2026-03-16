"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Plus, FileText, CalendarCheck, MoreHorizontal, ChevronDown, ChevronRight, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/admin/premium-card";
import { CreatePurchaseOrderDialog } from "./create-purchase-order-dialog";
import { toast } from "sonner";
import { updatePurchaseOrderStatus } from "@/app/actions/procurement";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PurchaseOrdersTabProps {
    vendors: any[];
    projects: any[];
    settings?: any;
}

export function PurchaseOrdersTab({ vendors, projects, settings }: PurchaseOrdersTabProps) {
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [expandedPos, setExpandedPos] = useState<string[]>([]);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchPOs = async () => {
        setIsLoading(true);
        const { getPurchaseOrders } = await import("@/app/actions/procurement");
        const res = await getPurchaseOrders({
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm,
            status: statusFilter
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

    // Fetch on mount and when dependencies change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchPOs();
        }, 300); // 300ms debounce for search
        return () => clearTimeout(timeoutId);
    }, [currentPage, searchTerm, statusFilter]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const toggleExpand = (id: string) => {
        setExpandedPos(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        setIsUpdating(id);
        const res = await updatePurchaseOrderStatus(id, newStatus);
        if (res.success) {
            toast.success(`Purchase Order marked as ${newStatus}`);
            fetchPOs(); // Refresh the list after update
        } else {
            toast.error(res.error || "Failed to update status");
        }
        setIsUpdating(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "DRAFT":
                return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Draft</Badge>;
            case "SENT":
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Sent</Badge>;
            case "PARTIAL":
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Partial</Badge>;
            case "RECEIVED":
                return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Received</Badge>;
            case "CANCELLED":
                return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Cancelled</Badge>;
            case "PAID":
                return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-500/30">Paid & Delivered</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleDownloadMasterPDF = () => {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;

        // Premium Colors
        const primaryColor: [number, number, number] = [15, 23, 42]; 
        const textMuted: [number, number, number] = [100, 116, 139]; 

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("PURCHASE ORDERS REPORT", 14, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 200);
        doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 32);

        if (statusFilter !== "ALL") {
            doc.text(`Filtered by Status: ${statusFilter}`, pageWidth - 14, 32, { align: 'right' });
        }

        // Stats
        const totalPos = purchaseOrders.length;
        const totalValue = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
        const pendingCount = purchaseOrders.filter(po => po.status !== 'PAID' && po.status !== 'DELIVERED_FULL' && po.status !== 'CANCELLED').length;
        const draftCount = purchaseOrders.filter(po => po.status === 'DRAFT').length;

        const startY = 48;
        const boxWidth = (pageWidth - 28 - 15) / 4;
        const metrics = [
            { label: 'Total Orders', value: totalPos.toString(), isAlert: false },
            { label: 'Total Value', value: `QAR ${totalValue.toLocaleString()}`, isAlert: false },
            { label: 'Pending / Active', value: pendingCount.toString(), isAlert: pendingCount > 0 },
            { label: 'Drafts', value: draftCount.toString(), isAlert: false }
        ];

        metrics.forEach((metric, index) => {
            const x = 14 + (boxWidth + 5) * index;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, startY, boxWidth, 20, 2, 2, 'FD');
            
            doc.setFontSize(9);
            doc.setTextColor(...textMuted);
            doc.text(metric.label, x + boxWidth / 2, startY + 7, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            if (metric.isAlert) doc.setTextColor(239, 68, 68);
            else doc.setTextColor(30, 41, 59);
            doc.text(metric.value, x + boxWidth / 2, startY + 16, { align: 'center' });
        });

        // Table
        const tableData = purchaseOrders.map((po: any, index: number) => [
            index + 1,
            po.poNumber,
            format(new Date(po.date), "dd MMM yyyy"),
            po.vendor?.name || 'Unknown',
            po.project?.name || 'General',
            `QAR ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            po.status
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['#', 'PO Number', 'Date', 'Vendor', 'Project', 'Total Amount', 'Status']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { fontStyle: 'bold' },
                5: { halign: 'right', fontStyle: 'bold' },
                6: { halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 },
            willDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 6) {
                    const statusStr = data.cell.raw?.toString() || '';
                    if (statusStr === 'DRAFT') data.cell.styles.textColor = [100, 116, 139];
                    else if (statusStr === 'SENT') data.cell.styles.textColor = [59, 130, 246];
                    else if (statusStr === 'PAID' || statusStr.includes('DELIVERED')) data.cell.styles.textColor = [16, 185, 129];
                    else if (statusStr === 'CANCELLED') data.cell.styles.textColor = [239, 68, 68];
                    else data.cell.styles.textColor = [245, 158, 11];
                }
            }
        });

        // Footer
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

        doc.save(`Premium_PO_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleDownloadPDF = async (po: any) => {
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
        doc.text("PURCHASE ORDER", pageWidth - 14, 22, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`PO No: ${po.poNumber}`, pageWidth - 14, 28, { align: "right" });

        // Details Background Base
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, 45, pageWidth - 28, 30, "F");

        // Reset colors for text over light background
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.rect(14, 45, pageWidth - 28, 30, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("VENDOR DETAILS", 19, 53);
        doc.text("PROJECT / DELIVERY", 120, 53);

        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(po.vendor?.name || "Unknown", 19, 59);
        doc.text(po.project?.name || "General Inventory", 120, 59);

        // Sub details
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`Date: ${format(new Date(po.date), "dd MMM yyyy")}`, 19, 66);
        doc.text(`Status: ${po.status}`, 120, 66);

        // Table
        doc.setFont("helvetica", "normal");
        const tableData = (po.items || []).map((item: any) => [
            item.itemCode || '-',
            item.itemDescription,
            `${item.quantity} ${item.unit}`,
            `QAR ${item.unitPrice.toFixed(2)}`,
            `QAR ${item.totalPrice.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 85,
            head: [['ITEM CODE', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 10 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
            didParseCell: function (data) {
                if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4 || data.column.index === 2)) {
                    data.cell.styles.halign = 'right';
                    if (data.column.index === 4) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.textColor = [15, 23, 42];
                    }
                }
                if (data.section === 'head' && (data.column.index === 3 || data.column.index === 4 || data.column.index === 2)) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 85;

        // Total Amount Box
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(pageWidth - 80, finalY + 5, 66, 12, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`Grand Total: QAR ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 17, finalY + 13, { align: "right" });

        // Notes
        if (po.notes) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text("Notes / Remarks:", 14, finalY + 15);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            const splitNotes = doc.splitTextToSize(po.notes, pageWidth - 100);
            doc.text(splitNotes, 14, finalY + 22);
        }

        // Signatures
        const sigY = finalY + Math.max(45, po.notes ? 45 : 30);

        doc.setDrawColor(203, 213, 225); // slate-300
        doc.setLineWidth(0.5);

        doc.line(14, sigY, 70, sigY);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text("Prepared By (Procurement)", 14, sigY + 5);

        doc.line(pageWidth - 70, sigY, pageWidth - 14, sigY);
        doc.text("Approved By (Factory Manager)", pageWidth - 70, sigY + 5);

        doc.save(`${po.poNumber}_PurchaseOrder.pdf`);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/60 backdrop-blur-xl border border-black/5 dark:border-white/5 p-4 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search PO number, vendor, or project..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-background/50 border-black/5 dark:border-white/10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-black/5 dark:border-white/10">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="SENT">Sent</SelectItem>
                            <SelectItem value="PARTIAL">Partial</SelectItem>
                            <SelectItem value="RECEIVED">Received</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={handleDownloadMasterPDF}
                        disabled={purchaseOrders.length === 0}
                        className="flex-1 sm:flex-none bg-card hover:bg-muted/50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create PO
                    </Button>
                </div>
            </div>

            {/* POs List */}
            <PremiumCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50">
                            <tr>
                                <th className="px-5 py-4 rounded-tl-xl border-b border-border/50 w-10"></th>
                                <th className="px-5 py-4 border-b border-border/50">PO Number</th>
                                <th className="px-5 py-4 border-b border-border/50">Date</th>
                                <th className="px-5 py-4 border-b border-border/50">Vendor</th>
                                <th className="px-5 py-4 border-b border-border/50">Project</th>
                                <th className="px-5 py-4 border-b border-border/50">Total Amount</th>
                                <th className="px-5 py-4 rounded-tr-xl border-b border-border/50">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            <span>Loading purchase orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : purchaseOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                                        No purchase orders found.
                                    </td>
                                </tr>
                            ) : (
                                purchaseOrders.map((po) => {
                                    const isExpanded = expandedPos.includes(po.id);

                                    return (
                                        <React.Fragment key={po.id}>
                                            <tr
                                                className={`border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer ${isExpanded ? 'bg-muted/10' : ''}`}
                                                onClick={() => toggleExpand(po.id)}
                                            >
                                                <td className="px-5 py-4 w-10 text-muted-foreground">
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-bold flex items-center gap-2 text-foreground">
                                                        <FileText className="w-4 h-4 text-primary shrink-0" />
                                                        {po.poNumber}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-muted-foreground">
                                                    {format(new Date(po.date), "dd MMM yyyy")}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-medium text-foreground">{po.vendor?.name}</div>
                                                </td>
                                                <td className="px-5 py-4 text-muted-foreground">
                                                    {po.project?.name || <span className="opacity-50 text-xs italic">General Inventory</span>}
                                                </td>
                                                <td className="px-5 py-4 font-bold text-foreground">
                                                    QAR {po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {getStatusBadge(po.status)}
                                                </td>
                                            </tr>

                                            {/* Expanded Line Items Row */}
                                            {isExpanded && (
                                                <tr className="bg-muted/5 border-b border-border/50">
                                                    <td colSpan={7} className="px-10 py-4">
                                                        <div className="rounded-xl border border-black/5 dark:border-white/5 bg-card/50 overflow-hidden">
                                                            <table className="w-full text-xs">
                                                                <thead className="bg-muted/30 text-muted-foreground">
                                                                    <tr>
                                                                        <th className="px-4 py-2 font-semibold text-left w-24">Item Code</th>
                                                                        <th className="px-4 py-2 font-semibold text-left">Item Description</th>
                                                                        <th className="px-4 py-2 font-semibold text-right">Quantity</th>
                                                                        <th className="px-4 py-2 font-semibold text-right">Unit Price</th>
                                                                        <th className="px-4 py-2 font-semibold text-right">Total Price</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border/20">
                                                                    {po.items?.map((item: any) => (
                                                                        <tr key={item.id} className="hover:bg-muted/30">
                                                                            <td className="px-4 py-2 text-foreground font-mono text-xs">{item.itemCode || '-'}</td>
                                                                            <td className="px-4 py-2 text-foreground">{item.itemDescription}</td>
                                                                            <td className="px-4 py-2 text-right text-muted-foreground">{item.quantity} {item.unit}</td>
                                                                            <td className="px-4 py-2 text-right text-muted-foreground">QAR {item.unitPrice.toFixed(2)}</td>
                                                                            <td className="px-4 py-2 text-right font-medium text-foreground">
                                                                                QAR {item.totalPrice.toFixed(2)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    {!po.items?.length && (
                                                                        <tr>
                                                                            <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground italic">No line items</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                            {po.notes && (
                                                                <div className="p-4 border-t border-border/20 text-xs bg-muted/10">
                                                                    <span className="font-bold text-muted-foreground mr-2">Notes:</span>
                                                                    <span className="text-foreground">{po.notes}</span>
                                                                </div>
                                                            )}
                                                            <div className="p-4 border-t border-border/20 flex justify-between gap-2 bg-muted/10">
                                                                <div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleDownloadPDF(po)}
                                                                        className="h-8 bg-card"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5 mr-1" /> Download PO
                                                                    </Button>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    {po.status === 'DRAFT' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-8 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-400"
                                                                            onClick={() => handleStatusUpdate(po.id, 'SENT')}
                                                                            disabled={isUpdating === po.id}
                                                                        >
                                                                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Send to Vendor
                                                                        </Button>
                                                                    )}
                                                                    {(po.status === 'SENT' || po.status === 'DRAFT') && (
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                            onClick={() => handleStatusUpdate(po.id, 'DELIVERED_FULL')}
                                                                            disabled={isUpdating === po.id}
                                                                        >
                                                                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Delivered
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-border/50 bg-muted/10">
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

            <CreatePurchaseOrderDialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) fetchPOs();
                }}
                vendors={vendors}
                projects={projects}
            />
        </div>
    );
}
