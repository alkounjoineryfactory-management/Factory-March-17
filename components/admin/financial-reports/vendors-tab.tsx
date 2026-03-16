"use client";

import { useState } from "react";
import { PremiumCard } from "@/components/admin/premium-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, ExternalLink, Mail, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";

const PAGE_SIZE = 10;

interface VendorsTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendors: any[];
}

export default function VendorsTab({ vendors }: VendorsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.email && v.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const pagedVendors = filteredVendors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Calculate total payables owed to this vendor (for POs that are received/delivered)
    // In a real application, you might want this precise aggregation to happen on the backend
    // For this dashboard, we'll calculate it from the available vendor.purchaseOrders array if nested,
    // otherwise we just display the vendor info.
    // Assuming vendors were fetched with include: { purchaseOrders: true }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getVendorPayables = (vendor: any) => {
        if (!vendor.purchaseOrders) return 0;
        const payableStatuses = ["DELIVERED_PARTIAL", "DELIVERED_FULL", "RECEIVED"];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activePayables = vendor.purchaseOrders.filter((po: any) => payableStatuses.includes(po.status));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return activePayables.reduce((sum: number, po: any) => sum + po.totalAmount, 0);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PremiumCard
                title="Vendor Directory & Payables"
                description="Manage all your factory suppliers and view outstanding payable balances."
                icon={Users}
            >
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Vendor Name, Contact, or Email..."
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
                                <TableHead className="font-semibold px-4 py-3">Vendor / Supplier</TableHead>
                                <TableHead className="font-semibold py-3">Contact Person</TableHead>
                                <TableHead className="font-semibold py-3">Contact Info</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Active Payables (Balance)</TableHead>
                                <TableHead className="font-semibold py-3 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredVendors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                        No vendors found matching your generic search.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagedVendors.map((vendor) => {
                                    const payables = getVendorPayables(vendor);

                                    return (
                                        <TableRow key={vendor.id} className="hover:bg-muted/10 transition-colors">
                                            <TableCell className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground">{vendor.name}</span>
                                                    <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">
                                                        {vendor.address || "No address provided"}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3">
                                                <span className="font-medium">{vendor.contactPerson || "—"}</span>
                                            </TableCell>

                                            <TableCell className="py-3">
                                                <div className="flex flex-col gap-1.5 min-w-[150px]">
                                                    {vendor.email && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Mail className="h-3 w-3" /> {vendor.email}
                                                        </div>
                                                    )}
                                                    {vendor.phone && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Phone className="h-3 w-3" /> {vendor.phone}
                                                        </div>
                                                    )}
                                                    {!vendor.email && !vendor.phone && (
                                                        <span className="text-xs text-muted-foreground italic">No contact info</span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right py-3">
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-mono font-bold ${payables > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                        {formatCurrency(payables)}
                                                    </span>
                                                    {payables > 0 && (
                                                        <Badge variant="outline" className="mt-1 text-[9px] bg-rose-500/10 text-rose-500 border-none">
                                                            Outstanding
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 group hover:bg-indigo-500/10 hover:text-indigo-600"
                                                >
                                                    <span className="text-xs mr-1 opacity-0 group-hover:opacity-100 transition-opacity">Details</span>
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <PaginationBar
                    page={page}
                    totalPages={Math.ceil(filteredVendors.length / PAGE_SIZE)}
                    totalItems={filteredVendors.length}
                    pageSize={PAGE_SIZE}
                    onPrev={() => setPage(p => Math.max(1, p - 1))}
                    onNext={() => setPage(p => p + 1)}
                />
            </PremiumCard>
        </div>
    );
}
