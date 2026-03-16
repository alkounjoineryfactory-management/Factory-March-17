"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/app/actions/upload";

// --- VENDOR ACTIONS ---

export async function getVendors(params?: {
    page?: number;
    limit?: number;
    search?: string;
}) {
    try {
        const page = params?.page || 1;
        const limit = params?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (params?.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { contactPerson: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
                { phone: { contains: params.search } }
            ];
        }

        // NOTE: The Vendor model has no 'category' field. Category filtering
        // is not supported until a schema migration adds it.

        const vendors = await prisma.vendor.findMany({
                where,
                skip,
                take: limit + 1,
                orderBy: { name: 'asc' }
            });

        const hasNextPage = vendors.length > limit;
        const returnData = hasNextPage ? vendors.slice(0, limit) : vendors;

        return { success: true, vendors: returnData, hasNextPage };
    } catch (error: any) {
        console.error("Error fetching vendors:", error);
        return { success: false, error: error.message };
    }
}

export async function createVendor(data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
}) {
    try {
        if (!data.name) throw new Error("Vendor name is required");

        const vendor = await prisma.vendor.create({
            data: {
                name: data.name,
                contactPerson: data.contactPerson,
                email: data.email,
                phone: data.phone,
                address: data.address
            }
        });
        revalidatePath('/admin/procurement');
        return { success: true, vendor };
    } catch (error: any) {
        console.error("Error creating vendor:", error);
        return { success: false, error: error.message };
    }
}

