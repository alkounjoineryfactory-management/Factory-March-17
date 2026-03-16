import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/app/actions";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { getMyAssignedTasks } from "@/app/actions/tasks";
import { getUserLeaveRequests } from "@/app/actions/hr";
import { MyTasksClient } from "@/components/admin/my-tasks/my-tasks-client";

export default async function MyTasksPage() {
    const user = await getCurrentAdmin();
    if (!user) redirect("/admin/login");

    const tasksData = await getMyAssignedTasks();
    const leaveRequests = await getUserLeaveRequests(user.id);

    return (
        <AdminPageLayout
            title="My Tasks"
        >
            <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <MyTasksClient initialData={tasksData} user={user} leaveRequests={leaveRequests} />
            </div>
        </AdminPageLayout>
    );
}
