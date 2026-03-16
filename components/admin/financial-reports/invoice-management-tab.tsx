"use client";

import { useState } from "react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, FileText, CalendarDays } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { updateInvoiceStatus } from "@/app/actions/financials";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { ReceivePaymentDialog } from "./receive-payment-dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DownloadCloud } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;

interface InvoiceManagementTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoices: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projects: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings?: any;
}

export default function InvoiceManagementTab({ invoices, projects, settings }: InvoiceManagementTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [page, setPage] = useState(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pagedInvoices = filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleStatusUpdate = async (invoiceId: string, currentStatus: string) => {
        const nextStatus = currentStatus === "PENDING" ? "PARTIALLY_PAID" : (currentStatus === "PARTIALLY_PAID" ? "PAID" : "PENDING");

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await updateInvoiceStatus(invoiceId, nextStatus as any);
            if (res.success) {
                toast.success(`Invoice marked as ${nextStatus.replace('_', ' ')}`);
            } else {
                toast.error("Failed to update status");
            }
        } catch {
            toast.error("Unexpected error updating status");
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ADVANCE': return 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900';
            case 'PROGRESS': return 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900';
            case 'FINAL': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900';
            default: return 'bg-gray-500/10 text-gray-600';
        }
    };

    const handleDownloadInvoice = async (inv: any) => {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;

        // 1. Elegant Header Background (Slate 900)
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 40, "F");

        const factoryName = settings?.factoryName || "FACTORY MANAGER";
        const brandLogoUrl = settings?.logoUrl?.startsWith('http')
            ? settings.logoUrl
            : settings?.logoUrl
                ? `${window.location.origin}${settings.logoUrl}`
                : null;

        // 2. Brand Logo & Factory Name
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
                // Fallback Logo
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

        // 3. Document Title (TAX INVOICE)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("TAX INVOICE", pageWidth - 14, 22, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Ref No: ${inv.invoiceNo}`, pageWidth - 14, 28, { align: "right" });

        // 4. Details Background Base
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, 45, pageWidth - 28, 30, "F");

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.rect(14, 45, pageWidth - 28, 30, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("BILLED TO", 19, 53);
        doc.text("INVOICE DATE", 120, 53);

        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(inv.project?.client?.name || "Unknown Client", 19, 59);
        doc.text(formatDate(inv.date), 120, 59);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`Project: ${inv.project?.name || '-'}`, 19, 66);
        if (inv.dueDate) {
            doc.text(`Due Date: ${formatDate(inv.dueDate)}`, 120, 66);
        }

        // 5. Line Items Table
        doc.setFont("helvetica", "normal");

        // Since invoices might not have line items directly in the current schema (just a total amount), 
        // we'll create a summary table row.
        const tableData = [
            [
                '1',
                `${inv.type.replace('_', ' ')} Invoice`,
                inv.month || '-',
                formatCurrency(inv.amount)
            ]
        ];

        autoTable(doc, {
            startY: 82,
            head: [['SN', 'DESCRIPTION', 'PERIOD', 'AMOUNT']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 10 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 3) {
                    data.cell.styles.halign = 'right';
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                }
                if (data.section === 'head' && data.column.index === 3) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 5 || 100;

        // 6. Totals Box
        const summaryStartY = finalY;
        const alignRightX = pageWidth - 14;

        doc.setFillColor(248, 250, 252);
        doc.rect(pageWidth - 80, summaryStartY, 66, 25, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(pageWidth - 80, summaryStartY, 66, 25, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Total Amount:", alignRightX - 62, summaryStartY + 7);
        doc.text("Amount Paid:", alignRightX - 62, summaryStartY + 14);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(formatCurrency(inv.amount), alignRightX - 5, summaryStartY + 7, { align: "right" });

        doc.setTextColor(16, 185, 129); // emerald 500
        doc.text(formatCurrency(inv.paidAmount), alignRightX - 5, summaryStartY + 14, { align: "right" });

        const balance = inv.amount - inv.paidAmount;
        doc.setTextColor(225, 29, 72); // rose 600
        doc.text("Balance Due:", alignRightX - 62, summaryStartY + 21);
        doc.text(formatCurrency(balance), alignRightX - 5, summaryStartY + 21, { align: "right" });

        // 7. Footer/Payment Info
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text("Please make payments to the designated bank account on file.", 14, summaryStartY + 45);
        doc.text("Thank you for your business!", 14, summaryStartY + 51);

        doc.save(`Invoice_${inv.invoiceNo}.pdf`);
    };

    return (
        <div className="space-y-6">
            <PremiumCard
                title="Invoice Ledger"
                description="Track all generated invoices, their types, amounts, and payment statuses."
                icon={FileText}
                action={
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" /> Record New Invoice
                    </Button>
                }
            >
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Invoice No or Project..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="pl-9 bg-background/50 border-white/10 dark:border-white/5"
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 dark:border-white/5 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="font-semibold px-4 py-3">Invoice No</TableHead>
                                <TableHead className="font-semibold py-3">Project</TableHead>
                                <TableHead className="font-semibold py-3">Type & Period</TableHead>
                                <TableHead className="font-semibold py-3">Date / Due</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Amount</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                        No invoices logged yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagedInvoices.map((inv) => (
                                    <TableRow key={inv.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell className="px-4 py-3 font-mono font-bold">
                                            {inv.invoiceNo}
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{inv.project.name}</span>
                                                <span className="font-mono text-[10px] text-muted-foreground">{inv.project.projectNumber}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${getTypeColor(inv.type)}`}>
                                                    {inv.type}
                                                </Badge>
                                                {inv.month && <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {inv.month}</span>}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm">{formatDate(inv.date)}</span>
                                                {inv.dueDate && (
                                                    <span className="text-xs text-muted-foreground mt-0.5">
                                                        Due: {formatDate(inv.dueDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right py-3 font-mono font-bold">
                                            <div className="flex flex-col items-end">
                                                <span>{formatCurrency(inv.amount)}</span>
                                                {inv.paidAmount > 0 && (
                                                    <span className="text-xs text-emerald-500 font-semibold mt-0.5">
                                                        Paid: {formatCurrency(inv.paidAmount)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownloadInvoice(inv)}
                                                    className="h-7 px-2 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-400/10"
                                                    title="Download PDF"
                                                >
                                                    <DownloadCloud className="h-4 w-4" />
                                                </Button>
                                                {inv.status !== 'PAID' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedInvoice(inv);
                                                            setIsReceivePaymentOpen(true);
                                                        }}
                                                        className="h-7 px-3 text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700"
                                                    >
                                                        Receive
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleStatusUpdate(inv.id, inv.status)}
                                                    className={`h-7 px-3 text-xs border w-32 justify-center transition-colors ${inv.status === 'PAID'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                                                        : inv.status === 'PARTIALLY_PAID'
                                                            ? 'bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20'
                                                            : 'bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20'
                                                        }`}
                                                >
                                                    {inv.status.replace('_', ' ')}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <PaginationBar
                    page={page}
                    totalPages={Math.ceil(filteredInvoices.length / PAGE_SIZE)}
                    totalItems={filteredInvoices.length}
                    pageSize={PAGE_SIZE}
                    onPrev={() => setPage(p => Math.max(1, p - 1))}
                    onNext={() => setPage(p => p + 1)}
                />
            </PremiumCard>

            {/* Create Invoice Dialog */}
            <CreateInvoiceDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                projects={projects}
            />

            {/* Receive Payment Dialog */}
            <ReceivePaymentDialog
                open={isReceivePaymentOpen}
                onOpenChange={setIsReceivePaymentOpen}
                invoice={selectedInvoice}
            />
        </div>
    );
}
