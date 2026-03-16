"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { join } from "path";
import { stat, mkdir, writeFile } from "fs/promises";
import { getCurrentAdmin } from "@/app/actions";

export async function createProject(formData: FormData) {
    const projectNumber = formData.get("projectNumber") as string || null;
    const name = formData.get("name") as string;
    const client = formData.get("client") as string || null;
    const amountStr = formData.get("amount") as string;
    const startingDateStr = formData.get("startingDate") as string;
    const deadlineStr = formData.get("deadline") as string;
    const location = formData.get("location") as string || null;
    const locationLink = formData.get("locationLink") as string || null;

    if (!name) {
        throw new Error("Project name is required");
    }

    const amount = amountStr ? parseFloat(amountStr) : 0;
    const startingDate = startingDateStr ? new Date(startingDateStr) : null;
    const deadline = deadlineStr ? new Date(deadlineStr) : null;

    // First create the project to get its ID for the folder structure
    const project = await prisma.project.create({
        data: {
            projectNumber,
            name,
            client,
            amount,
            startingDate,
            deadline,
            location,
            locationLink,
            status: "ACTIVE"
        }
    });

    // Handle File Uploads
    const blankBoqFile = formData.get("blankBoq") as File | null;
    const idDrawingFile = formData.get("idDrawing") as File | null;
    const threeDDrawingFile = formData.get("threeDDrawing") as File | null;
    const otherAttachmentFile = formData.get("otherAttachment") as File | null;
    const materialsDetailsFile = formData.get("materialsDetails") as File | null;

    let blankBoqUrl: string | null = null;
    let idDrawingUrl: string | null = null;
    let threeDDrawingUrl: string | null = null;
    let otherAttachmentUrl: string | null = null;
    let materialsDetailsUrl: string | null = null;

    const uploadDir = join(process.cwd(), "public", "uploads", "projects", project.id);

    // Create the directory if it doesn't exist
    try {
        await stat(uploadDir);
    } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "ENOENT") {
            await mkdir(uploadDir, { recursive: true });
        }
    }

    async function saveFile(file: File | null, prefix: string): Promise<string | null> {
        if (!file || file.size === 0) return null;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Clean filename and add prefix
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${prefix}_${Date.now()}_${safeName}`;
        const filePath = join(uploadDir, filename);

        await writeFile(filePath, buffer);

        return `/uploads/projects/${project.id}/${filename}`;
    }

    blankBoqUrl = await saveFile(blankBoqFile, "boq");
    idDrawingUrl = await saveFile(idDrawingFile, "iddrawing");
    threeDDrawingUrl = await saveFile(threeDDrawingFile, "3ddrawing");
    otherAttachmentUrl = await saveFile(otherAttachmentFile, "other");
    materialsDetailsUrl = await saveFile(materialsDetailsFile, "materials_labour");

    // If any files were saved, update the project record
    if (blankBoqUrl || idDrawingUrl || threeDDrawingUrl || otherAttachmentUrl || materialsDetailsUrl) {
        await prisma.project.update({
            where: { id: project.id },
            data: {
                blankBoqUrl,
                idDrawingUrl,
                threeDDrawingUrl,
                otherAttachmentUrl,
                materialsDetailsUrl
            }
        });
    }

    // Auto-generate Invoices if amount > 0
    if (amount > 0) {
        // 30% Advance, 50% Progress, 20% Final
        const advanceAmount = amount * 0.30;
        const progressAmount = amount * 0.50;
        const finalAmount = amount * 0.20;

        const currentYear = new Date().getFullYear();
        const baseInvNo = `INV-${currentYear}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        await prisma.invoice.createMany({
            data: [
                {
                    invoiceNo: `${baseInvNo}-ADV`,
                    projectId: project.id,
                    type: "ADVANCE",
                    amount: advanceAmount,
                    status: "PENDING",
                    notes: "Auto-generated 30% Advance Invoice"
                },
                {
                    invoiceNo: `${baseInvNo}-PROG`,
                    projectId: project.id,
                    type: "PROGRESS",
                    amount: progressAmount,
                    status: "PENDING",
                    notes: "Auto-generated 50% Progress Invoice"
                },
                {
                    invoiceNo: `${baseInvNo}-FIN`,
                    projectId: project.id,
                    type: "FINAL",
                    amount: finalAmount,
                    status: "PENDING",
                    notes: "Auto-generated 20% Final Settlement Invoice"
                }
            ]
        });
    }

    revalidatePath("/admin/projects");
    return { success: true, projectId: project.id };
}

