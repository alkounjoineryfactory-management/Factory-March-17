import ProjectPipeline from "@/components/admin/project-pipeline";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FolderKanban } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { CreateProjectDialog } from "@/components/admin/projects/create-project-dialog";

export const metadata: Metadata = {
    title: "Project Pipeline | Factory Manager",
    description: "Track project progress across all production stages",
};

export default async function ProjectsPage() {
    const sections = await prisma.section.findMany({ orderBy: { name: 'asc' } });
    const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });
    const machines = await prisma.machine.findMany({ orderBy: { name: 'asc' } });
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });

    const productionOrders = await prisma.productionOrder.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    });

    const weeklyPlans = await prisma.weeklyPlan.findMany({
        orderBy: { weekNumber: 'desc' },
        include: { tasks: true }
    });

    return (
        <AdminPageLayout
            title="Projects Overview"
            description="Track and manage production stages across all active projects."
            action={<CreateProjectDialog />}
        >
            <div className="w-full">
                <ProjectPipeline
                    sections={sections}
                    employees={employees}
                    machines={machines}
                    users={users}
                    productionOrders={productionOrders}
                    weeklyPlans={weeklyPlans}
                />
            </div>
        </AdminPageLayout>
    );
}
