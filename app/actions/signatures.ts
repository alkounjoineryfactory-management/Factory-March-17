"use server";

import { prisma } from "@/lib/prisma";

/**
 * Publicly fetches a ProductionOrder by ID.
 * This does NOT require authentication and is intended for the signature sharing page.
 */
export async function getPublicProductionOrder(id: string) {
    if (!id) throw new Error("Production Order ID is required");

    try {
        const order = await prisma.productionOrder.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        name: true,
                        client: true,
                        projectNumber: true,
                    }
                },
                items: {
                    orderBy: {
                        slNo: 'asc'
                    }
                },
            }
        });

        if (!order) throw new Error("Production Order not found or invalid link.");

        return order;
    } catch (error) {
        console.error("Failed to fetch public production order:", error);
        throw new Error("Failed to load Production Order");
    }
}

/**
 * Saves a base64 signature to the specified role's field on the Production Order.
 */
export async function saveProductionOrderSignature(id: string, role: string, signatureBase64: string) {
    if (!id || !role || !signatureBase64) {
        throw new Error("Missing required fields for signature");
    }

    // Role mapping to ensure we only update allowed fields
    const roleFieldMap: Record<string, string> = {
        "production": "productionSignature",
        "qa": "qaSignature",
        "factoryManager": "factoryManagerSignature",
        "projectsManager": "projectsManagerSignature"
    };

    const fieldToUpdate = roleFieldMap[role];

    if (!fieldToUpdate) {
        throw new Error("Invalid signature role specified");
    }

    try {
        await prisma.productionOrder.update({
            where: { id },
            data: {
                [fieldToUpdate]: signatureBase64
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to save signature:", error);
        throw new Error("Failed to save signature securely.");
    }
}
