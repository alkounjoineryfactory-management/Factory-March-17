"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function logManualFactoryConsumption(data: {
    storeItemId: string;
    projectId: string;
    quantity: number;
    reference?: string;
}) {
    try {
        if (!data.storeItemId || !data.projectId || !data.quantity || data.quantity <= 0) {
            throw new Error("Store Item, Project, and a positive quantity are required");
        }

        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Validate Store Item and Project Stock
            const item = await tx.storeItem.findUnique({
                where: { id: data.storeItemId },
                include: { projectStocks: { where: { projectId: data.projectId } } }
            });

            if (!item) throw new Error("Store Item not found");

            // We need to validate using the true dynamic project stock calculation
            let currentProjectStock = item.projectStocks[0]?.quantity || 0;
            const resStoreBreakdown = await import("./store").then(m => m.getStoreItemProjectBreakdown(data.projectId, item.itemCode, item.name));
            if (resStoreBreakdown.success && resStoreBreakdown.breakdown && resStoreBreakdown.breakdown.length > 0) {
                const bData = resStoreBreakdown.breakdown[0];
                const strictTrueProjectStock = bData.deliveredQty + bData.netTransfers;
                const remainingQty = strictTrueProjectStock - bData.usedQty;
                currentProjectStock = remainingQty > 0 ? remainingQty : 0;
            }

            if (currentProjectStock < data.quantity) {
                throw new Error(`Insufficient Project Stock (${currentProjectStock}) for this consumption.`);
            }

            // WE DO NOT DEDUCT FROM PROJECT STOCK HERE.
            // This ensures "True Project Stock" remains perfectly stable.
            // The UI will calculate: Unused Balance = True Project Stock - UsedQty.
            
            // 2. Record the Transaction as OUT_TO_FACTORY
            const transaction = await tx.storeTransaction.create({
                data: {
                    storeItemId: data.storeItemId,
                    projectId: data.projectId,
                    type: "OUT_TO_FACTORY" as any, 
                    quantity: data.quantity,
                    reference: data.reference || "Manual Factory Consumption"
                }
            });

            return { transaction, newProjectStock: currentProjectStock };
        });

        revalidatePath('/admin/procurement');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Error logging manual consumption:", error);
        return { success: false, error: error.message };
    }
}
