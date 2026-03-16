"use client";

import { useState } from "react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, Plus, DownloadCloud, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreateTransactionDialog } from "./create-transaction-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;

interface LedgerTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accounts: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings?: any;
}

export default function LedgerTab({ transactions = [], accounts = [], settings }: LedgerTabProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [page, setPage] = useState(1);

    const pagedTransactions = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.ceil(transactions.length / PAGE_SIZE);

    const drawHeader = async (doc: any, title: string, refText: string) => {
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
        doc.text(title, pageWidth - 14, 22, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(refText, pageWidth - 14, 28, { align: "right" });
    };

    const handleDownloadLedger = async () => {
        const doc = new jsPDF("l", "mm", "a4"); // Landscape for ledger
        await drawHeader(doc, "GENERAL LEDGER EXTRACT", `Generated: ${new Date().toLocaleDateString()}`);

        const tableData = transactions.map((t) => [
            formatDate(t.date),
            t.reference,
            t.description,
            t.type,
            `From: ${t.creditAccount?.name || '-'} To: ${t.debitAccount?.name || '-'}`,
            formatCurrency(t.amount)
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['DATE', 'REF', 'DESCRIPTION', 'TYPE', 'ACCOUNTS AFFECTED', 'AMOUNT']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 5) {
                    data.cell.styles.halign = 'right';
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.section === 'head' && data.column.index === 5) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        doc.save(`General_Ledger_${new Date().getTime()}.pdf`);
    };

    const handleDownloadTransaction = async (t: any) => {
        const doc = new jsPDF("p", "mm", "a4");
        await drawHeader(doc, "TRANSACTION VOUCHER", `Ref No: ${t.reference}`);

        const pageWidth = doc.internal.pageSize.width;

        doc.setFillColor(248, 250, 252);
        doc.rect(14, 45, pageWidth - 28, 25, "F");
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.rect(14, 45, pageWidth - 28, 25, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("POSTING DATE", 19, 53);
        doc.text("TRANSACTION TYPE", 120, 53);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(formatDate(t.date), 19, 59);
        doc.text(`${t.type} Entry`, 120, 59);

        const tableData = [
            ['1', t.description, `Credits: ${t.creditAccount?.name}`, `Debits: ${t.debitAccount?.name}`, formatCurrency(t.amount)]
        ];

        autoTable(doc, {
            startY: 75,
            head: [['SN', 'DESCRIPTION', 'CREDIT A/C', 'DEBIT A/C', 'AMOUNT']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 10 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 4) {
                    data.cell.styles.halign = 'right';
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.section === 'head' && data.column.index === 4) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 30;

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);

        doc.line(14, finalY, 70, finalY);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text("Prepared By", 14, finalY + 5);

        doc.line(pageWidth - 70, finalY, pageWidth - 14, finalY);
        doc.text("Authorized By", pageWidth - 70, finalY + 5);


        doc.save(`Voucher_${t.reference}.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PremiumCard
                title="Transactions Ledger"
                description="A simplified view of all manual accounting entries and fund movements."
                icon={ArrowRightLeft}
                className="border-indigo-500/20 relative overflow-hidden"
                action={
                    <div className="flex gap-2">
                        <Button
                            onClick={handleDownloadLedger}
                            size="sm"
                            variant="outline"
                            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-8"
                        >
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Export Ledger
                        </Button>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 h-8"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Transaction
                        </Button>
                    </div>
                }
            >
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

                <div className="rounded-xl border border-white/5 bg-white/5 backdrop-blur-md overflow-hidden relative z-10 mt-4">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="w-[100px]">Date</TableHead>
                                <TableHead className="w-[120px]">Ref</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Account Affected</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right w-[80px]">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8 italic">
                                        No transactions recorded yet. Click &quot;New Transaction&quot; to add one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagedTransactions.map((t) => (
                                    <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                        <TableCell className="font-medium text-muted-foreground">
                                            {formatDate(t.date)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {t.reference}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{t.description}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {t.type} Entry
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-emerald-500 font-medium">From:</span>
                                                    <span className="text-muted-foreground">{t.creditAccount?.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-blue-500 font-medium">To:</span>
                                                    <span className="text-muted-foreground">{t.debitAccount?.name}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                            {formatCurrency(t.amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDownloadTransaction(t)}
                                                className="h-7 px-2 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-400/10"
                                                title="Download Voucher"
                                            >
                                                <DownloadCloud className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    totalItems={transactions.length}
                    pageSize={PAGE_SIZE}
                    onPrev={() => setPage(p => Math.max(1, p - 1))}
                    onNext={() => setPage(p => p + 1)}
                />
            </PremiumCard>

            <CreateTransactionDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                accounts={accounts}
            />
        </div>
    );
}
