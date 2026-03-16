"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Plus, MapPin, Phone, Mail, User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PremiumCard } from "@/components/admin/premium-card";
import { CreateVendorDialog } from "./create-vendor-dialog";

interface VendorsTabProps {}

export function VendorsTab({}: VendorsTabProps) {
    const [vendors, setVendors] = useState<any[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Extract unique categories (for now, hardcoded or fetched separately if needed. 
    // Mapped from current visible dataset to avoid another complex DB call just for filters 
    // or we can just provide predefined ones. Let's provide predefined ones commonly used.)
    const categories = ["Raw Materials", "Electronics", "Packaging", "Logistics", "Services", "Hardware", "Consumables"].sort();

    const fetchVendors = async () => {
        setIsLoading(true);
        // We use a debounce-like approach or just fetch directly 
        const { getVendors } = await import("@/app/actions/procurement");
        const res = await getVendors({
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm
            // NOTE: category filter is not supported — Vendor schema has no category field
        });
        
        if (res.success && res.vendors) {
            setVendors(res.vendors);
            setHasNextPage(res.hasNextPage || false);
        }
        setIsLoading(false);
    };

    // Fetch on mount and when dependencies change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchVendors();
        }, 300); // 300ms debounce for typing
        return () => clearTimeout(timeoutId);
    }, [currentPage, searchTerm, categoryFilter]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter]);

    // Calculate Pagination based on server response
    // Logic updated to use hasNextPage

    const handleDownloadVendorsPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(33, 37, 41);
        doc.text("APPROVED VENDORS LIST", pageWidth / 2, 20, { align: "center" });

        // Details block
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 35);
        if (categoryFilter !== "ALL") {
            doc.text(`Category: ${categoryFilter}`, 14, 42);
        }

        // Table using currently loaded page
        doc.setFont("helvetica", "normal");
        const tableData = vendors.map((vendor: any, index: number) => [
            (currentPage - 1) * itemsPerPage + index + 1,
            vendor.name,
            vendor.contactPerson || "N/A",
            vendor.phone || "N/A",
            vendor.email || "N/A",
            vendor.address || "N/A"
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['#', 'Vendor Name', 'Contact Person', 'Phone', 'Email', 'Address']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [63, 63, 70], textColor: 255, fontStyle: 'bold' },
            bodyStyles: { textColor: 50 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
        });

        doc.save(`Vendors_List_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/60 backdrop-blur-xl border border-black/5 dark:border-white/5 p-4 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search name, contact, phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
                        onClick={handleDownloadVendorsPDF}
                        disabled={vendors.length === 0}
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
                        Add Vendor
                    </Button>
                </div>
            </div>

            {/* Vendors List */}
            <PremiumCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50">
                            <tr>
                                <th className="px-5 py-4 rounded-tl-xl border-b border-border/50">Vendor Name</th>
                                <th className="px-5 py-4 border-b border-border/50">Contact Person</th>
                                <th className="px-5 py-4 border-b border-border/50">Phone</th>
                                <th className="px-5 py-4 border-b border-border/50">Email</th>
                                <th className="px-5 py-4 rounded-tr-xl border-b border-border/50">Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            <span>Loading vendors...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : vendors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                                        No vendors found.
                                    </td>
                                </tr>
                            ) : (
                                vendors.map((vendor) => (
                                    <tr
                                        key={vendor.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-foreground">{vendor.name}</div>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3" />
                                                {vendor.contactPerson || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3 h-3" />
                                                {vendor.phone || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3 h-3" />
                                                {vendor.email || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground max-w-[200px] truncate">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{vendor.address || "N/A"}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {(hasNextPage || currentPage > 1) && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-border/50 bg-muted/10">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-foreground">{Math.max((currentPage - 1) * itemsPerPage + vendors.length, 0)}</span> results
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
                            <div className="text-sm font-medium px-2">
                                Page {currentPage}
                            </div>
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
                )}
            </PremiumCard>

            <CreateVendorDialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) fetchVendors(); // Refresh after closing
                }}
            />
        </div>
    );
}
