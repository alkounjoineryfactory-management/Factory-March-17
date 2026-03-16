import { prisma } from "@/lib/prisma";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import ProjectGrid from "@/components/admin/production-orders/project-grid";

export const metadata = {
    title: "Production Orders | Factory Manager",
    description: "Manage production orders for active projects",
};

export const dynamic = "force-dynamic";

export default async function ProductionOrdersPage() {
    const projects = await prisma.project.findMany({
        orderBy: [
            { status: 'asc' }, // 'ACTIVE' comes before 'COMPLETED' alphabetically, but wait, 'ACTIVE', 'COMPLETED', 'ON_HOLD'. Let's do raw sort or sort in JS if needed. 
            // In Prisma you can't easily sort by specific string priority without raw queries, 
            // but A-Z sort makes ACTIVE first anyway! (A < C < O < P etc.)
            { deadline: 'asc' }
        ],
        include: {
            _count: {
                select: { productionOrders: true }
            }
        }
    });

    return (
        <AdminPageLayout
            title="Production Orders"
            description="Select a project to view or generate its production orders."
        >
            <ProjectGrid projects={projects} />
        </AdminPageLayout>
    );
}