export async function getProjectWorkspaceData(projectId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                projectNumber: true,
                name: true,
                client: true,
                amount: true,
                startingDate: true,
                deadline: true,
                location: true,
                locationLink: true,
                status: true,
                blankBoqUrl: true,
                idDrawingUrl: true,
                threeDDrawingUrl: true,
                otherAttachmentUrl: true,
                materialsDetailsUrl: true,
                labourDetailsUrl: true,
                productionOrdersUrl: true,
                pricedBoqUrl: true,
                createdAt: true,
                updatedAt: true,
                // Production Orders and their nested files
                productionOrders: {
                    include: {
                        items: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                // Procurement: Material Requisitions
                materialRequisitions: {
                    include: {
                        items: true,
                        requester: { select: { name: true } }
                    },
                    orderBy: { date: 'desc' }
                },
                // Schedule and Phases
                weeklyPlans: {
                    select: {
                        id: true,
                        weekNumber: true,
                        title: true,
                        status: true,
                        projectId: true,
                        tasks: {
                            select: {
                                id: true,
                                description: true,
                                targetQty: true,
                                unit: true,
                                assignedTo: true,
                                startDate: true,
                                endDate: true,
                                status: true,
                                sectionId: true,
                                section: { select: { id: true, name: true } },
                                jobCards: {
                                    select: {
                                        id: true,
                                        description: true,
                                        status: true,
                                        targetDate: true,
                                        targetQty: true,
                                        actualQty: true,
                                        actualHrs: true,
                                        isFinished: true,
                                        machine: { select: { id: true, name: true } },
                                        employee: { select: { id: true, name: true } }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });

        if (!project) throw new Error("Project not found");

        // Fetch related Purchase Orders (LPOs) based on MRs or explicit linking
        // Right now, MR Items link to PO Items, so we need a manual mapping
        const poItems = await prisma.purchaseOrderItem.findMany({
            where: {
                purchaseOrder: {
                    projectId: projectId
                }
            },
            include: {
                purchaseOrder: {
                    include: {
                        vendor: true
                    }
                }
            }
        });

        // Unique Purchase Orders
        const uniquePOsMap = new Map();
        poItems.forEach(item => {
            if (item.purchaseOrder && !uniquePOsMap.has(item.purchaseOrder.id)) {
                uniquePOsMap.set(item.purchaseOrder.id, item.purchaseOrder);
            }
        });
        const purchaseOrders = Array.from(uniquePOsMap.values());

        // Store Consumption (What StoreTransactions map to this project via MR -> Item or explicit JobCards)
        // Since store-item logic relies heavily on MRs, we'll fetch transactions linked to those MRs
        // Or simply transactions where destination could be derived. For now, let's keep it simple.

        let totalHoursSpent = 0;
        let totalJobCards = 0;
        let completedJobCards = 0;

        project.weeklyPlans.forEach((plan: any) => {
            plan.tasks.forEach((task: any) => {
                task.jobCards.forEach((job: any) => {
                    totalJobCards++;
                    if (job.status === 'COMPLETED') completedJobCards++;
                    totalHoursSpent += (job.actualHrs || 0);
                });
            });
        });

        return {
            ...project,
            purchaseOrders,
            statistics: {
                totalHoursSpent,
                totalJobCards,
                completedJobCards,
                completionPercentage: totalJobCards > 0 ? Math.round((completedJobCards / totalJobCards) * 100) : 0
            }
        };

    } catch (error) {
        console.error("Failed to fetch project workspace data:", error);
        throw new Error("Unable to load project workspace");
    }
}

export async function deleteProject(projectId: string) {
    const admin = await getCurrentAdmin();
    // Bug fix: SUPER_ADMIN must also be allowed to delete projects
    if (!admin || !["ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
        throw new Error("Unauthorized. Only ADMIN or SUPER_ADMIN users can delete projects.");
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. WorkLogs (Linked to JobCards)
            await tx.workLog.deleteMany({
                where: { jobCard: { projectId: projectId } }
            });

            // 2. JobCards (Linked to Project)
            await tx.jobCard.deleteMany({
                where: { projectId: projectId }
            });

            // 3. WeeklyTasks (Linked to WeeklyPlans linked to Project)
            const weeklyPlans = await tx.weeklyPlan.findMany({
                where: { projectId: projectId },
                select: { id: true }
            });
            const planIds = weeklyPlans.map(p => p.id);

            if (planIds.length > 0) {
                await tx.weeklyTask.deleteMany({
                    where: { weeklyPlanId: { in: planIds } }
                });
            }

            // 4. WeeklyPlans (Linked to Project)
            await tx.weeklyPlan.deleteMany({
                where: { projectId: projectId }
            });

            // 5. ProductionOrderItems & ProductionOrders
            const productionOrders = await tx.productionOrder.findMany({
                where: { projectId: projectId },
                select: { id: true }
            });
            const poOrderIds = productionOrders.map(p => p.id);
            if (poOrderIds.length > 0) {
                await tx.productionOrderItem.deleteMany({
                    where: { productionOrderId: { in: poOrderIds } }
                });
                await tx.productionOrder.deleteMany({
                    where: { projectId: projectId }
                });
            }

            // 6. Invoices
            await tx.invoice.deleteMany({
                where: { projectId: projectId }
            });

            // 7. QuotationItems & Quotations (Linked to MRs)
            const materialRequisitions = await tx.materialRequisition.findMany({
                where: { projectId: projectId },
                select: { id: true }
            });
            const mrIds = materialRequisitions.map(mr => mr.id);

            if (mrIds.length > 0) {
                const quotations = await tx.quotation.findMany({
                    where: { mrId: { in: mrIds } },
                    select: { id: true }
                });
                const quotaIds = quotations.map(q => q.id);
                if (quotaIds.length > 0) {
                    await tx.quotationItem.deleteMany({
                        where: { quotationId: { in: quotaIds } }
                    });
                    await tx.quotation.deleteMany({
                        where: { mrId: { in: mrIds } }
                    });
                }

                // 8. PurchaseOrderItems & PurchaseOrders (Linked to MRs or Project)
                // Need to find POs linked either to MRs or directly to the project
                const purchaseOrders = await tx.purchaseOrder.findMany({
                    where: {
                        OR: [
                            { projectId: projectId },
                            { mrId: { in: mrIds } }
                        ]
                    },
                    select: { id: true }
                });
                const purchIds = purchaseOrders.map(p => p.id);
                if (purchIds.length > 0) {
                    await tx.purchaseOrderItem.deleteMany({
                        where: { purchaseOrderId: { in: purchIds } }
                    });
                    await tx.purchaseOrder.deleteMany({
                        where: { id: { in: purchIds } }
                    });
                }

                // 9. MaterialRequisitionItems & MaterialRequisitions
                await tx.materialRequisitionItem.deleteMany({
                    where: { materialRequisitionId: { in: mrIds } }
                });
                await tx.materialRequisition.deleteMany({
                    where: { projectId: projectId }
                });
            } else {
                // Just in case there are POs linked directly to project without an MR
                const directPOs = await tx.purchaseOrder.findMany({
                    where: { projectId: projectId },
                    select: { id: true }
                });
                const dirPurchIds = directPOs.map(p => p.id);
                if (dirPurchIds.length > 0) {
                    await tx.purchaseOrderItem.deleteMany({
                        where: { purchaseOrderId: { in: dirPurchIds } }
                    });
                    await tx.purchaseOrder.deleteMany({
                        where: { projectId: projectId }
                    });
                }
            }

            // 10. Project
            await tx.project.delete({
                where: { id: projectId }
            });
        });

        revalidatePath("/admin/projects");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete project:", error);
        throw new Error("Failed to comprehensively delete the project or its related records.");
    }
}
