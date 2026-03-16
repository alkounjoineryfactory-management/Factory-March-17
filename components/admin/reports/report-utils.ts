import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportData {
    summary: {
        totalHours: number;
        totalQty: number;
        totalTasks: number;
        completionPercentage: number;
    };
    weeklyBreakdown: {
        weekNumber: number;
        hoursWorked: number;
        qtyProduced: number;
    }[];
    sectionBreakdown: {
        sectionName: string;
        totalHours: number;
        machineUsageHours: number;
    }[];
    employeeStats: {
        workerName: string;
        totalHours: number;
        tasksCompleted: number;
        efficiency: number;
    }[];
}

export const handleExportPDF = (data: ReportData, projectName: string, startDate?: Date, endDate?: Date) => {
    const doc = new jsPDF();
    const dateRangeStr = startDate && endDate
        ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        : "All Time";

    // Title
    doc.setFontSize(18);
    doc.text("Project Report", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Project: ${projectName}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);
    doc.text(`Period: ${dateRangeStr}`, 14, 42);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Executive Summary", 14, 52);

    autoTable(doc, {
        startY: 56,
        head: [['Metric', 'Value']],
        body: [
            ['Total Hours Worked', data.summary.totalHours.toFixed(1)],
            ['Total Quantity Produced', data.summary.totalQty.toString()],
            ['Total Tasks', data.summary.totalTasks.toString()],
            ['Completion', `${data.summary.completionPercentage}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] }
    });

    // Employee Performance
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Team Performance", 14, finalY);

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Employee', 'Total Hours', 'Tasks Completed', 'Efficiency']],
        body: data.employeeStats.map(e => [
            e.workerName,
            e.totalHours.toFixed(1),
            e.tasksCompleted.toString(),
            `${e.efficiency}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] } // Blue header
    });

    doc.save(`Report_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const handleExportExcel = (data: ReportData, projectName: string, startDate?: Date, endDate?: Date) => {
    const wb = XLSX.utils.book_new();
    const dateRangeStr = startDate && endDate
        ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        : "All Time";

    // Sheet 1: Summary
    const summaryData = [
        ["Metric", "Value"],
        ["Project", projectName],
        ["Generated Date", new Date().toLocaleDateString()],
        ["Period", dateRangeStr],
        ["Total Hours", data.summary.totalHours],
        ["Total Qty", data.summary.totalQty],
        ["Total Tasks", data.summary.totalTasks],
        ["Completion %", data.summary.completionPercentage]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2: Employee Stats
    const wsEmployees = XLSX.utils.json_to_sheet(data.employeeStats);
    XLSX.utils.book_append_sheet(wb, wsEmployees, "Team Performance");

    // Sheet 3: Weekly Data
    const wsWeekly = XLSX.utils.json_to_sheet(data.weeklyBreakdown);
    XLSX.utils.book_append_sheet(wb, wsWeekly, "Weekly Progress");

    XLSX.writeFile(wb, `Report_${projectName.replace(/\s+/g, '_')}.xlsx`);
};
