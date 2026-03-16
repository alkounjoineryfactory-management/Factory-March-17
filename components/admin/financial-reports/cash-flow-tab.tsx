"use client";


import { useState } from "react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { CreatePurchaseOrderDialog } from "@/components/admin/procurement/create-purchase-order-dialog";
import { ReceivePaymentDialog } from "./receive-payment-dialog";
import { markPayablePaid } from "@/app/actions/financials";
import { CheckCircle2, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CashFlowTabProps {
    cashFlow: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        receivables: any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payables: any[];
        totalReceivables: number;
        totalPayables: number;
        netCashFlow: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projects: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendors: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings?: any;
}

export default function CashFlowTab({ cashFlow, projects, vendors, settings }: CashFlowTabProps) {
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
    const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { receivables, payables, totalReceivables, totalPayables, netCashFlow } = cashFlow;

    const isPositive = netCashFlow >= 0;

    const handleMarkPaid = async (poId: string) => {
        setIsLoading(true);
        try {
            const res = await markPayablePaid(poId);
            if (res.success) {
                toast.success("Payable marked as paid.");
            } else {
                toast.error(res.error || "Failed to mark as paid");
            }
        } catch {
            toast.error("Unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPayable = async (po: any) => {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;

        // 1. Elegant Header Background
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 40, "F");

        const factoryName = settings?.factoryName || "FACTORY MANAGER";
        const brandLogoUrl = settings?.logoUrl?.startsWith('http')
            ? settings.logoUrl
            : settings?.logoUrl
                ? `${window.location.origin}${settings.logoUrl}`
                : null;

        if (brandLogoUrl) {
            try {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => {
                        try {
                            const canvas = document.createElement("canvas");
                            const scale = 4;
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
                        } catch (e) { reject(e); }
                    };
                    img.onerror = (e) => reject(e);
                    img.src = brandLogoUrl;
                });
            } catch (err) {
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

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("PAYABLE SUMMARY", pageWidth - 14, 22, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Ref No: ${po.poNumber}`, pageWidth - 14, 28, { align: "right" });

        doc.setFillColor(248, 250, 252);
        doc.rect(14, 45, pageWidth - 28, 25, "F");
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.rect(14, 45, pageWidth - 28, 25, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("SUPPLIER", 19, 53);
        doc.text("ORDER DATE", 120, 53);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(po.vendor?.name || "Unknown Supplier", 19, 59);
        doc.text(formatDate(po.date), 120, 59);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 19, 66);

        const tableData = [
            ['1', `Pending Payment for ${po.poNumber}`, formatDate(po.date), formatCurrency(po.totalAmount)]
        ];

        autoTable(doc, {
            startY: 75,
            head: [['SN', 'DESCRIPTION', 'ORDER DATE', 'AMOUNT OWED']],
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
                    data.cell.styles.textColor = [225, 29, 72]; // rose 600
                }
                if (data.section === 'head' && data.column.index === 3) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20 || 95;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text("INTERNAL RECORD ONLY.", 14, finalY);

        doc.save(`Payable_${po.poNumber}.pdf`);
    };

    const handleDownloadReceivable = async (inv: any) => {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 40, "F");

        const factoryName = settings?.factoryName || "FACTORY MANAGER";
        const brandLogoUrl = settings?.logoUrl?.startsWith('http')
            ? settings.logoUrl
            : settings?.logoUrl
                ? `${window.location.origin}${settings.logoUrl}`
                : null;

        if (brandLogoUrl) {
            try {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => {
                        try {
                            const canvas = document.createElement("canvas");
                            const scale = 4;
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
                        } catch (e) { reject(e); }
                    };
                    img.onerror = (e) => reject(e);
                    img.src = brandLogoUrl;
                });
            } catch (err) {
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

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("RECEIVABLE STATEMENT", pageWidth - 14, 22, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Ref No: ${inv.invoiceNo}`, pageWidth - 14, 28, { align: "right" });

        doc.setFillColor(248, 250, 252);
        doc.rect(14, 45, pageWidth - 28, 25, "F");
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.rect(14, 45, pageWidth - 28, 25, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("CLIENT / PROJECT", 19, 53);
        doc.text("INVOICE DATE", 120, 53);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(inv.project?.client?.name || inv.project?.name || "Unknown", 19, 59);
        doc.text(formatDate(inv.date), 120, 59);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 19, 66);

        const tableData = [
            ['1', `${inv.type.replace('_', ' ')} Invoice`, formatDate(inv.date), formatCurrency(inv.amount)]
        ];

        autoTable(doc, {
            startY: 75,
            head: [['SN', 'DESCRIPTION', 'INVOICE DATE', 'ORIGINAL AMOUNT']],
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

        const finalY = (doc as any).lastAutoTable.finalY + 5 || 95;

        // Totals Box
        const summaryStartY = finalY;
        const alignRightX = pageWidth - 14;

        doc.setFillColor(248, 250, 252);
        doc.rect(pageWidth - 80, summaryStartY, 66, 25, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(pageWidth - 80, summaryStartY, 66, 25, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Total Receivable:", alignRightX - 62, summaryStartY + 7);
        doc.text("Payments Received:", alignRightX - 62, summaryStartY + 14);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(formatCurrency(inv.amount), alignRightX - 5, summaryStartY + 7, { align: "right" });

        doc.setTextColor(16, 185, 129); // emerald 500
        doc.text(formatCurrency(inv.paidAmount), alignRightX - 5, summaryStartY + 14, { align: "right" });

        const balance = inv.amount - inv.paidAmount;
        doc.setTextColor(245, 158, 11); // amber 500
        doc.text("Remaining Balance:", alignRightX - 62, summaryStartY + 21);
        doc.text(formatCurrency(balance), alignRightX - 5, summaryStartY + 21, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text("STATEMENT ONLY - NOT A TAX INVOICE", 14, summaryStartY + 45);

        doc.save(`Receivable_${inv.invoiceNo}.pdf`);
    };

    return (
        <div className="space-y-6">

            {/* Top KPI: Net Position */}
            <PremiumCard className="bg-gradient-to-br from-indigo-900 to-indigo-950 border-indigo-500/30 overflow-hidden relative">
                {/* Background Decor */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-4 gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-indigo-200">
                            <Wallet className="h-5 w-5" />
                            <span className="font-semibold tracking-wide uppercase text-sm">Net Cash Flow Position</span>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className={`text-4xl md:text-5xl font-black font-mono tracking-tight drop-shadow-md ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? '+' : ''}{formatCurrency(netCashFlow)}
                            </span>
                        </div>
                        <p className="text-indigo-200/70 text-sm mt-1 max-w-md">
                            The current financial standing based on pending authorized invoices (Receivables) minus active unpaid purchase orders (Payables).
                        </p>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col min-w-[160px]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-emerald-400 uppercase">Receivables</span>
                                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                            </div>
                            <span className="text-xl font-bold font-mono text-white">{formatCurrency(totalReceivables)}</span>
                        </div>

                        <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col min-w-[160px]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-rose-400 uppercase">Payables</span>
                                <ArrowDownRight className="h-4 w-4 text-rose-400" />
                            </div>
                            <span className="text-xl font-bold font-mono text-white">{formatCurrency(totalPayables)}</span>
                        </div>
                    </div>
                </div>
            </PremiumCard>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Receivables Table */}
                <PremiumCard
                    title="Account Receivables (AR)"
                    description="Money owed TO the factory by clients from pending invoices."
                    icon={ArrowUpRight}
                    className="border-emerald-500/20 shadow-emerald-500/5"
                    action={
                        <Button
                            onClick={() => setIsCreateInvoiceOpen(true)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 h-8"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Receivable
                        </Button>
                    }
                >
                    <div className="rounded-xl border border-white/10 dark:border-white/5 overflow-hidden mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="font-semibold px-4 py-3">Project / Invoice</TableHead>
                                    <TableHead className="font-semibold py-3">Due Date</TableHead>
                                    <TableHead className="font-semibold py-3 text-right">Amount Due</TableHead>
                                    <TableHead className="font-semibold py-3 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receivables.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                                            No pending receivables right now.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    receivables.map((inv) => {
                                        const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date();

                                        return (
                                            <TableRow key={inv.id} className="hover:bg-muted/10 transition-colors">
                                                <TableCell className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground">{inv.project.name}</span>
                                                        <span className="font-mono text-xs text-muted-foreground">{inv.invoiceNo}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-3">
                                                    <div className="flex flex-col items-start gap-1 text-sm">
                                                        {inv.dueDate ? formatDate(inv.dueDate) : 'No Due Date'}
                                                        {isOverdue && (
                                                            <Badge variant="destructive" className="h-4 px-1 text-[9px]">OVERDUE</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-right py-3 font-mono font-bold">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.amount)}</span>
                                                        {inv.paidAmount > 0 && (
                                                            <span className="text-[10px] text-emerald-500 font-semibold mt-0.5">
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
                                                            onClick={() => handleDownloadReceivable(inv)}
                                                            className="h-7 px-2 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                                                            title="Download Statement"
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
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </PremiumCard>

                {/* Payables Table */}
                <PremiumCard
                    title="Account Payables (AP)"
                    description="Money owed BY the factory to suppliers from active Purchase Orders."
                    icon={ArrowDownRight}
                    className="border-rose-500/20 shadow-rose-500/5"
                    action={
                        <Button
                            onClick={() => setIsCreatePOOpen(true)}
                            size="sm"
                            className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 h-8"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Payable
                        </Button>
                    }
                >
                    <div className="rounded-xl border border-white/10 dark:border-white/5 overflow-hidden mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="font-semibold px-4 py-3">Supplier / PO</TableHead>
                                    <TableHead className="font-semibold py-3">Order Date</TableHead>
                                    <TableHead className="font-semibold py-3 text-right">Amount Owed</TableHead>
                                    <TableHead className="font-semibold py-3 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payables.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                                            No active payables found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    payables.map((po) => (
                                        <TableRow key={po.id} className="hover:bg-muted/10 transition-colors">
                                            <TableCell className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{po.vendor?.name || 'Unknown Supplier'}</span>
                                                    <span className="font-mono text-xs text-muted-foreground">{po.poNumber}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3 text-sm">
                                                {formatDate(po.date)}
                                            </TableCell>

                                            <TableCell className="text-right py-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                                                {formatCurrency(po.totalAmount)}
                                            </TableCell>

                                            <TableCell className="text-right py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDownloadPayable(po)}
                                                        className="h-7 px-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                                                        title="Download Voucher"
                                                    >
                                                        <DownloadCloud className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleMarkPaid(po.id)}
                                                        disabled={isLoading}
                                                        className="h-7 px-3 text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 font-medium"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        Mark Paid
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </PremiumCard>

            </div>

            {/* Creation Dialogs */}
            <CreateInvoiceDialog
                open={isCreateInvoiceOpen}
                onOpenChange={setIsCreateInvoiceOpen}
                projects={projects}
            />

            <CreatePurchaseOrderDialog
                open={isCreatePOOpen}
                onOpenChange={setIsCreatePOOpen}
                vendors={vendors}
                projects={projects}
            />

            <ReceivePaymentDialog
                open={isReceivePaymentOpen}
                onOpenChange={setIsReceivePaymentOpen}
                invoice={selectedInvoice}
            />

        </div>
    );
}
