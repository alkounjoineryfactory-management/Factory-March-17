"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PremiumCard } from "@/components/admin/premium-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MesReportClient({ data }: { data: any[] }) {

    // Helper to trigger CSV download
    const downloadCSV = (rows: any[][], filename: string) => {
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.click();
        document.body.removeChild(link);
    };

    // Helper to trigger PDF download
    const downloadPDF = (headers: string[], rowsData: any[][], title: string, filename: string) => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(title, 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

        autoTable(doc, {
            startY: 34,
            head: [headers],
            body: rowsData,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 8 }
        });

        doc.save(filename);
    };

    // 1. Workers Time Sheet
    const renderWorkersTimeSheet = () => {
        const headers = ["Date", "Employee Name", "Item Code", "Start Time", "End Time", "Actual Hrs", "Remarks"];

        const exportData = () => {
            const rows = [headers];
            data.forEach(job => {
                rows.push([
                    format(new Date(job.day), "yyyy-MM-dd"),
                    job.employee?.name || "Unassigned",
                    job.itemCode || "N/A",
                    job.startTime ? format(new Date(job.startTime), "HH:mm") : "",
                    job.endTime ? format(new Date(job.endTime), "HH:mm") : "",
                    Number(job.actualHrs || 0).toFixed(1),
                    job.remarks || ""
                ]);
            });
            downloadCSV(rows, "workers_time_sheet.csv");
        };

        const exportPDF = () => {
            const rows: any[][] = [];
            data.forEach(job => {
                rows.push([
                    format(new Date(job.day), "yyyy-MM-dd"),
                    job.employee?.name || "Unassigned",
                    job.itemCode || "N/A",
                    job.startTime ? format(new Date(job.startTime), "HH:mm") : "",
                    job.endTime ? format(new Date(job.endTime), "HH:mm") : "",
                    Number(job.actualHrs || 0).toFixed(1),
                    job.remarks || ""
                ]);
            });
            downloadPDF(headers, rows, "Workers Time Sheet", "workers_time_sheet.pdf");
        };

        return (
            <div className="space-y-4">
                <div className="flex justify-end gap-2">
                    <Button onClick={exportData} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button onClick={exportPDF} variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" /> Export PDF
                    </Button>
                </div>
                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(job => (
                                <TableRow key={job.id}>
                                    <TableCell>{format(new Date(job.day), "yyyy-MM-dd")}</TableCell>
                                    <TableCell>{job.employee?.name || <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                                    <TableCell>{job.itemCode || "-"}</TableCell>
                                    <TableCell>{job.startTime ? format(new Date(job.startTime), "HH:mm") : "-"}</TableCell>
                                    <TableCell>{job.endTime ? format(new Date(job.endTime), "HH:mm") : "-"}</TableCell>
                                    <TableCell className="font-medium">{Number(job.actualHrs || 0).toFixed(1)}</TableCell>
                                    <TableCell>{job.remarks || "-"}</TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No records found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    // 2. Balance Labour Hrs - Aggregate by Project + ItemCode
    const renderBalanceLabour = () => {
        // Group by Project + Item Code
        const grouped: Record<string, any> = {};

        data.forEach(job => {
            const key = `${job.project.name}_${job.itemCode || 'Unknown'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    project: job.project.name,
                    itemCode: job.itemCode || 'Unknown',
                    budgeted: 0,
                    actual: 0
                };
            }
            // Add budgeted only once per distinct job card or sum them all? 
            // In a real MES, budgeted is per item/job. We sum them up for the report line.
            grouped[key].budgeted += (job.budgetedLabourHrs || 0);
            grouped[key].actual += (job.actualHrs || 0);
        });

        const rowsData = Object.values(grouped).map(r => ({
            ...r,
            balance: r.budgeted - r.actual
        }));

        const headers = ["Project", "Item Code", "Budgeted Labour Hrs", "Actual Hrs", "Balance Labour Hrs"];

        const exportData = () => {
            const rows = [headers];
            rowsData.forEach(r => {
                rows.push([r.project, r.itemCode, Number(r.budgeted).toFixed(1), Number(r.actual).toFixed(1), Number(r.balance).toFixed(1)]);
            });
            downloadCSV(rows, "balance_labour_hrs.csv");
        };

        const exportPDF = () => {
            const rows: any[][] = [];
            rowsData.forEach(r => {
                rows.push([r.project, r.itemCode, Number(r.budgeted).toFixed(1), Number(r.actual).toFixed(1), Number(r.balance).toFixed(1)]);
            });
            downloadPDF(headers, rows, "Balance Labour Hrs Report", "balance_labour_hrs.pdf");
        };

        return (
            <div className="space-y-4">
                <div className="flex justify-end gap-2">
                    <Button onClick={exportData} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button onClick={exportPDF} variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" /> Export PDF
                    </Button>
                </div>
                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rowsData.map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{row.project}</TableCell>
                                    <TableCell>{row.itemCode}</TableCell>
                                    <TableCell>{Number(row.budgeted).toFixed(1)}</TableCell>
                                    <TableCell>{Number(row.actual).toFixed(1)}</TableCell>
                                    <TableCell>
                                        <Badge variant={row.balance < 0 ? "destructive" : "secondary"}>
                                            {Number(row.balance).toFixed(1)}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rowsData.length === 0 && (
                                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No records found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    // 3. Balance Material - Group by Project + ItemCode
    const renderBalanceMaterial = () => {
        const grouped: Record<string, any> = {};

        data.forEach(job => {
            const key = `${job.project.name}_${job.itemCode || 'Unknown'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    project: job.project.name,
                    itemCode: job.itemCode || 'Unknown',
                    budgetedMaterial: job.budgetedMaterialList || '-',
                    targetQty: 0,
                    actualQty: 0,
                    unit: job.unit || 'pcs'
                };
            }
            grouped[key].targetQty += (job.targetQty || 0);
            grouped[key].actualQty += (job.actualQty || 0);
            if (job.budgetedMaterialList && grouped[key].budgetedMaterial === '-') {
                grouped[key].budgetedMaterial = job.budgetedMaterialList;
            }
        });

        const rowsData = Object.values(grouped).map(r => ({
            ...r,
            balance: r.targetQty - r.actualQty
        }));

        const headers = ["Project", "Item Code", "Budgeted Material List", "Target Qty", "Actual Qty", "Balance Material"];

        const exportData = () => {
            const rows = [headers];
            rowsData.forEach(r => {
                rows.push([r.project, r.itemCode, `"${r.budgetedMaterial}"`, r.targetQty, r.actualQty, r.balance]);
            });
            downloadCSV(rows, "balance_material.csv");
        };

        const exportPDF = () => {
            const rows: any[][] = [];
            rowsData.forEach(r => {
                rows.push([r.project, r.itemCode, r.budgetedMaterial, `${r.targetQty} ${r.unit}`, `${r.actualQty} ${r.unit}`, r.balance]);
            });
            downloadPDF(headers, rows, "Balance Material Report", "balance_material.pdf");
        };

        return (
            <div className="space-y-4">
                <div className="flex justify-end gap-2">
                    <Button onClick={exportData} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button onClick={exportPDF} variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" /> Export PDF
                    </Button>
                </div>
                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rowsData.map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{row.project}</TableCell>
                                    <TableCell>{row.itemCode}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={row.budgetedMaterial}>{row.budgetedMaterial}</TableCell>
                                    <TableCell>{row.targetQty} {row.unit}</TableCell>
                                    <TableCell>{row.actualQty} {row.unit}</TableCell>
                                    <TableCell>
                                        <Badge variant={row.balance > 0 ? "outline" : "secondary"} className={row.balance < 0 ? "bg-amber-100 text-amber-800" : ""}>
                                            {row.balance > 0 ? `${row.balance} remaining` : row.balance === 0 ? "Completed" : `${Math.abs(row.balance)} over`}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rowsData.length === 0 && (
                                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No records found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };


    return (
        <PremiumCard className="p-2 sm:p-6 w-full">
            <Tabs defaultValue="workers" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="workers">Workers Time Sheet</TabsTrigger>
                    <TabsTrigger value="labour">Balance Labour Hrs</TabsTrigger>
                    <TabsTrigger value="material">Balance Material</TabsTrigger>
                </TabsList>

                <TabsContent value="workers" className="animate-in fade-in-50">
                    {renderWorkersTimeSheet()}
                </TabsContent>

                <TabsContent value="labour" className="animate-in fade-in-50">
                    {renderBalanceLabour()}
                </TabsContent>

                <TabsContent value="material" className="animate-in fade-in-50">
                    {renderBalanceMaterial()}
                </TabsContent>
            </Tabs>
        </PremiumCard>
    );
}
