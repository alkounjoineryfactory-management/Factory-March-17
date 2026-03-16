"use client";

import { useMemo } from "react";
import { Store, ShoppingCart, FileText, AlertTriangle, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProcurementSummaryCardsProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendors: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    purchaseOrders: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    materialRequisitions: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storeItems: any[];
}

export function ProcurementSummaryCards({ vendors, purchaseOrders, materialRequisitions, storeItems }: ProcurementSummaryCardsProps) {
    // 1. Total Active Vendors
    const activeVendors = vendors.length;

    // 2. Active Purchase Orders
    const activePOs = useMemo(() => {
        return purchaseOrders.filter(po => {
            const inactiveStatuses = ["DELIVERED_FULL", "RECEIVED", "CANCELLED", "PAID"];
            return !inactiveStatuses.includes(po.status);
        });
    }, [purchaseOrders]);

    const activePOValue = useMemo(() => {
        return activePOs.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    }, [activePOs]);

    // 3. Pending Material Requisitions
    const pendingRequisitions = useMemo(() => {
        return materialRequisitions.filter(mr => mr.status === "PENDING" || mr.status === "APPROVED");
    }, [materialRequisitions]);

    // 4. Low Stock Alerts
    const lowStockItems = useMemo(() => {
        return storeItems.filter(item => item.currentStock <= item.minStockLevel);
    }, [storeItems]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            {/* CARD 1: ACTIVE VENDORS */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl">
                        <Store className="w-5 h-5 text-blue-500" />
                    </div>
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Registered Vendors</h3>
                    <p className="text-3xl font-bold font-mono tracking-tight text-foreground">
                        {activeVendors}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-blue-500" /> Total supplier network
                    </p>
                </div>
            </div>

            {/* CARD 2: ACTIVE PURCHASE ORDERS */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                        <ShoppingCart className="w-5 h-5 text-emerald-500" />
                    </div>
                    {activePOs.length > 0 && (
                        <Badge variant="outline" className="font-mono text-emerald-500 border-emerald-500/30">
                            {activePOs.length} Active
                        </Badge>
                    )}
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">In-Transit Value (LPO)</h3>
                    <p className="text-3xl font-bold font-mono tracking-tight text-emerald-500">
                        {formatCurrency(activePOValue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        Total value of pending deliveries
                    </p>
                </div>
            </div>

            {/* CARD 3: PENDING REQUISITIONS */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 bg-orange-500/10 rounded-xl">
                        <FileText className="w-5 h-5 text-orange-500" />
                    </div>
                </div>

                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Pending/Approved MRs</h3>
                    <p className="text-3xl font-bold font-mono tracking-tight text-orange-500">
                        {pendingRequisitions.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        Material requisitions requiring action
                    </p>
                </div>
            </div>

            {/* CARD 4: LOW STOCK ALERTS */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1">
                <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity ${lowStockItems.length > 0 ? 'bg-rose-500' : 'bg-zinc-500'}`}></div>

                <div className="flex justify-between items-start mb-4 relative z-10 xl:mb-2">
                    <div className={`p-2.5 rounded-xl ${lowStockItems.length > 0 ? 'bg-rose-500/10' : 'bg-zinc-500/10'}`}>
                        {lowStockItems.length > 0 ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <Package className="w-5 h-5 text-zinc-500" />}
                    </div>
                    {lowStockItems.length > 0 && (
                        <Badge variant="outline" className="font-mono text-rose-500 border-rose-500/30">
                            Action Needed
                        </Badge>
                    )}
                </div>

                <div className="relative z-10 space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1 hidden xl:block">Inventory Health</h3>

                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            {lowStockItems.length > 0 ? <ArrowDownRight className="w-3 h-3 text-rose-500" /> : <Package className="w-3 h-3 text-emerald-500" />}
                            Items Low Stock
                        </span>
                        <span className={`font-mono font-medium ${lowStockItems.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{lowStockItems.length}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Package className="w-3 h-3 text-emerald-500" /> Total Items</span>
                        <span className="font-mono font-medium text-foreground">{storeItems.length}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
