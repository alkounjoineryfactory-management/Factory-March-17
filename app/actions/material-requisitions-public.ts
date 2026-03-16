"use server";

import { prisma } from "@/lib/prisma";

/**
 * Publicly fetches a MaterialRequisition by ID.
 * This does NOT require authentication and is intended for the external approval sharing page.
 */
export async function getPublicMaterialRequisition(id: string) {
    if (!id) throw new Error("Material Requisition ID is required");

    try {
        const mr = await prisma.materialRequisition.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        name: true,
                        client: true,
                        projectNumber: true,
                    }
                },
                requester: {
                    select: {
                        name: true,
                        username: true
                    }
                },
                items: {
                    orderBy: {
                        id: 'asc' // Maintain predictable insertion order
                    }
                },
            }
        });

        if (!mr) throw new Error("Material Requisition not found or invalid link.");

        return mr;
    } catch (error) {
        console.error("Failed to fetch public material requisition:", error);
        throw new Error("Failed to load Material Requisition");
    }
}

/**
 * Saves an approval decision and optional comment for a specific MaterialRequisitionItem.
 * This is permissible publicly given they possess the unguessable crypto UUID link.
 */
export async function saveMaterialRequisitionItemApproval(itemId: string, status: "PENDING" | "APPROVED" | "REJECTED", comments: string | null) {
    if (!itemId || !status) {
        throw new Error("Missing required fields for item approval");
    }

    try {
        const updatedItem = await prisma.materialRequisitionItem.update({
            where: { id: itemId },
            data: {
                approvalStatus: status,
                comments: comments || null
            }
        });

        // Check if all items in this Material Requisition are now APPROVED
        const allItems = await prisma.materialRequisitionItem.findMany({
            where: { materialRequisitionId: updatedItem.materialRequisitionId }
        });

        const allApproved = allItems.length > 0 && allItems.every((item: any) => item.approvalStatus === "APPROVED");

        if (allApproved) {
            // Automatically promote the MR status to APPROVED, which unlocks it for Quotations
            await prisma.materialRequisition.update({
                where: { id: updatedItem.materialRequisitionId },
                data: { status: "APPROVED" }
            });
        }

        return { success: true, item: updatedItem, autoApprovedMR: allApproved };
    } catch (error) {
        console.error("Failed to save item approval:", error);
        throw new Error("Failed to save approval securely.");
    }
}
