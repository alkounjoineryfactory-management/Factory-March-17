"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { uploadFile } from "@/app/actions/upload";

// Helper function to handle individual file uploads
async function handleFileUpload(fileEntry: any, existingUrl: string | null = null): Promise<string | null> {
    if (fileEntry && fileEntry instanceof File && fileEntry.size > 0) {
        const fd = new FormData();
        fd.append("file", fileEntry);
        return await uploadFile(fd);
    }
    return existingUrl; // return existing if no new file uploaded
}

export async function getProductionOrdersByProject(projectId: string) {
    try {
        return await prisma.productionOrder.findMany({
            where: { projectId },
            include: { items: true },
            orderBy: { date: 'desc' }
        });
    } catch (error) {
        console.error("Error fetching production orders:", error);
        return [];
    }
}

export async function createProductionOrder(projectId: string, formData: FormData) {
    try {
        const itemsJson = formData.get("items") as string;
        let itemsData = [];
        try {
            itemsData = itemsJson ? JSON.parse(itemsJson) : [];
        } catch (e) {
            console.error("Failed to parse items JSON:", e);
        }

        const data = {
            projectId,
            date: new Date(formData.get("date") as string || new Date()),
            productionOrderNumber: formData.get("productionOrderNumber") as string,

            autocadDrawingUrl: await handleFileUpload(formData.get("autocadDrawingFile")),
            pdfDrawingUrl: await handleFileUpload(formData.get("pdfDrawingFile")),
            cuttingListUrl: await handleFileUpload(formData.get("cuttingListFile")),
            materialListUrl: await handleFileUpload(formData.get("materialListFile")),

            items: {
                create: itemsData.map((item: any) => ({
                    boqRef: item.boqRef || null,
                    slNo: item.slNo || null,
                    itemCode: item.itemCode || null,
                    itemDescription: item.itemDescription,
                    qty: parseFloat(item.qty) || 1,
                    unit: item.unit || "pcs",
                    carpentryLabourHrs: parseFloat(item.carpentryLabourHrs) || 0,
                    polishLabourHrs: parseFloat(item.polishLabourHrs) || 0,
                    carpentryMaterialAmount: parseFloat(item.carpentryMaterialAmount) || 0,
                    polishMaterialAmount: parseFloat(item.polishMaterialAmount) || 0,
                    installationTransportAmount: parseFloat(item.installationTransportAmount) || 0,
                }))
            }
        };

        const order = await prisma.productionOrder.create({ data });
        revalidatePath(`/admin/production-orders/${projectId}`);
        return { success: true, data: order };
    } catch (error: any) {
        console.error("Error creating production order:", error);
        return { error: error.message || "Failed to create production order" };
    }
}

export async function updateProductionOrder(id: string, formData: FormData) {
    try {
        const itemsJson = formData.get("items") as string;
        let itemsData = [];
        try {
            itemsData = itemsJson ? JSON.parse(itemsJson) : [];
        } catch (e) {
            console.error("Failed to parse items JSON:", e);
        }

        const data = {
            date: new Date(formData.get("date") as string || new Date()),
            productionOrderNumber: formData.get("productionOrderNumber") as string,

            autocadDrawingUrl: await handleFileUpload(formData.get("autocadDrawingFile"), formData.get("existingAutocadDrawingUrl") as string | null),
            pdfDrawingUrl: await handleFileUpload(formData.get("pdfDrawingFile"), formData.get("existingPdfDrawingUrl") as string | null),
            cuttingListUrl: await handleFileUpload(formData.get("cuttingListFile"), formData.get("existingCuttingListUrl") as string | null),
            materialListUrl: await handleFileUpload(formData.get("materialListFile"), formData.get("existingMaterialListUrl") as string | null),
        };

        const order = await prisma.productionOrder.update({
            where: { id },
            data
        });

        // Handle items: simple approach is to delete all existing and re-create
        // This is safe because we use onDelete: Cascade, but let's do it explicitly
        await prisma.productionOrderItem.deleteMany({
            where: { productionOrderId: id }
        });

        if (itemsData.length > 0) {
            await prisma.productionOrderItem.createMany({
                data: itemsData.map((item: any) => ({
                    productionOrderId: id,
                    boqRef: item.boqRef || null,
                    slNo: item.slNo || null,
                    itemCode: item.itemCode || null,
                    itemDescription: item.itemDescription,
                    qty: parseFloat(item.qty) || 1,
                    unit: item.unit || "pcs",
                    carpentryLabourHrs: parseFloat(item.carpentryLabourHrs) || 0,
                    polishLabourHrs: parseFloat(item.polishLabourHrs) || 0,
                    carpentryMaterialAmount: parseFloat(item.carpentryMaterialAmount) || 0,
                    polishMaterialAmount: parseFloat(item.polishMaterialAmount) || 0,
                    installationTransportAmount: parseFloat(item.installationTransportAmount) || 0,
                }))
            });
        }

        revalidatePath(`/admin/production-orders/${order.projectId}`);
        return { success: true, data: order };
    } catch (error: any) {
        console.error("Error updating production order:", error);
        return { error: error.message || "Failed to update production order" };
    }
}

export async function deleteProductionOrder(id: string, projectId: string) {
    try {
        await prisma.productionOrder.delete({
            where: { id }
        });
        revalidatePath(`/admin/production-orders/${projectId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting production order:", error);
        return { error: error.message || "Failed to delete production order" };
    }
}
