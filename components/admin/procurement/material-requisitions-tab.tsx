"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Search, Plus, FileText, ChevronDown, ChevronRight, CheckCircle, XCircle, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/admin/premium-card";
import { CreateMaterialRequisitionDialog } from "./create-material-requisition-dialog";
import { toast } from "sonner";
import { updateMaterialRequisitionStatus, submitQuotation, updateMaterialRequisition } from "@/app/actions/procurement";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MaterialRequisitionsTabProps {
    projects: any[];
    users: any[];
    vendors: any[];
    storeItems: any[];
    settings?: any;
}

export function MaterialRequisitionsTab({ projects, users, vendors, storeItems, settings }: MaterialRequisitionsTabProps) {
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Upload Quote State
    const [isQuoteOpen, setIsQuoteOpen] = useState(false);
    const [quoteMrId, setQuoteMrId] = useState("");
    const [quoteData, setQuoteData] = useState({ vendorId: "", attachmentFile: null as File | null, attachmentUrl: "" });
    const [quoteItems, setQuoteItems] = useState<{ mrItemId: string, itemDescription: string, quantity: number, unit: string, unitPrice: number, totalPrice: number }[]>([]);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);
    const [editMrId, setEditMrId] = useState("");
    const [editMrData, setEditMrData] = useState({
        projectId: "general",
        notes: "",
        items: [{ id: "", itemCode: "", itemDescription: "", quantity: 1, unit: "pcs" }]
    });

    const fetchMRs = async () => {
        setIsLoading(true);
        const { getMaterialRequisitions } = await import("@/app/actions/procurement");
        const res = await getMaterialRequisitions({
            page: currentPage,
            limit: itemsPerPage,
            search: searchQuery,
            status: statusFilter
        });
        
        if (res.success && res.requisitions) {
            setRequisitions(res.requisitions);
            setHasNextPage(res.hasNextPage || false);
        } else {
            toast.error(res.error || "Failed to fetch material requisitions.");
            setRequisitions([]);
            setHasNextPage(false);
        }
        setIsLoading(false);
    };

    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchMRs();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [currentPage, searchQuery, statusFilter]);

    // Reset pagination when search or filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const toggleExpand = (id: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setIsUpdating(id);
        try {
            const result = await updateMaterialRequisitionStatus(id, newStatus);
            if (result.success) {
                toast.success(`Requisition marked as ${newStatus}`);
                fetchMRs();
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update status");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsUpdating(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Pending</Badge>;
            case "APPROVED":
                return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
            case "REJECTED":
                return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejected</Badge>;
            case "ORDERED":
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Ordered</Badge>;
            case "QUOTING":
                return <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-500 border-indigo-500/20 pointer-events-none">Quoting</Badge>;
            case "LPO_ISSUED":
                return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/20 pointer-events-none">LPO Issued</Badge>;
            case "COMPLETED":
                return <Badge variant="secondary" className="bg-slate-500/20 text-slate-500 border-slate-500/20 pointer-events-none">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleAddEditItem = () => {
        setEditMrData(prev => ({
            ...prev,
            items: [...prev.items, { id: `temp-${Date.now()}`, itemCode: "", itemDescription: "", quantity: 1, unit: "pcs" }]
        }));
    };

    const handleRemoveEditItem = (index: number) => {
        setEditMrData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!editMrData.items || editMrData.items.length === 0) {
            toast.error("Please add at least one material item.");
            return;
        }

        const invalidItems = editMrData.items.filter(item => !item.itemDescription.trim() || item.quantity <= 0);
        if (invalidItems.length > 0) {
            toast.error("All items must have a description and a quantity greater than 0.");
            return;
        }

        setIsEditSubmitting(true);
        try {
            const dataToSubmit = {
                projectId: editMrData.projectId === "general" ? undefined : editMrData.projectId,
                notes: editMrData.notes || undefined,
                items: editMrData.items.map(i => ({
                    id: i.id.startsWith("temp-") ? undefined : i.id, // Strip temp IDs for new items added during edit
                    itemCode: i.itemCode || undefined,
                    itemDescription: i.itemDescription,
                    quantity: Number(i.quantity),
                    unit: i.unit
                }))
            };

            const result = await updateMaterialRequisition(editMrId, dataToSubmit);

            if (result.success) {
                toast.success("Material Requisition Updated", {
                    description: "Public tracking links and approvals have been reset.",
                });
                setIsEditOpen(false);
                fetchMRs();
                router.refresh();
            } else {
                toast.error("Failed to update", { description: result.error });
            }
        } catch (error: any) {
            toast.error("An error occurred", { description: error.message });
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const handleDownloadPDF = async (mr: any) => {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;
        let pY = 15;

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

                                // Calculate aspect ratio to prevent stretching
                                const imgRatio = canvas.width / canvas.height;
                                const maxH = 16;
                                const maxW = 40; // Allow it to expand wider if it's a structural logo

                                let finalH = maxH;
                                let finalW = finalH * imgRatio;

                                if (finalW > maxW) {
                                    finalW = maxW;
                                    finalH = finalW / imgRatio;
                                }

                                // Vertically center the logo within the 16mm header space
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
            doc.text(factoryName, 28, 22);
        }

        // 2. Header Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("MATERIAL REQUISITION", pageWidth - 14, 20, { align: "right" });

        // Subtext / Date in header
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, pageWidth - 14, 26, { align: "right" });

        pY = 50;

        // 3. Info Cards (Requester & Project)
        const blockWidth = (pageWidth - 36) / 2; // two cols

        // Card 1: Requisition Details
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14, pY, blockWidth, 35, 3, 3, "FD");

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("REQUISITION ID", 19, pY + 8);
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(mr.mrNumber, 19, pY + 14);

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text("DATE REQUESTED", 19, pY + 24);
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(format(new Date(mr.date), "dd MMM yyyy"), 19, pY + 30);

        // Card 2: Project & Requester
        doc.setDrawColor(220, 220, 220); // Explicitly reset colors to fix dark mode bug
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14 + blockWidth + 8, pY, blockWidth, 35, 3, 3, "FD");

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text("PROJECT", 19 + blockWidth + 8, pY + 8);
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const projectName = mr.project?.name || "General Inventory";
        doc.text(projectName.length > 30 ? projectName.substring(0, 30) + '...' : projectName, 19 + blockWidth + 8, pY + 14);

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text("REQUESTED BY", 19 + blockWidth + 8, pY + 24);
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(mr.requester?.name || mr.requester?.username || "Unknown", 19 + blockWidth + 8, pY + 30);

        pY += 45;

        // 4. Status Badge
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text("Current Status:", 14, pY + 5);

        let statusColor = [150, 150, 150]; // default gray
        if (mr.status === "APPROVED") statusColor = [16, 185, 129]; // emerald
        if (mr.status === "PENDING") statusColor = [245, 158, 11]; // amber
        if (mr.status === "REJECTED") statusColor = [239, 68, 68]; // red

        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.roundedRect(45, pY, 30, 7, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(mr.status, 60, pY + 5, { align: "center" });

        pY += 15;

        // 5. Line Items Table with Premium AutoTable styling
        const tableData = (mr.items || []).map((item: any, index: number) => {
            let statusStr = item.approvalStatus || 'PENDING';
            if (statusStr === 'APPROVED') statusStr = 'Apprvd';

            return [
                (index + 1).toString(),
                item.itemCode || "-",
                item.itemDescription,
                item.quantity.toString() + " " + item.unit,
                statusStr,
                item.comments || "-"
            ];
        });

        autoTable(doc, {
            startY: pY,
            head: [["#", "Code", "Description", "Required", "Status", "Manager Comment"]],
            body: tableData,
            theme: "grid",
            headStyles: {
                fillColor: [240, 244, 248], // slate-100
                textColor: [71, 85, 105], // slate-500
                fontStyle: "bold",
                fontSize: 9,
                halign: "left"
            },
            bodyStyles: {
                textColor: [30, 30, 30],
                fontSize: 9,
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 25 },
                2: { cellWidth: 'auto' }, // grows
                3: { cellWidth: 25, fontStyle: 'bold', halign: 'right' },
                4: { cellWidth: 20 },
                5: { cellWidth: 40, textColor: [100, 100, 100], fontStyle: 'italic' }
            },
            margin: { left: 14, right: 14 },
            styles: {
                cellPadding: 4,
                lineColor: [230, 230, 230],
                lineWidth: 0.1
            }
        });

        // @ts-ignore
        pY = doc.lastAutoTable.finalY + 15;

        // 6. Notes Section
        if (mr.notes) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, pY, pageWidth - 28, 20, "F");

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(71, 85, 105);
            doc.text("Requester Notes:", 18, pY + 6);

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 30, 30);
            const splitNotes = doc.splitTextToSize(mr.notes, pageWidth - 36);
            doc.text(splitNotes, 18, pY + 12);

            pY += 30;
        }

        // 7. Footer / Signatures
        if (pY < doc.internal.pageSize.height - 40) {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);

            doc.line(14, pY + 20, 74, pY + 20);
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text("Requested By", 14, pY + 25);

            doc.line(pageWidth - 74, pY + 20, pageWidth - 14, pY + 20);
            doc.text("Approved By", pageWidth - 74, pY + 25);
        }

        doc.save(`MR_${mr.mrNumber}.pdf`);
    };

    const handleDownloadMasterPDF = () => {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;

        const primaryColor: [number, number, number] = [15, 23, 42]; 
        const textMuted: [number, number, number] = [100, 116, 139]; 

        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("MATERIAL REQUISITIONS REPORT", 14, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 200);
        doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 32);

        if (statusFilter !== "ALL") {
            doc.text(`Filtered by Status: ${statusFilter}`, pageWidth - 14, 32, { align: 'right' });
        }

        const totalMRs = requisitions.length;
        const pendingCount = requisitions.filter(mr => mr.status === 'PENDING').length;
        const approvedCount = requisitions.filter(mr => mr.status === 'APPROVED' || mr.status === 'QUOTING' || mr.status === 'LPO_ISSUED').length;
        const rejectedCount = requisitions.filter(mr => mr.status === 'REJECTED').length;

        const startY = 48;
        const boxWidth = (pageWidth - 28 - 15) / 4;
        const metrics = [
            { label: 'Total MRs', value: totalMRs.toString(), isAlert: false },
            { label: 'Pending Approval', value: pendingCount.toString(), isAlert: pendingCount > 0 },
            { label: 'Approved & Active', value: approvedCount.toString(), isAlert: false },
            { label: 'Rejected', value: rejectedCount.toString(), isAlert: rejectedCount > 0 }
        ];

        metrics.forEach((metric, index) => {
            const x = 14 + (boxWidth + 5) * index;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, startY, boxWidth, 20, 2, 2, 'FD');
            
            doc.setFontSize(9);
            doc.setTextColor(...textMuted);
            doc.text(metric.label, x + boxWidth / 2, startY + 7, { align: 'center' });
            
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            if (metric.isAlert) doc.setTextColor(239, 68, 68);
            else doc.setTextColor(30, 41, 59);
            doc.text(metric.value, x + boxWidth / 2, startY + 16, { align: 'center' });
        });

        const tableData = requisitions.map((mr: any, index: number) => [
            index + 1,
            mr.mrNumber,
            format(new Date(mr.date), "dd MMM yyyy"),
            mr.requester?.name || mr.requester?.username || 'Unknown',
            mr.project?.name || 'General Inventory',
            mr.status
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['#', 'MR Number', 'Date', 'Requester', 'Project', 'Status']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { fontStyle: 'bold' },
                5: { halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 },
            willDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 5) {
                    const statusStr = data.cell.raw?.toString() || '';
                    if (statusStr === 'PENDING') data.cell.styles.textColor = [245, 158, 11];
                    else if (statusStr === 'REJECTED') data.cell.styles.textColor = [239, 68, 68];
                    else if (statusStr === 'APPROVED' || statusStr === 'COMPLETED' || statusStr === 'LPO_ISSUED') data.cell.styles.textColor = [16, 185, 129];
                    else data.cell.styles.textColor = [99, 102, 241];
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

        doc.save(`Premium_MR_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/60 backdrop-blur-xl border border-black/5 dark:border-white/5 p-4 rounded-2xl shadow-sm">
                <div className="flex flex-1 gap-3">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search MR number, requester, or project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background/50 border-black/5 dark:border-white/10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] bg-background/50 border-black/5 dark:border-white/10">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="QUOTING">Quoting</SelectItem>
                            <SelectItem value="LPO_ISSUED">LPO Issued</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={handleDownloadMasterPDF}
                        disabled={requisitions.length === 0}
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
                        Create Requisition
                    </Button>
                </div>
            </div>

            {/* Requisitions List */}
            <PremiumCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50">
                            <tr>
                                <th className="px-5 py-4 rounded-tl-xl border-b border-border/50 w-10"></th>
                                <th className="px-5 py-4 border-b border-border/50">MR Number</th>
                                <th className="px-5 py-4 border-b border-border/50">Date</th>
                                <th className="px-5 py-4 border-b border-border/50">Requester</th>
                                <th className="px-5 py-4 border-b border-border/50">Project</th>
                                <th className="px-5 py-4 border-b border-border/50">Status</th>
                                <th className="px-5 py-4 rounded-tr-xl border-b border-border/50 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            <span>Loading material requisitions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : requisitions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                                        No material requisitions found.
                                    </td>
                                </tr>
                            ) : (
                                requisitions.map((mr) => {
                                    const isExpanded = expandedRows[mr.id];

                                    return (
                                        <React.Fragment key={mr.id}>
                                            <tr
                                                className={`border - b border - border / 50 hover: bg - muted / 30 transition - colors group ${isExpanded ? 'bg-muted/10' : ''} `}
                                            >
                                                <td className="px-5 py-4 w-10 text-muted-foreground cursor-pointer" onClick={() => toggleExpand(mr.id)}>
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </td>
                                                <td className="px-5 py-4 cursor-pointer" onClick={() => toggleExpand(mr.id)}>
                                                    <div className="font-bold flex items-center gap-2 text-foreground">
                                                        <FileText className="w-4 h-4 text-primary shrink-0" />
                                                        {mr.mrNumber}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-muted-foreground cursor-pointer" onClick={() => toggleExpand(mr.id)}>
                                                    {format(new Date(mr.date), "dd MMM yyyy")}
                                                </td>
                                                <td className="px-5 py-4 cursor-pointer" onClick={() => toggleExpand(mr.id)}>
                                                    <div className="font-medium text-foreground">{mr.requester?.name || mr.requester?.username || "Unknown"}</div>
                                                </td>
                                                <td className="px-5 py-4 text-muted-foreground cursor-pointer" onClick={() => toggleExpand(mr.id)}>
                                                    {mr.project?.name || <span className="opacity-50 text-xs italic">General Inventory</span>}
                                                </td>
                                                <td className="px-5 py-4 cursor-pointer" onClick={() => toggleExpand(mr.id)}>
                                                    {getStatusBadge(mr.status)}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    {mr.status === 'PENDING' && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400"
                                                                onClick={() => handleStatusChange(mr.id, 'APPROVED')}
                                                                disabled={isUpdating === mr.id}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400"
                                                                onClick={() => handleStatusChange(mr.id, 'REJECTED')}
                                                                disabled={isUpdating === mr.id}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {(mr.status === 'APPROVED' || mr.status === 'QUOTING') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-400"
                                                            onClick={() => {
                                                                setQuoteMrId(mr.id);
                                                                setQuoteItems((mr.items || []).map((item: any) => ({
                                                                    mrItemId: item.id,
                                                                    itemCode: item.itemCode,
                                                                    itemDescription: item.itemDescription,
                                                                    quantity: item.quantity,
                                                                    unit: item.unit,
                                                                    unitPrice: 0,
                                                                    totalPrice: 0
                                                                })));
                                                                setQuoteData({ vendorId: "", attachmentFile: null, attachmentUrl: "" });
                                                                setIsQuoteOpen(true);
                                                            }}
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" />
                                                            Add Quote
                                                        </Button>
                                                    )}
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
                                                                        <th className="px-4 py-2 font-semibold text-left w-32">Approval Status</th>
                                                                        <th className="px-4 py-2 font-semibold text-left">Manager Comment</th>
                                                                        <th className="px-4 py-2 font-semibold text-right w-32">Quantity Required</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border/20">
                                                                    {mr.items?.map((item: any) => (
                                                                        <tr key={item.id} className="hover:bg-muted/30">
                                                                            <td className="px-4 py-3 text-foreground font-mono text-xs">{item.itemCode || '-'}</td>
                                                                            <td className="px-4 py-3 text-foreground font-medium">{item.itemDescription}</td>
                                                                            <td className="px-4 py-3">
                                                                                {item.approvalStatus === 'PENDING' && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>}
                                                                                {item.approvalStatus === 'APPROVED' && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
                                                                                {item.approvalStatus === 'REJECTED' && <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50"><XCircle className="w-3 h-3 mr-1" /> Fix/Reject</Badge>}
                                                                                {(!item.approvalStatus) && <Badge variant="outline" className="text-[10px] opacity-50">Unknown</Badge>}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-muted-foreground text-xs italic">
                                                                                {item.comments || "-"}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right text-muted-foreground">
                                                                                <span className="font-bold text-foreground mr-1">{item.quantity}</span>
                                                                                {item.unit}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    {!mr.items?.length && (
                                                                        <tr>
                                                                            <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground italic">No materials requested</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                            {mr.notes && (
                                                                <div className="p-4 border-t border-border/20 text-xs bg-muted/10">
                                                                    <span className="font-bold text-muted-foreground mr-2">Notes:</span>
                                                                    <span className="text-foreground">{mr.notes}</span>
                                                                </div>
                                                            )}
                                                            <div className="p-4 border-t border-border/20 flex justify-end gap-3 bg-background/50">
                                                                {(mr.status === 'PENDING' || mr.status === 'REJECTED') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setEditMrId(mr.id);
                                                                            setEditMrData({
                                                                                projectId: mr.projectId || "general",
                                                                                notes: mr.notes || "",
                                                                                items: mr.items.map((i: any) => ({
                                                                                    id: i.id,
                                                                                    itemCode: i.itemCode || "",
                                                                                    itemDescription: i.itemDescription || "",
                                                                                    quantity: i.quantity || 1,
                                                                                    unit: i.unit || "pcs"
                                                                                }))
                                                                            });
                                                                            setIsEditOpen(true);
                                                                        }}
                                                                        className="h-8 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400 mr-auto"
                                                                    >
                                                                        <Pencil className="w-4 h-4 mr-1" />
                                                                        Edit Requisition
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={async () => {
                                                                        const url = `${window.location.origin}/share/mr/${mr.id}`;
                                                                        try {
                                                                            if (navigator.clipboard && window.isSecureContext) {
                                                                                await navigator.clipboard.writeText(url);
                                                                                toast.success("Public Sharing Link Copied to Clipboard!");
                                                                            } else {
                                                                                throw new Error("Clipboard API not available");
                                                                            }
                                                                        } catch (err) {
                                                                            console.warn("Clipboard access failed, falling back to prompt.", err);
                                                                            prompt("Copy this secure link to share for approvals:", url);
                                                                        }
                                                                    }}
                                                                    className="text-xs h-8 gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                                                >
                                                                    Copy Approval Link
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleDownloadPDF(mr)}
                                                                    className="text-xs h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/10"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                    Download PDF
                                                                </Button>
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

            <CreateMaterialRequisitionDialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) fetchMRs();
                }}
                users={users}
                projects={projects}
                storeItems={storeItems}
            />

            <Dialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-white/10">
                    <DialogHeader>
                        <DialogTitle>Submit Vendor Quotation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Select Vendor *</Label>
                            <Select value={quoteData.vendorId} onValueChange={v => setQuoteData({ ...quoteData, vendorId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a vendor..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Itemized Pricing Table */}
                        <div className="space-y-2">
                            <Label>Itemized Pricing (QAR) *</Label>
                            <div className="border border-white/10 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Item</th>
                                            <th className="px-3 py-2 text-right w-20">Qty</th>
                                            <th className="px-3 py-2 text-right w-24">Unit Price</th>
                                            <th className="px-3 py-2 text-right w-24">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 bg-background/30">
                                        {quoteItems.map((item: any, index) => (
                                            <tr key={item.mrItemId}>
                                                <td className="px-3 py-2">
                                                    {item.itemCode && <span className="font-mono text-xs text-muted-foreground mr-2">[{item.itemCode}]</span>}
                                                    {item.itemDescription}
                                                </td>
                                                <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="h-7 text-xs text-right w-full"
                                                        value={item.unitPrice || ""}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const newItems = [...quoteItems];
                                                            newItems[index].unitPrice = val;
                                                            newItems[index].totalPrice = val * item.quantity;
                                                            setQuoteItems(newItems);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-primary">
                                                    {item.totalPrice.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-muted/30">
                                        <tr>
                                            <td colSpan={3} className="px-3 py-3 text-right font-bold">Grand Total:</td>
                                            <td className="px-3 py-3 text-right font-bold text-primary">
                                                {quoteItems.reduce((acc, item) => acc + item.totalPrice, 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>PDF Attachment (External PDF)</Label>
                            <Input
                                type="file"
                                accept="application/pdf"
                                onChange={e => setQuoteData({ ...quoteData, attachmentFile: e.target.files?.[0] || null })}
                                className="cursor-pointer file:text-primary file:bg-primary/10 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 hover:file:bg-primary/20 text-sm h-10"
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={async () => {
                                    const grandTotal = quoteItems.reduce((acc, item) => acc + item.totalPrice, 0);
                                    if (!quoteData.vendorId || grandTotal <= 0) {
                                        toast.error("Vendor and valid item prices are required.");
                                        return;
                                    }
                                    setIsQuoteLoading(true);

                                    const formData = new FormData();
                                    formData.append("vendorId", quoteData.vendorId);
                                    formData.append("mrId", quoteMrId);
                                    formData.append("totalAmount", grandTotal.toString());
                                    formData.append("items", JSON.stringify(quoteItems));

                                    if (quoteData.attachmentFile) {
                                        formData.append("attachmentFile", quoteData.attachmentFile);
                                    }

                                    const res = await submitQuotation(formData);
                                    if (res.success) {
                                        toast.success("Quote added!");
                                        setIsQuoteOpen(false);
                                        setQuoteData({ vendorId: "", attachmentFile: null, attachmentUrl: "" });
                                        setQuoteItems([]);
                                        router.refresh();
                                    } else {
                                        toast.error(res.error);
                                    }
                                    setIsQuoteLoading(false);
                                }}
                                disabled={isQuoteLoading}
                                className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20"
                            >
                                {isQuoteLoading ? "Saving..." : "Submit Quote"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Material Requisition Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-3xl bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                            Edit Material Requisition
                        </DialogTitle>
                        <DialogDescription>
                            Editing this requisition will reset any existing approvals and statuses back to PENDING.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-6 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Project</Label>
                                <Select value={editMrData.projectId} onValueChange={(v) => setEditMrData({ ...editMrData, projectId: v })}>
                                    <SelectTrigger className="bg-background/50 border-black/5 dark:border-white/10">
                                        <SelectValue placeholder="Select Project" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                                        <SelectItem value="general">General Inventory</SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes / Purpose</Label>
                                <Input
                                    placeholder="Enter reason for requisition..."
                                    value={editMrData.notes}
                                    onChange={(e) => setEditMrData({ ...editMrData, notes: e.target.value })}
                                    className="bg-background/50 border-black/5 dark:border-white/10 h-10"
                                />
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-lg font-bold text-foreground">Requested Items</Label>
                                <Button
                                    type="button"
                                    onClick={handleAddEditItem}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-primary/20 hover:bg-primary/10 text-primary"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Item
                                </Button>
                            </div>

                            <div className="border border-black/5 dark:border-white/10 rounded-xl overflow-hidden bg-background/30 max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium w-1/3">Item Description *</th>
                                            <th className="px-4 py-3 text-left font-medium w-1/4">Store Code (Optional)</th>
                                            <th className="px-4 py-3 text-right font-medium w-24">Qty *</th>
                                            <th className="px-4 py-3 text-left font-medium w-28">Unit</th>
                                            <th className="px-4 py-3 text-center font-medium w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {editMrData.items.map((item, index) => (
                                            <tr key={index} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <Input
                                                        required
                                                        placeholder="Item name..."
                                                        value={item.itemDescription}
                                                        onChange={(e) => {
                                                            const newItems = [...editMrData.items];
                                                            newItems[index].itemDescription = e.target.value;
                                                            setEditMrData({ ...editMrData, items: newItems });
                                                        }}
                                                        className="h-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/50"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Select
                                                        value={item.itemCode || "none"}
                                                        onValueChange={(v) => {
                                                            const newItems = [...editMrData.items];
                                                            if (v === "none") {
                                                                newItems[index].itemCode = "";
                                                            } else {
                                                                const selectedItem = storeItems.find(si => si.itemCode === v);
                                                                if (selectedItem) {
                                                                    newItems[index].itemCode = selectedItem.itemCode;
                                                                    newItems[index].itemDescription = selectedItem.name;
                                                                    newItems[index].unit = selectedItem.unit || 'pcs';
                                                                }
                                                            }
                                                            setEditMrData({ ...editMrData, items: newItems });
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/50 text-xs">
                                                            <SelectValue placeholder="Link store item" />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[200px]">
                                                            <SelectItem value="none" className="text-muted-foreground italic">No link (Custom)</SelectItem>
                                                            {storeItems.map(si => (
                                                                <SelectItem key={si.id} value={si.itemCode || si.id} className="text-xs">
                                                                    <span className="font-mono text-muted-foreground mr-2">[{si.itemCode}]</span>
                                                                    {si.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Input
                                                        required
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 1;
                                                            const newItems = [...editMrData.items];
                                                            newItems[index].quantity = val > 0 ? val : 1;
                                                            setEditMrData({ ...editMrData, items: newItems });
                                                        }}
                                                        className="h-9 text-right bg-background focus-visible:ring-1 focus-visible:ring-primary/50 pr-2"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Select
                                                        value={item.unit}
                                                        onValueChange={(v) => {
                                                            const newItems = [...editMrData.items];
                                                            newItems[index].unit = v;
                                                            setEditMrData({ ...editMrData, items: newItems });
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/50">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="pcs">pcs</SelectItem>
                                                            <SelectItem value="kg">kg</SelectItem>
                                                            <SelectItem value="m">m</SelectItem>
                                                            <SelectItem value="ltr">ltr</SelectItem>
                                                            <SelectItem value="box">box</SelectItem>
                                                            <SelectItem value="roll">roll</SelectItem>
                                                            <SelectItem value="set">set</SelectItem>
                                                            <SelectItem value="sheet">sheet</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveEditItem(index)}
                                                        disabled={editMrData.items.length === 1}
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <DialogFooter className="bg-background/20 p-4 -mx-6 -mb-6 border-t border-black/5 dark:border-white/10 mt-6 rounded-b-lg flex items-center justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isEditSubmitting}
                                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium shadow-lg shadow-primary/20 ml-2"
                            >
                                {isEditSubmitting ? "Saving changes..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