export async function updateVendor(id: string, data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
}) {
    try {
        const vendor = await prisma.vendor.update({
            where: { id },
            data: {
                name: data.name,
                contactPerson: data.contactPerson,
                email: data.email,
                phone: data.phone,
                address: data.address
            }
        });
        revalidatePath('/admin/procurement');
        return { success: true, vendor };
    } catch (error: any) {
        console.error("Error updating vendor:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteVendor(id: string) {
    try {
        await prisma.vendor.delete({
            where: { id }
        });
        revalidatePath('/admin/procurement');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting vendor:", error);
        return { success: false, error: error.message };
    }
}

// --- PURCHASE ORDER ACTIONS ---

export async function getPurchaseOrders(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}) {
    try {
        const page = params?.page || 1;
        const limit = params?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {};

        // Base filter: if search is provided, look in PO number or Vendor name
        if (params?.search) {
            where.OR = [
                { poNumber: { contains: params.search, mode: 'insensitive' } },
                { vendor: { name: { contains: params.search, mode: 'insensitive' } } }
            ];
        }

        if (params?.status && params.status !== "ALL") {
            const statuses = params.status.split(",");
            if (statuses.length > 1) {
                where.status = { in: statuses };
            } else {
                where.status = params.status;
            }
        }

        const purchaseOrders = await prisma.purchaseOrder.findMany({
                where,
                skip,
                take: limit + 1,
                select: {
                    id: true,
                    poNumber: true,
                    date: true,
                    totalAmount: true,
                    status: true,
                    notes: true,
                    vendor: {
                        select: { name: true }
                    },
                    project: {
                        select: { name: true }
                    },
                    items: {
                        select: {
                            id: true,
                            itemCode: true,
                            itemDescription: true,
                            quantity: true,
                            unit: true,
                            unitPrice: true,
                            totalPrice: true
                        }
                    }
                },
                orderBy: { date: 'desc' },
            });
        
        const hasNextPage = purchaseOrders.length > limit;
        const returnData = hasNextPage ? purchaseOrders.slice(0, limit) : purchaseOrders;

        return { success: true, purchaseOrders: returnData, hasNextPage };
    } catch (error: any) {
        console.error("Error fetching POs:", error);
        return { success: false, error: error.message };
    }
}

export async function createPurchaseOrder(data: {
    poNumber: string;
    date: Date;
    vendorId: string;
    projectId?: string;
    mrId?: string;
    notes?: string;
    items: {
        itemCode?: string;
        itemDescription: string;
        quantity: number;
        unit: string;
        unitPrice: number;
    }[];
}) {
    try {
        // Validation
        if (!data.poNumber || !data.vendorId || !data.items || data.items.length === 0) {
            throw new Error("Missing required fields or items");
        }

        // Pre-fetch store items to auto-map itemCode if missing
        const storeItems = await prisma.storeItem.findMany({ select: { itemCode: true, name: true } });
        const storeMap = new Map();
        storeItems.forEach(si => storeMap.set(si.name.toLowerCase().trim(), si.itemCode));

        // Calculate total amounts per item and overall total
        let totalAmount = 0;
        const processedItems = data.items.map(item => {
            const totalPrice = item.quantity * item.unitPrice;
            totalAmount += totalPrice;

            let mappedCode = item.itemCode || null;
            if (!mappedCode) {
                mappedCode = storeMap.get(item.itemDescription.toLowerCase().trim()) || null;
            }

            return {
                itemCode: mappedCode,
                itemDescription: item.itemDescription,
                quantity: item.quantity,
                unit: item.unit || 'pcs',
                unitPrice: item.unitPrice,
                totalPrice: totalPrice
            };
        });

        // Prisma Transaction to ensure PO and Items are created together
        const purchaseOrder = await prisma.$transaction(async (tx) => {
            // Check for duplicate PO Number
            const existingPO = await tx.purchaseOrder.findUnique({
                where: { poNumber: data.poNumber }
            });

            if (existingPO) {
                throw new Error(`Purchase Order with number ${data.poNumber} already exists.`);
            }

            const po = await tx.purchaseOrder.create({
                data: {
                    poNumber: data.poNumber,
                    date: data.date,
                    vendorId: data.vendorId,
                    projectId: data.projectId || null,
                    mrId: data.mrId || null,
                    notes: data.notes,
                    totalAmount: totalAmount,
                    status: "DRAFT", // Default status
                    items: {
                        create: processedItems
                    }
                },
                include: {
                    vendor: true,
                    project: true,
                    items: true
                }
            });

            return po;
        });

        revalidatePath('/admin/procurement');
        return { success: true, purchaseOrder };

    } catch (error: any) {
        console.error("Error creating PO:", error);
        return { success: false, error: error.message };
    }
}

export async function updatePurchaseOrderStatus(id: string, status: string, receiptUrl?: string) {
    try {
        // Valid statuses per schema comment + statuses actively used by the UI (SENT, RECEIVED)
        const validStatuses = ["DRAFT", "ISSUED", "PARTIAL", "DELIVERED_FULL", "RECEIVED", "PAID", "CANCELLED", "SENT"];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of ${validStatuses.join(", ")}`);
        }

        const dataToUpdate: any = { status };
        if (receiptUrl) {
            dataToUpdate.receiptUrl = receiptUrl;
        }

        const po = await prisma.purchaseOrder.update({
            where: { id },
            data: dataToUpdate
        });

        revalidatePath('/admin/procurement');
        return { success: true, purchaseOrder: po };
    } catch (error: any) {
        console.error("Error updating PO status:", error);
        return { success: false, error: error.message };
    }
}

export async function processGoodsReceipt(data: {
    purchaseOrderId: string;
    receiptUrl?: string;
    status: string;
    receivedItems: {
        poItemId: string;
        itemCode?: string | null;
        itemDescription: string;
        quantity: number;
    }[];
}) {
    try {
        console.log("processGoodsReceipt Called:", JSON.stringify(data, null, 2));
        const po = await prisma.$transaction(async (tx) => {
            // 1. Update PO Status and Receipt URL
            const updatedPO = await tx.purchaseOrder.update({
                where: { id: data.purchaseOrderId },
                data: {
                    status: data.status,
                    ...(data.receiptUrl && { receiptUrl: data.receiptUrl })
                }
            });

            // 2. Fetch all Store Items to match against
            const storeItems = await tx.storeItem.findMany();
            const storeMapByCode = new Map();
            const storeMapByName = new Map();

            storeItems.forEach(si => {
                if (si.itemCode) storeMapByCode.set(si.itemCode.trim().toLowerCase(), si);
                if (si.name) storeMapByName.set(si.name.trim().toLowerCase(), si);
            });

            // 3. Process each received item
            for (const rItem of data.receivedItems) {
                if (rItem.quantity <= 0) continue;

                // Try to match Store Item by Code, then by Name
                let targetStoreItem = null;
                if (rItem.itemCode) {
                    targetStoreItem = storeMapByCode.get(rItem.itemCode.trim().toLowerCase());
                }

                if (!targetStoreItem && rItem.itemDescription) {
                    targetStoreItem = storeMapByName.get(rItem.itemDescription.trim().toLowerCase());
                }

                console.log(`GRN Item: ${rItem.itemDescription} (${rItem.itemCode}) -> Matched StoreItem:`, targetStoreItem?.name || 'NOT FOUND');

                if (targetStoreItem) {
                    // Update appropriate stock bucket based on whether the PO is for a project
                    if (updatedPO.projectId) {
                        // Deliver straight to Project Stock
                        await tx.projectStock.upsert({
                            where: {
                                storeItemId_projectId: {
                                    storeItemId: targetStoreItem.id,
                                    projectId: updatedPO.projectId
                                }
                            },
                            update: { quantity: { increment: rItem.quantity } },
                            create: {
                                storeItemId: targetStoreItem.id,
                                projectId: updatedPO.projectId,
                                quantity: rItem.quantity
                            }
                        });
                    } else {
                        // Deliver straight to General Stock
                        const newStock = targetStoreItem.currentStock + rItem.quantity;
                        await tx.storeItem.update({
                            where: { id: targetStoreItem.id },
                            data: { currentStock: newStock }
                        });
                    }

                    // Create Store Transaction
                    await tx.storeTransaction.create({
                        data: {
                            storeItemId: targetStoreItem.id,
                            type: "IN",
                            quantity: rItem.quantity,
                            reference: `GRN for LPO: ${updatedPO.poNumber}`
                        }
                    });
                }
            }

            return updatedPO;
        });

        revalidatePath('/admin/procurement');
        revalidatePath('/admin/procurement/store');
        return { success: true, purchaseOrder: po };
    } catch (error: any) {
        console.error("Error processing Goods Receipt:", error);
        return { success: false, error: error.message };
    }
}

export async function deletePurchaseOrder(id: string) {
    try {
        // Cascade delete is set in schema for PurchaseOrderItem, 
        // but it's good practice to delete items manually if not relying purely on DB cascade
        await prisma.purchaseOrder.delete({
            where: { id }
        });

        revalidatePath('/admin/procurement');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting PO:", error);
        return { success: false, error: error.message };
    }
}

// --- MATERIAL REQUISITION ACTIONS ---

export async function getMaterialRequisitions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}) {
    try {
        const page = params?.page || 1;
        const limit = params?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {};

        // Base filter: search by MR number, or project name
        if (params?.search) {
            where.OR = [
                { mrNumber: { contains: params.search, mode: 'insensitive' } },
                { project: { name: { contains: params.search, mode: 'insensitive' } } }
            ];
        }

        if (params?.status && params.status !== "ALL") {
            const statuses = params.status.split(",");
            if (statuses.length > 1) {
                where.status = { in: statuses };
            } else {
                where.status = params.status;
            }
        }

        const requisitions = await prisma.materialRequisition.findMany({
                where,
                skip,
                take: limit + 1,
                select: {
                    id: true,
                    mrNumber: true,
                    date: true,
                    status: true,
                    notes: true,
                    projectId: true,
                    requester: {
                        select: { name: true, username: true }
                    },
                    project: {
                        select: { name: true }
                    },
                    items: {
                        select: {
                            id: true,
                            itemCode: true,
                            itemDescription: true,
                            quantity: true,
                            unit: true,
                            approvalStatus: true,
                            comments: true
                        }
                    },
                    quotations: {
                        select: {
                            id: true,
                            createdAt: true,
                            isSelected: true,
                            totalAmount: true,
                            attachmentUrl: true,
                            vendor: {
                                select: { name: true }
                            },
                            items: {
                                select: {
                                    unitPrice: true,
                                    totalPrice: true,
                                    materialRequisitionItem: {
                                        select: {
                                            itemCode: true,
                                            itemDescription: true,
                                            quantity: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { date: 'desc' },
            });

        const hasNextPage = requisitions.length > limit;
        const returnData = hasNextPage ? requisitions.slice(0, limit) : requisitions;

        return { success: true, requisitions: returnData, hasNextPage };
    } catch (error: any) {
        console.error("Error fetching Material Requisitions:", error);
        return { success: false, error: error.message };
    }
}

export async function createMaterialRequisition(data: {
    mrNumber: string;
    date: Date;
    requesterId: string;
    projectId?: string;
    notes?: string;
    items: {
        itemCode?: string;
        itemDescription: string;
        quantity: number;
        unit: string;
    }[];
}) {
    try {
        // Validation
        if (!data.mrNumber || !data.requesterId || !data.items || data.items.length === 0) {
            throw new Error("Missing required fields or items");
        }

        // Pre-fetch store items to auto-map itemCode if missing
        const storeItems = await prisma.storeItem.findMany({ select: { itemCode: true, name: true } });
        const storeMap = new Map();
        storeItems.forEach(si => storeMap.set(si.name.toLowerCase().trim(), si.itemCode));

        // Prisma Transaction to ensure MR and Items are created together
        const materialRequisition = await prisma.$transaction(async (tx) => {
            // Check for duplicate MR Number
            const existingMR = await tx.materialRequisition.findUnique({
                where: { mrNumber: data.mrNumber }
            });

            if (existingMR) {
                throw new Error(`Material Requisition with number ${data.mrNumber} already exists.`);
            }

            const itemsToCreate = data.items.map(item => {
                let mappedCode = item.itemCode || null;
                if (!mappedCode) {
                    mappedCode = storeMap.get(item.itemDescription.toLowerCase().trim()) || null;
                }
                return {
                    itemCode: mappedCode,
                    itemDescription: item.itemDescription,
                    quantity: item.quantity,
                    unit: item.unit || 'pcs'
                };
            });

            const mr = await tx.materialRequisition.create({
                data: {
                    mrNumber: data.mrNumber,
                    date: data.date,
                    requesterId: data.requesterId,
                    projectId: data.projectId || null,
                    notes: data.notes,
                    status: "PENDING", // Default status
                    items: {
                        create: itemsToCreate
                    }
                },
                include: {
                    requester: true,
                    project: true,
                    items: true
                }
            });

            return mr;
        });

        revalidatePath('/admin/procurement');
        return { success: true, materialRequisition };

    } catch (error: any) {
        console.error("Error creating Material Requisition:", error);
        return { success: false, error: error.message };
    }
}

export async function updateMaterialRequisition(
    id: string,
    data: {
        projectId?: string;
        notes?: string;
        items: {
            id?: string;
            itemCode?: string;
            itemDescription: string;
            quantity: number;
            unit: string;
        }[];
    }
) {
    try {
        if (!id || !data.items || data.items.length === 0) {
            throw new Error("Missing required fields or items");
        }

        // Pre-fetch store items to auto-map itemCode if missing
        const storeItems = await prisma.storeItem.findMany({ select: { itemCode: true, name: true } });
        const storeMap = new Map();
        storeItems.forEach(si => storeMap.set(si.name.toLowerCase().trim(), si.itemCode));

        const materialRequisition = await prisma.$transaction(async (tx) => {
            // 1. Get existing MR
            const existingMR = await tx.materialRequisition.findUnique({
                where: { id },
                include: { items: true }
            });

            if (!existingMR) throw new Error("Material Requisition not found");

            // 2. Determine which items to delete
            const incomingIds = data.items.map(i => i.id).filter(Boolean);
            const itemsToDelete = existingMR.items.filter(existing => !incomingIds.includes(existing.id));

            if (itemsToDelete.length > 0) {
                await tx.materialRequisitionItem.deleteMany({
                    where: { id: { in: itemsToDelete.map(i => i.id) } }
                });
            }

            // 3. Upsert items and explicitly clear their approval tracking data
            for (const item of data.items) {
                let mappedCode = item.itemCode || null;
                if (!mappedCode) {
                    mappedCode = storeMap.get(item.itemDescription.toLowerCase().trim()) || null;
                }

                if (item.id) {
                    // Update existing item
                    await tx.materialRequisitionItem.update({
                        where: { id: item.id },
                        data: {
                            itemCode: mappedCode,
                            itemDescription: item.itemDescription,
                            quantity: item.quantity,
                            unit: item.unit || 'pcs',
                            // CRITICAL: Reset approvals because the item details changed
                            approvalStatus: "PENDING",
                            comments: null
                        }
                    });
                } else {
                    // Create new item
                    await tx.materialRequisitionItem.create({
                        data: {
                            materialRequisitionId: existingMR.id,
                            itemCode: mappedCode,
                            itemDescription: item.itemDescription,
                            quantity: item.quantity,
                            unit: item.unit || 'pcs',
                            approvalStatus: "PENDING",
                            comments: null
                        }
                    });
                }
            }

            // 4. Update the parent MR and explicitly revert it to PENDING since items changed
            const updatedMR = await tx.materialRequisition.update({
                where: { id },
                data: {
                    projectId: data.projectId || null,
                    notes: data.notes,
                    status: "PENDING" // Reset to pending
                },
                include: {
                    requester: true,
                    project: true,
                    items: true
                }
            });

            return updatedMR;
        });

        revalidatePath('/admin/procurement');
        return { success: true, materialRequisition };

    } catch (error: any) {
        console.error("Error updating Material Requisition:", error);
        return { success: false, error: error.message };
    }
}

export async function updateMaterialRequisitionStatus(id: string, status: string) {
    try {
        // Valid statuses per schema comment; "ORDERED" was removed (not a real status)
        const validStatuses = ["PENDING", "APPROVED", "REJECTED", "QUOTING", "LPO_ISSUED", "COMPLETED"];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of ${validStatuses.join(", ")}`);
        }

        const mr = await prisma.materialRequisition.update({
            where: { id },
            data: { status }
        });

        revalidatePath('/admin/procurement');
        return { success: true, materialRequisition: mr };
    } catch (error: any) {
        console.error("Error updating MR status:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteMaterialRequisition(id: string) {
    try {
        await prisma.materialRequisition.delete({
            where: { id }
        });

        revalidatePath('/admin/procurement');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting MR:", error);
        return { success: false, error: error.message };
    }
}

// --- QUOTATION ACTIONS ---

export async function submitQuotation(formData: FormData) {
    try {
        const vendorId = formData.get("vendorId") as string;
        const mrId = formData.get("mrId") as string;
        const totalAmount = parseFloat(formData.get("totalAmount") as string || "0");
        const attachmentFile = formData.get("attachmentFile") as File | null;
        let attachmentUrl = formData.get("attachmentUrl") as string || undefined;

        const itemsStr = formData.get("items") as string;
        let parsedItems: any[] = [];
        if (itemsStr) {
            try {
                parsedItems = JSON.parse(itemsStr);
            } catch (e) {
                console.error("Failed to parse items json");
            }
        }

        if (!vendorId || !mrId || totalAmount <= 0) {
            throw new Error("Missing required fields for quotation");
        }

        if (attachmentFile && attachmentFile.size > 0) {
            const uploadFormData = new FormData();
            uploadFormData.append("file", attachmentFile);
            attachmentUrl = await uploadFile(uploadFormData) || undefined;
        }

        const quotation = await prisma.quotation.create({
            data: {
                vendorId: vendorId,
                mrId: mrId,
                totalAmount: totalAmount,
                attachmentUrl: attachmentUrl,
                items: {
                    create: parsedItems.map(item => ({
                        materialRequisitionItemId: item.mrItemId,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice
                    }))
                }
            }
        });

        // Update MR status to QUOTING if it's currently APPROVED
        await prisma.materialRequisition.updateMany({
            where: { id: mrId, status: "APPROVED" },
            data: { status: "QUOTING" }
        });

        revalidatePath('/admin/procurement');
        return { success: true, quotation };
    } catch (error: any) {
        console.error("Error submitting Quotation:", error);
        return { success: false, error: error.message };
    }
}

export async function awardQuotation(quotationId: string, poNumber: string) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Get Quotation details
            const quotation = await tx.quotation.findUnique({
                where: { id: quotationId },
                include: {
                    items: true,
                    materialRequisition: {
                        include: { items: true, project: true }
                    }
                }
            });

            if (!quotation) throw new Error("Quotation not found");

            // Mark this quotation as selected
            await tx.quotation.update({
                where: { id: quotationId },
                data: { isSelected: true }
            });

            // Update MR status
            await tx.materialRequisition.update({
                where: { id: quotation.mrId },
                data: { status: "LPO_ISSUED" }
            });

            // Auto-Generate a DRAFT Purchase Order using the Quotation's itemized pricing
            const po = await tx.purchaseOrder.create({
                data: {
                    poNumber: poNumber,
                    date: new Date(),
                    vendorId: quotation.vendorId,
                    projectId: quotation.materialRequisition.projectId,
                    mrId: quotation.mrId,
                    totalAmount: quotation.totalAmount,
                    status: "DRAFT",
                    notes: `Auto-generated from Material Requisition ${quotation.materialRequisition.mrNumber}`,
                    items: {
                        create: quotation.materialRequisition.items.map((item: any) => {
                            // Find the matching quoted item for pricing
                            const quotedItem = quotation.items.find(qi => qi.materialRequisitionItemId === item.id);

                            return {
                                itemDescription: item.itemDescription,
                                quantity: item.quantity,
                                unit: item.unit,
                                unitPrice: quotedItem ? quotedItem.unitPrice : 0,
                                totalPrice: quotedItem ? quotedItem.totalPrice : 0
                            };
                        })
                    }
                }
            });

            return { quotation, purchaseOrder: po };
        });

        revalidatePath('/admin/procurement');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Error awarding Quotation:", error);
        return { success: false, error: error.message };
    }
}
