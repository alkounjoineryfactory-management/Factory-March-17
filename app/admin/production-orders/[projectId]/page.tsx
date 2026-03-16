import { prisma } from "@/lib/prisma";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import ProductionOrderManager from "@/components/admin/production-orders/production-order-manager";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
    const resolvedParams = await params;
    const project = await prisma.project.findUnique({ where: { id: resolvedParams.projectId } });
    return {
        title: `Production Orders - ${project?.name || 'Project'} | Factory Manager`,
    };
}
export const dynamic = "force-dynamic";

export default async function ProjectProductionOrdersPage({ params }: { params: Promise<{ projectId: string }> }) {
    const resolvedParams = await params;
    const project = await prisma.project.findUnique({
        where: { id: resolvedParams.projectId },
        include: {
            productionOrders: {
                orderBy: { date: 'desc' }, // or createdAt desc
                include: { items: true }
            }
        }
    });

    if (!project) {
        redirect("/admin/production-orders");
    }

    return (
        <AdminPageLayout
            title={`Production Orders: ${project.name}`}
            description={`Manage all production orders and BOQs for this project.`}
        >
            <div className="mb-6">
                <Link href="/admin/production-orders" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 w-fit transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Projects
                </Link>
            </div>

            <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6">
                <ProductionOrderManager project={project} initialOrders={project.productionOrders} />
            </div>
        </AdminPageLayout>
    );
}
