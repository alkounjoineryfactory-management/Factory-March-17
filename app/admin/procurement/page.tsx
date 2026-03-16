import { redirect } from "next/navigation";
import { getCurrentAdmin, getSystemSettings, getProjects, getAdminUsers } from "@/app/actions";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { ProcurementDashboardClient } from "@/components/admin/procurement/procurement-dashboard-client";
import { getVendors, getPurchaseOrders, getMaterialRequisitions } from "@/app/actions/procurement";
import { getStoreItems } from "@/app/actions/store";

export const metadata = {
    title: "Procurement | Factory Manager",
    description: "Manage vendors and purchase orders",
};

export default async function ProcurementPage() {
    const user = await getCurrentAdmin();
    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "FACTORY_MANAGER")) {
        redirect("/kiosk/login");
    }

    const [systemSettingsResult, vendorsResult, posResult, requisitionsResult, storeItemsResult, projectsResult, usersResult] = await Promise.all([
        getSystemSettings(),
        getVendors(),
        getPurchaseOrders(),
        getMaterialRequisitions(),
        getStoreItems(),
        getProjects(),
        getAdminUsers(),
    ]);

    const systemSettings = systemSettingsResult;
    const vendors = vendorsResult.success ? (vendorsResult.vendors || []) : [];
    const purchaseOrders = posResult.success ? (posResult.purchaseOrders || []) : [];
    const materialRequisitions = requisitionsResult.success ? (requisitionsResult.requisitions || []) : [];
    const storeItems = storeItemsResult.success ? (storeItemsResult.items || []) : [];
    const projects = Array.isArray(projectsResult) ? projectsResult : (projectsResult as any)?.projects || [];
    const users = Array.isArray(usersResult) ? usersResult : [];

    return (
        <AdminPageLayout
            title="Procurement"
            description="Manage vendors, suppliers, and purchase orders."
        >
            <div className="max-w-7xl mx-auto space-y-6">
                <ProcurementDashboardClient
                    initialVendors={vendors}
                    initialPurchaseOrders={purchaseOrders}
                    initialMaterialRequisitions={materialRequisitions}
                    initialStoreItems={storeItems}
                    projects={projects}
                    users={users}
                    systemSettings={systemSettings}
                />
            </div>
        </AdminPageLayout>
    );
}
