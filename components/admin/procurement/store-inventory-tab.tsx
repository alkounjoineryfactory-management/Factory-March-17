"use client";

import { useState, useEffect } from "react";
import { Plus, Search, History, Package, ArrowUpRight, ArrowDownRight, Download, ArrowLeftRight } from "lucide-react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createStoreItem, getStoreItemTransactions } from "@/app/actions/store";
import { StoreItemProjectBreakdownModal } from "./store-item-project-breakdown-modal";
import { StoreItemTransferModal } from "./store-item-transfer-modal";

interface StoreInventoryTabProps {}

export function StoreInventoryTab({}: StoreInventoryTabProps) {
    const [storeItems, setStoreItems] = useState<any[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");

    // Create Item Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newItem, setNewItem] = useState({ itemCode: "", name: "", category: "", unit: "pcs", initialStock: 0 });
    const [isLoading, setIsLoading] = useState(false);
    // History Dialog State
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyItem, setHistoryItem] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Breakdown Dialog State
    const [breakdownOpen, setBreakdownOpen] = useState(false);
    const [breakdownItem, setBreakdownItem] = useState<any>(null);

    // Transfer Dialog State
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferItem, setTransferItem] = useState<any>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const categories = Array.from(new Set(storeItems.map(item => item.category || "Uncategorized"))).filter(Boolean).sort();

    const fetchItems = async () => {
        setIsLoadingItems(true);
        const { getStoreItems } = await import("@/app/actions/store");
        const res = await getStoreItems({
            page: currentPage,
            limit: itemsPerPage,
            search: searchQuery,
            category: categoryFilter
        });
        
        if (res.success && res.items) {
            setStoreItems(res.items);
            setHasNextPage(res.hasNextPage || false);
        } else {
            toast.error(res.error || "Failed to fetch store items.");
            setStoreItems([]);
            setHasNextPage(false);
        }
        setIsLoadingItems(false);
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchItems();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [currentPage, searchQuery, categoryFilter]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter]);

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const res = await createStoreItem(newItem);
        if (res.success && res.storeItem) {
            toast.success("Store Item created successfully");
            fetchItems();
            setIsCreateOpen(false);
            setNewItem({ itemCode: "", name: "", category: "", unit: "pcs", initialStock: 0 });
        } else {
            toast.error(res.error || "Failed to create Store Item");
        }

        setIsLoading(false);
    };

    const handleViewHistory = async (item: any) => {
        setHistoryItem(item);
        setHistoryOpen(true);
        setIsLoadingHistory(true);

        const res = await getStoreItemTransactions(item.id);
        if (res.success && res.transactions) {
            setTransactions(res.transactions);
        } else {
            toast.error("Failed to load history");
            setTransactions([]);
        }

        setIsLoadingHistory(false);
    };

    const handleDownloadInventoryPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Premium Colors
        const primaryColor: [number, number, number] = [15, 23, 42]; // slate-900
        const accentColor: [number, number, number] = [99, 102, 241]; // indigo-500
        const textMuted: [number, number, number] = [100, 116, 139]; // slate-500

        // Header Background
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Document Title
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("FACTORY INVENTORY REPORT", 14, 25);

        // Subtitle / Date
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 200);
        doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 32);

        if (categoryFilter !== "ALL") {
            doc.text(`Filtered by Category: ${categoryFilter}`, pageWidth - 14, 32, { align: 'right' });
        }

        // Summary Statistics Calculation
        const totalItems = storeItems.length;
        const totalGeneral = storeItems.reduce((acc: number, item: any) => acc + item.currentStock, 0);
        const totalProject = storeItems.reduce((acc: number, item: any) => acc + (item.projectStock || 0), 0);
        const totalPhysical = storeItems.reduce((acc: number, item: any) => acc + (item.totalPhysicalStock || (item.currentStock + (item.projectStock || 0))), 0);
        const lowStockCount = storeItems.filter((item: any) => item.currentStock <= 5).length;

        // Draw KPI boxes
        const startY = 48;
        const boxWidth = (pageWidth - 28 - 15) / 4;
        const metrics = [
            { label: 'Total Items', value: totalItems.toString(), isAlert: false },
            { label: 'General Stock', value: totalGeneral.toString(), isAlert: false },
            { label: 'Project Stock', value: totalProject.toString(), isAlert: false },
            { label: 'Critical/Low', value: lowStockCount.toString(), isAlert: lowStockCount > 0 }
        ];

        metrics.forEach((metric, index) => {
            const x = 14 + (boxWidth + 5) * index;
            // Box
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, startY, boxWidth, 20, 2, 2, 'FD');
            
            // Text
            doc.setFontSize(9);
            doc.setTextColor(...textMuted);
            doc.text(metric.label, x + boxWidth / 2, startY + 7, { align: 'center' });
            
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            if (metric.isAlert) {
                doc.setTextColor(239, 68, 68);
            } else {
                doc.setTextColor(30, 41, 59);
            }
            doc.text(metric.value, x + boxWidth / 2, startY + 16, { align: 'center' });
        });

        // Table
        const tableData = storeItems.map((item: any, index: number) => [
            index + 1,
            item.itemCode,
            item.name,
            item.category || "General",
            `${item.currentStock} ${item.unit}`,
            `${item.projectStock || 0} ${item.unit}`,
            `${item.currentStock + (item.projectStock || 0)} ${item.unit}`,
            item.currentStock <= 5 ? 'CRITICAL' : 'OPTIMAL'
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['#', 'Item Code', 'Item Name', 'Category', 'Gen. Stock', 'Proj. Stock', 'Total', 'Status']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3, font: "helvetica" },
            headStyles: { 
                fillColor: [15, 23, 42], 
                textColor: 255, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { fontStyle: 'bold' },
                4: { halign: 'right', fontStyle: 'bold' },
                5: { halign: 'right', textColor: [99, 102, 241] as [number, number, number], fontStyle: 'bold' },
                6: { halign: 'right', fontStyle: 'bold' },
                7: { halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 },
            willDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 7) {
                    const statusStr = data.cell.raw?.toString() || '';
                    if (statusStr === 'CRITICAL') {
                        data.cell.styles.textColor = [239, 68, 68];
                    } else {
                        data.cell.styles.textColor = [16, 185, 129];
                    }
                }
                if (data.section === 'body' && data.column.index === 4) {
                     const currentStock = parseInt(data.cell.raw?.toString() || '0');
                     if (currentStock <= 5) data.cell.styles.textColor = [239, 68, 68];
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

        doc.save(`Premium_Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 backdrop-blur-xl border border-black/5 dark:border-white/5 p-4 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search code, name, category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background/50 border-black/5 dark:border-white/10"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-black/5 dark:border-white/10">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Categories</SelectItem>
                            {categories.map((cat: any) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={handleDownloadInventoryPDF}
                        disabled={storeItems.length === 0}
                        className="flex-1 sm:flex-none bg-card hover:bg-muted/50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-white/10">
                            <DialogHeader>
                                <DialogTitle>Create New Store Item</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateItem} className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="itemCode" className="text-right">
                                        Item Code
                                    </Label>
                                    <Input
                                        id="itemCode"
                                        value={newItem.itemCode}
                                        onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="category" className="text-right">
                                        Category
                                    </Label>
                                    <Input
                                        id="category"
                                        value={newItem.category}
                                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="unit" className="text-right">
                                        Unit
                                    </Label>
                                    <Input
                                        id="unit"
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="initialStock" className="text-right">
                                        Initial Stock
                                    </Label>
                                    <Input
                                        id="initialStock"
                                        type="number"
                                        value={newItem.initialStock}
                                        onChange={(e) => setNewItem({ ...newItem, initialStock: parseInt(e.target.value) || 0 })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Creating..." : "Create Item"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {isLoadingItems ? (
                <PremiumCard>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p>Loading store items...</p>
                    </div>
                </PremiumCard>
            ) : storeItems.length === 0 ? (
                <PremiumCard>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mb-4 opacity-20" />
                        <p>No store items found.</p>
                    </div>
                </PremiumCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {storeItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                setBreakdownItem(item);
                                setBreakdownOpen(true);
                            }}
                            className="relative group p-6 rounded-3xl border border-white/10 dark:border-white/5 bg-gradient-to-br from-card/80 to-card/40 hover:from-card/90 hover:to-card/60 backdrop-blur-xl shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden flex flex-col justify-between cursor-pointer"
                        >

                            {/* Decorative Background Elements */}
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
                            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />

                            <div className="relative z-10 flex flex-col gap-4">
                                {/* Header: Badge & Category */}
                                <div className="flex items-start justify-between">
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono text-xs px-2 py-0.5">
                                        {item.itemCode}
                                    </Badge>
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                                        <Package className="h-3 w-3" />
                                        {item.category || "General"}
                                    </div>
                                </div>

                                {/* Title & Subtitle */}
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight text-foreground line-clamp-1">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">Premium factory material.</p>
                                </div>
                            </div>

                            {/* Stock Indicator & Actions */}
                            <div className="relative z-10 mt-6 pt-4 border-t border-white/10 dark:border-white/5 flex items-end justify-between">
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">General Stock</p>
                                        <div className={`text-2xl font-black tracking-tighter flex items-end gap-1 ${item.currentStock <= 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {item.currentStock}
                                            <span className="text-sm font-bold opacity-60 mb-0.5 tracking-normal">{item.unit}</span>
                                        </div>
                                    </div>
                                    <div className="pl-4 border-l border-white/5 dark:border-white/5">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Project Stock</p>
                                        <div className="text-2xl font-black tracking-tighter flex items-end gap-1 text-indigo-500">
                                            {item.projectStock || 0}
                                            <span className="text-sm font-bold opacity-60 mb-0.5 tracking-normal">{item.unit}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="rounded-xl h-10 w-10 border-white/10 bg-card/50 hover:bg-orange-500/10 hover:text-orange-500 hover:border-orange-500/20 transition-colors shadow-none"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTransferItem(item);
                                            setTransferOpen(true);
                                        }}
                                    >
                                        <ArrowLeftRight className="h-4 w-4" />
                                        <span className="sr-only">Transfer</span>
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="rounded-xl h-10 w-10 border-white/10 bg-card/50 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors shadow-none"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewHistory(item);
                                        }}
                                    >
                                        <History className="h-4 w-4" />
                                        <span className="sr-only">Ledger</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-5 py-4 border border-black/5 dark:border-white/5 bg-card/60 backdrop-blur-xl rounded-2xl">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    Showing results for page <span className="font-medium text-foreground">{currentPage}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="bg-background/50"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={!hasNextPage}
                        className="bg-background/50"
                    >
                        Next
                    </Button>
                </div>
            </div>

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-white/10 max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Transaction Ledger: {historyItem?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        {isLoadingHistory ? (
                            <div className="text-center py-4 text-muted-foreground animate-pulse">Loading history...</div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">No transactions recorded yet.</div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx) => {
                                    let typeLabel = "Activity";
                                    let isPositive = false;
                                    let iconColor = "bg-muted text-muted-foreground";

                                    if (tx.type === 'IN') {
                                        typeLabel = "Goods Received";
                                        isPositive = true;
                                        iconColor = "bg-emerald-500/20 text-emerald-500";
                                    } else if (tx.type === 'OUT') {
                                        typeLabel = "Material Consumption";
                                        isPositive = false;
                                        iconColor = "bg-red-500/20 text-red-500";
                                    } else if (tx.type === 'TRANSFER_TO_PROJECT') {
                                        typeLabel = "Transferred to Project";
                                        isPositive = false; // Taking out of general stock
                                        iconColor = "bg-orange-500/20 text-orange-500";
                                    } else if (tx.type === 'TRANSFER_TO_GENERAL') {
                                        typeLabel = "Transferred to General";
                                        isPositive = true; // Bringing into general stock
                                        iconColor = "bg-blue-500/20 text-blue-500";
                                    }

                                    return (
                                        <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${iconColor}`}>
                                                    {isPositive ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">
                                                        {typeLabel}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        Ref: {tx.reference || 'N/A'} • {new Date(tx.date).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {isPositive ? '+' : '-'}{tx.quantity}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <StoreItemProjectBreakdownModal
                open={breakdownOpen}
                onOpenChange={setBreakdownOpen}
                item={breakdownItem}
            />

            <StoreItemTransferModal
                open={transferOpen}
                onOpenChange={setTransferOpen}
                item={transferItem}
                onTransferred={() => {
                    // Triggers an immediate refresh of the parent state when a transfer completes
                    window.location.reload(); 
                }}
            />
        </div>
    );
}
