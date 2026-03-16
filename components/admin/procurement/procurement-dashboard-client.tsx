"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseOrdersTab } from "./purchase-orders-tab";
import { VendorsTab } from "./vendors-tab";
import { MaterialRequisitionsTab } from "./material-requisitions-tab";
import { StoreInventoryTab } from "./store-inventory-tab";
import { QuotationsTab } from "./quotations-tab";
import { GoodsReceiptTab } from "./goods-receipt-tab";
import { ProcurementSummaryCards } from "./procurement-summary-cards";

interface ProcurementDashboardClientProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialVendors: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialPurchaseOrders: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialMaterialRequisitions: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialStoreItems: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projects: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    systemSettings?: any;
}

export function ProcurementDashboardClient({
    initialVendors,
    initialPurchaseOrders,
    initialMaterialRequisitions,
    initialStoreItems,
    projects,
    users,
    systemSettings
}: ProcurementDashboardClientProps) {
    const [vendors, setVendors] = useState(initialVendors);
    const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
    const [materialRequisitions, setMaterialRequisitions] = useState(initialMaterialRequisitions);
    const [storeItems, setStoreItems] = useState(initialStoreItems);

    useEffect(() => {
        // Only set if different to avoid infinite trigger, but generally passing initialData to state directly is an anti-pattern unless it's strictly a default. 
        // Here we rely on it just pushing updates down.
        if (JSON.stringify(vendors) !== JSON.stringify(initialVendors)) setVendors(initialVendors);
        if (JSON.stringify(purchaseOrders) !== JSON.stringify(initialPurchaseOrders)) setPurchaseOrders(initialPurchaseOrders);
        if (JSON.stringify(materialRequisitions) !== JSON.stringify(initialMaterialRequisitions)) setMaterialRequisitions(initialMaterialRequisitions);
        if (JSON.stringify(storeItems) !== JSON.stringify(initialStoreItems)) setStoreItems(initialStoreItems);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialVendors, initialPurchaseOrders, initialMaterialRequisitions, initialStoreItems]);

    return (
        <div className="flex flex-col space-y-2">
            <ProcurementSummaryCards
                vendors={vendors}
                purchaseOrders={purchaseOrders}
                materialRequisitions={materialRequisitions}
                storeItems={storeItems}
            />

            <Tabs defaultValue="store-inventory" className="w-full">
                <TabsList className="bg-card border border-border/50 text-muted-foreground w-full justify-start rounded-xl p-1 mb-6 flex-wrap h-auto">
                    <TabsTrigger value="store-inventory" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all duration-300 font-semibold tracking-wide flex-1 sm:flex-none py-2 shrink-0">
                        Store Inventory
                    </TabsTrigger>
                    <TabsTrigger value="material-requisitions" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all duration-300 font-semibold tracking-wide flex-1 sm:flex-none py-2 shrink-0">
                        Material Requisitions
                    </TabsTrigger>
                    <TabsTrigger value="quotations" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all duration-300 font-semibold tracking-wide flex-1 sm:flex-none py-2 shrink-0">
                        Quotation Compare
                    </TabsTrigger>
                    <TabsTrigger value="local-purchase-orders" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all duration-300 font-semibold tracking-wide flex-1 sm:flex-none py-2 shrink-0">
                        Local POs (LPO)
                    </TabsTrigger>
                    <TabsTrigger value="goods-receipt" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all duration-300 font-semibold tracking-wide flex-1 sm:flex-none py-2 shrink-0">
                        Goods Receipt
                    </TabsTrigger>
                    <TabsTrigger value="vendors" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all duration-300 font-semibold tracking-wide flex-1 sm:flex-none py-2 shrink-0">
                        Vendors
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="store-inventory" className="m-0 mt-4 focus-visible:outline-none focus-visible:ring-0">
                    <StoreInventoryTab />
                </TabsContent>

                <TabsContent value="material-requisitions" className="m-0 mt-4 focus-visible:outline-none focus-visible:ring-0">
                    <MaterialRequisitionsTab
                        projects={projects}
                        users={users}
                        vendors={vendors}
                        storeItems={storeItems}
                        settings={systemSettings}
                    />
                </TabsContent>

                <TabsContent value="quotations" className="m-0 mt-4 focus-visible:outline-none focus-visible:ring-0">
                    <QuotationsTab settings={systemSettings} />
                </TabsContent>

                <TabsContent value="local-purchase-orders" className="m-0 mt-4 focus-visible:outline-none focus-visible:ring-0">
                    <PurchaseOrdersTab
                        vendors={vendors}
                        projects={projects}
                        settings={systemSettings}
                    />
                </TabsContent>

                <TabsContent value="goods-receipt" className="m-0 mt-4 focus-visible:outline-none focus-visible:ring-0">
                    <GoodsReceiptTab settings={systemSettings} />
                </TabsContent>

                <TabsContent value="vendors" className="m-0 mt-4 focus-visible:outline-none focus-visible:ring-0">
                    <VendorsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
