import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/app/actions";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { getProjectWorkspaceData } from "@/app/actions/projects";
import { ProjectWorkspaceClient } from "@/components/admin/projects/project-workspace-client";

export default async function ProjectWorkspacePage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const user = await getCurrentAdmin();
    if (!user) redirect("/kiosk/login");

    try {
        const workspaceData = await getProjectWorkspaceData(id);

        return (
            <AdminPageLayout title="Project Workspace">
                <ProjectWorkspaceClient data={workspaceData} />
            </AdminPageLayout>
        );
    } catch (e) {
        redirect("/admin/projects");
    }
}
