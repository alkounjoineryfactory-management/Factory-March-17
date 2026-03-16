import { prisma } from "@/lib/prisma";
import { getAdminUsers, getSystemSettings, getStorageStats } from "@/app/actions";
import SettingsTabs from "@/components/admin/settings-tabs";
import { Settings } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminPageLayout } from "@/components/admin/admin-page-layout";

export default async function SettingsPage() {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("adminId")?.value;

    if (!adminId) {
        redirect("/admin/login");
    }

    const adminUser = await prisma.user.findUnique({
        where: { id: adminId }
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
        redirect("/admin");
    }

    const adminUsers = await getAdminUsers();
    const systemSettings = await getSystemSettings();
    const storageStats = await getStorageStats();

    return (
        <AdminPageLayout
            title="System Settings"
            description="Manage Administrators and System Preferences."
        >
            <SettingsTabs
                adminUsers={adminUsers}
                systemSettings={systemSettings}
                storageStats={storageStats}
            />
        </AdminPageLayout>
    );
}
