"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// --- STORE ITEM ACTIONS ---

export async function getStoreItems(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
}) {
    try {
        const page = params?.page || 1;
        const limit = params?.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (params?.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { itemCode: { contains: params.search, mode: 'insensitive' } }
            ];
        }

        if (params?.category && params.category !== "ALL") {
            if (params.category === "Uncategorized") {
                where.OR = [
                    ...(where.OR || []),
                    { category: null },
                    { category: "" }
                ];
            } else {
                where.category = params.category;
            }
        }

        const items = await prisma.storeItem.findMany({
                where,
                skip,
                take: limit + 1,
                select: {
                    id: true,
                    itemCode: true,
                    name: true,
                    category: true,
                    unit: true,
                    currentStock: true,
                    projectStocks: { select: { projectId: true, quantity: true } },
                    transactions: {
                        // OUT_TO_FACTORY is a valid stored value (written by store-consumption.ts) even
                        // though it is not listed in the schema comment. Cast via string[] to keep TS happy.
                        where: { type: { in: ['TRANSFER_TO_PROJECT', 'TRANSFER_TO_GENERAL', 'OUT_TO_FACTORY'] as string[] } },
                        select: { type: true, quantity: true, projectId: true }
                    }
                },
                orderBy: { name: 'asc' }
            });

        const hasNextPage = items.length > limit;
        const itemsToProcess = hasNextPage ? items.slice(0, limit) : items;

        const itemIds = itemsToProcess.map(i => i.id);
        
        // Fetch Pos matching by itemCode OR name
        const searchConditions = itemsToProcess.flatMap(i => {
            const conds = [];
            if (i.itemCode) conds.push({ itemCode: i.itemCode });
            if (i.name) conds.push({ itemDescription: i.name });
            return conds;
        });

        const [pos, allJobCards] = await Promise.all([
            searchConditions.length > 0 ? prisma.purchaseOrder.findMany({
                // Bug fix: 'DELIVERED_PARTIAL' is not a valid PO status. The correct status is 'PARTIAL'.
                where: { status: { in: ['DELIVERED_FULL', 'PARTIAL', 'PAID'] } },
                include: {
                    items: {
                        where: { OR: searchConditions }
                    }
                }
            }) : Promise.resolve([]),
            searchConditions.length > 0 ? prisma.jobCard.findMany({
                where: {
                    status: 'COMPLETED',
                    OR: searchConditions.map(cond => cond.itemCode ? { itemCode: cond.itemCode } : { itemCode: cond.itemDescription })
                },
                select: { actualQty: true, targetQty: true, projectId: true, itemCode: true }
            }) : Promise.resolve([])
        ]);

        const itemsWithProjectStock = itemsToProcess.map(item => {
            // Track per project: delivered, transacted, used
            const projectMath: Record<string, { delivered: number, netTransfers: number, used: number }> = {};
            const ensureProject = (pId: string) => { if (!projectMath[pId]) projectMath[pId] = { delivered: 0, netTransfers: 0, used: 0 }; };

            // A. Delivered from POs
            pos.forEach(po => {
                const poId = po.projectId;
                if (!poId) return;
                po.items.forEach(poItem => {
                    const poCodeLower = poItem.itemCode?.trim().toLowerCase();
                    const poDescLower = poItem.itemDescription?.trim().toLowerCase();
                    const codeMatch = item.itemCode && poCodeLower && item.itemCode.trim().toLowerCase() === poCodeLower;
                    const nameMatch = item.name && poDescLower && item.name.trim().toLowerCase() === poDescLower;
                    
                    if (codeMatch || nameMatch) {
                        ensureProject(poId);
                        projectMath[poId].delivered += poItem.quantity;
                    }
                });
            });

            // B. Transacted & Used (OUT_TO_FACTORY)
            item.transactions.forEach(tx => {
                if (tx.projectId) {
                    ensureProject(tx.projectId);
                    if (tx.type === 'TRANSFER_TO_PROJECT') {
                        projectMath[tx.projectId].netTransfers += tx.quantity;
                    } else if (tx.type === 'TRANSFER_TO_GENERAL') {
                        projectMath[tx.projectId].netTransfers -= tx.quantity;
                    } else if (tx.type === 'OUT_TO_FACTORY' as any) {
                        projectMath[tx.projectId].used += tx.quantity;
                    }
                }
            });

            // C. JobCards
            allJobCards.forEach(job => {
                const jId = job.projectId;
                if (!jId) return;
                const jobCodeMatch = job.itemCode?.trim().toLowerCase() === item.itemCode?.trim().toLowerCase();
                const jobNameMatch = job.itemCode?.trim().toLowerCase() === item.name?.trim().toLowerCase();
                if (jobCodeMatch || jobNameMatch) {
                    ensureProject(jId);
                    projectMath[jId].used += (job.actualQty || job.targetQty || 1);
                }
            });

            // Sum up Unused Balances exactly as the Modal does
            // Unused Balance = (Delivered + Net Transfers) - Used
            let totalUnusedBalance = 0;
            for (const pId in projectMath) {
                const p = projectMath[pId];
                const strictTrueProjectStock = p.delivered + p.netTransfers;
                const unused = strictTrueProjectStock - p.used;
                totalUnusedBalance += unused;
            }

            const generalStock = item.currentStock; // General Stock ONLY
            
            return {
                id: item.id,
                itemCode: item.itemCode,
                name: item.name,
                category: item.category,
                unit: item.unit,
                projectStock: totalUnusedBalance,
                currentStock: generalStock, // Display value for General
                totalPhysicalStock: generalStock + totalUnusedBalance // True absolute total representation
            };
        });

        return { success: true, items: itemsWithProjectStock, hasNextPage };
    } catch (error: any) {
        console.error("Error fetching Store Items:", error);
        return { success: false, error: error.message };
    }
}

export async function createStoreItem(data: {
    itemCode: string;
    name: string;
    category?: string;
    unit?: string;
    initialStock?: number;
}) {
    try {
        if (!data.itemCode || !data.name) {
            throw new Error("Item Code and Name are required");
        }

        const storeItem = await prisma.storeItem.create({
            data: {
                itemCode: data.itemCode,
                name: data.name,
                category: data.category,
                unit: data.unit || 'pcs',
                currentStock: data.initialStock || 0
            }
        });

        // If initial stock > 0, create a transaction for it
        if (data.initialStock && data.initialStock > 0) {
            await prisma.storeTransaction.create({
                data: {
                    storeItemId: storeItem.id,
                    type: "IN",
                    quantity: data.initialStock,
                    reference: "Initial Balance"
                }
            });
        }

        revalidatePath('/admin/procurement');
        return { success: true, storeItem };
    } catch (error: any) {
        console.error("Error creating Store Item:", error);
        return { success: false, error: error.message };
    }
}

// --- STORE TRANSACTION ACTIONS ---

export async function getStoreItemTransactions(storeItemId: string) {
    try {
        const storeItem = await prisma.storeItem.findUnique({
            where: { id: storeItemId }
        });

        if (!storeItem) throw new Error("Store Item not found");

        // 1. Fetch manual transactions
        const transactions = await prisma.storeTransaction.findMany({
            where: { storeItemId },
            orderBy: { date: 'desc' }
        });

        // 2. Fetch Project PO receipts (matching by itemCode OR name)
        let projectedTransactions: any[] = [];
        
        const codeLower = storeItem.itemCode?.trim().toLowerCase();
        const nameLower = storeItem.name?.trim().toLowerCase();
        
        const projectPOs = await prisma.purchaseOrder.findMany({
            where: {
                projectId: { not: null },
                // Bug fix: 'DELIVERED_PARTIAL' → 'PARTIAL' to match the actual schema status value.
                status: { in: ['DELIVERED_FULL', 'PARTIAL', 'PAID'] }
            },
            include: { items: true, project: true }
        });

        projectPOs.forEach(po => {
            po.items.forEach(item => {
                const poCodeLower = item.itemCode?.trim().toLowerCase();
                const poDescLower = item.itemDescription?.trim().toLowerCase();

                if (
                    (codeLower && poCodeLower && codeLower === poCodeLower) ||
                    (nameLower && poDescLower && nameLower === poDescLower) ||
                    (codeLower && poDescLower && codeLower === poDescLower) ||
                    (nameLower && poCodeLower && nameLower === poCodeLower)
                ) {
                    projectedTransactions.push({
                        id: `po-${po.id}-${item.id}`,
                        type: 'IN', // Project Delivery Receipt
                        quantity: item.quantity,
                        reference: `Project LPO: ${po.poNumber} (${po.project?.name})`,
                        date: po.updatedAt // Best proxy for delivery time
                    });
                }
            });
        });

        // 3. Combine and sort descending by date
        const combined = [...transactions, ...projectedTransactions].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return { success: true, transactions: combined };
    } catch (error: any) {
        console.error("Error fetching transactions:", error);
        return { success: false, error: error.message };
    }
}

export async function createStoreTransaction(data: {
    storeItemId: string;
    type: "IN" | "OUT";
    quantity: number;
    reference?: string;
}) {
    try {
        if (!data.storeItemId || !data.quantity || data.quantity <= 0) {
            throw new Error("Store Item and a positive quantity are required");
        }

        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.storeItem.findUnique({
                where: { id: data.storeItemId }
            });

            if (!item) throw new Error("Store Item not found");

            if (data.type === "OUT" && item.currentStock < data.quantity) {
                throw new Error(`Insufficient stock for ${item.name}. Current: ${item.currentStock}`);
            }

            const transaction = await tx.storeTransaction.create({
                data: {
                    storeItemId: data.storeItemId,
                    type: data.type,
                    quantity: data.quantity,
                    reference: data.reference || "Manual Adjustment"
                }
            });

            // "IN" / "OUT" transactions ONLY affect General Stock.
            // If they wanted Project Stock, they use the TRANSFER action.
            const updatedStock = data.type === "IN"
                ? item.currentStock + data.quantity
                : item.currentStock - data.quantity;

            await tx.storeItem.update({
                where: { id: data.storeItemId },
                data: { currentStock: updatedStock }
            });

            return { transaction, updatedStock };
        });

        revalidatePath('/admin/procurement');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Error creating Store Transaction:", error);
        return { success: false, error: error.message };
    }
}

export async function transferStoreStock(data: {
    storeItemId: string;
    projectId: string;
    type: "TRANSFER_TO_PROJECT" | "TRANSFER_TO_GENERAL";
    quantity: number;
    reference?: string;
}) {
    try {
        if (!data.storeItemId || !data.projectId || !data.quantity || data.quantity <= 0) {
            throw new Error("Store Item, Project, and a positive quantity are required");
        }

        // We need to fetch current total physical stock and current project stock to validate
        const item = await prisma.storeItem.findUnique({
            where: { id: data.storeItemId },
            include: { projectStocks: { where: { projectId: data.projectId } } }
        });

        if (!item) throw new Error("Store Item not found");

        let currentProjectStock = item.projectStocks[0]?.quantity || 0;

        // Ensure we calculate the TRUE dynamic project stock available
        const breakdownRes = await getStoreItemProjectBreakdown(data.projectId, item.itemCode, item.name);
        if (breakdownRes.success && breakdownRes.breakdown && breakdownRes.breakdown.length > 0) {
            const bData = breakdownRes.breakdown[0];
            const strictTrueProjectStock = bData.deliveredQty + bData.netTransfers;
            const remainingQty = strictTrueProjectStock - bData.usedQty;
            currentProjectStock = remainingQty > 0 ? remainingQty : 0;
        }

        if (data.type === "TRANSFER_TO_PROJECT") {
            if (item.currentStock < data.quantity) {
                throw new Error(`Insufficient General Stock (${item.currentStock}) for this transfer.`);
            }
        } else if (data.type === "TRANSFER_TO_GENERAL") {
            if (currentProjectStock < data.quantity) {
                throw new Error(`Insufficient Project Stock (${currentProjectStock}) for this transfer.`);
            }
        }

        await prisma.$transaction(async (tx) => {
            if (data.type === "TRANSFER_TO_PROJECT") {
                // Deduct from General
                await tx.storeItem.update({
                    where: { id: data.storeItemId },
                    data: { currentStock: item.currentStock - data.quantity }
                });
                
                // Add to Project
                await tx.projectStock.upsert({
                    where: {
                        storeItemId_projectId: {
                            storeItemId: data.storeItemId,
                            projectId: data.projectId
                        }
                    },
                    update: { quantity: currentProjectStock + data.quantity },
                    create: {
                        storeItemId: data.storeItemId,
                        projectId: data.projectId,
                        quantity: data.quantity
                    }
                });
            } else if (data.type === "TRANSFER_TO_GENERAL") {
                // Deduct from Project (allow going negative if the DB row isn't fully synched, modal relies on dynamic calculation)
                const staticDbProjectStockRow = item.projectStocks[0]?.quantity || 0;
                await tx.projectStock.upsert({
                    where: {
                        storeItemId_projectId: {
                            storeItemId: data.storeItemId,
                            projectId: data.projectId
                        }
                    },
                    update: { quantity: staticDbProjectStockRow - data.quantity },
                    create: {
                        storeItemId: data.storeItemId,
                        projectId: data.projectId,
                        quantity: -data.quantity
                    }
                });
                
                // Add to General
                await tx.storeItem.update({
                    where: { id: data.storeItemId },
                    data: { currentStock: item.currentStock + data.quantity }
                });
            }

            // Record Ledger Action
            await tx.storeTransaction.create({
                data: {
                    storeItemId: data.storeItemId,
                    projectId: data.projectId,
                    type: data.type,
                    quantity: data.quantity,
                    reference: data.reference || (data.type === "TRANSFER_TO_PROJECT" ? "MANUAL TRANSFER TO PROJECT" : "MANUAL RETURN TO GENERAL")
                }
            });
        });

        revalidatePath('/admin/procurement');
        return { success: true };
    } catch (error: any) {
        console.error("Error transferring store stock:", error);
        return { success: false, error: error.message };
    }
}

// --- PROJECT BREAKDOWN ACTIONS ---

export async function getProjectsForDropdown() {
    try {
        const projects = await prisma.project.findMany({
            where: { status: { not: "COMPLETED" } },
            select: { id: true, name: true, projectNumber: true },
            orderBy: { name: 'asc' }
        });
        return { success: true, projects };
    } catch (error: any) {
        console.error("Error fetching projects for dropdown:", error);
        return { success: false, error: error.message };
    }
}

export async function getStoreItemProjectBreakdown(projectId: string, itemCode: string, itemName: string) {
    try {
        if (!projectId) return { success: false, error: "Project ID is required" };

        const itemCodeTrimmed = itemCode?.trim().toLowerCase();
        const itemNameTrimmed = itemName?.trim().toLowerCase();

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, name: true, projectNumber: true }
        });

        if (!project) return { success: false, error: "Project not found" };

        let requestedQty = 0;
        let orderedQty = 0;
        let deliveredQty = 0;
        let usedQty = 0;
        let netTransfers = 0;

        // Fetch Store Item ID for transfer logic
        const storeItem = await prisma.storeItem.findFirst({
            where: {
                OR: [
                    { itemCode: { equals: itemCode } },
                    { name: { equals: itemName } }
                ]
            }
        });

        if (storeItem) {
            const transfers = await prisma.storeTransaction.findMany({
                where: {
                    storeItemId: storeItem.id,
                    type: { in: ['TRANSFER_TO_PROJECT', 'TRANSFER_TO_GENERAL', 'OUT_TO_FACTORY'] as string[] }
                }
            });

            transfers.forEach(tx => {
                // If the transfer relates to THIS exact project, OR if no specific project was tracked 
                // but the item belongs to a PO mapping, we handle it carefully.
                // The DB schema added projectId to StoreTransaction for transfers.
                if (tx.projectId === project.id) {
                    if (tx.type === 'TRANSFER_TO_PROJECT') {
                        netTransfers += tx.quantity;
                    } else if (tx.type === 'TRANSFER_TO_GENERAL') {
                        netTransfers -= tx.quantity;
                    } else if (tx.type === 'OUT_TO_FACTORY' as any) {
                        usedQty += tx.quantity; // Add manual consumption here
                    }
                }
            });
        }

        // 2. Aggregate Requested Qty (Material Requisitions) for THIS project
        const mrs = await prisma.materialRequisition.findMany({
            where: {
                projectId: projectId,
                status: { not: "REJECTED" }
            },
            include: {
                items: {
                    where: {
                        OR: [
                            { itemCode: { equals: itemCode } },
                            { itemDescription: { equals: itemName } }
                        ]
                    }
                }
            }
        });

        mrs.forEach(mr => {
            mr.items.forEach(item => {
                requestedQty += item.quantity;
            });
        });

        // 3. Aggregate Ordered & Delivered Qty (Purchase Orders) for THIS project
        const pos = await prisma.purchaseOrder.findMany({
            where: {
                projectId: projectId,
                status: { not: "CANCELLED" }
            },
            include: {
                items: {
                    where: {
                        OR: [
                            { itemCode: { equals: itemCode } },
                            { itemDescription: { equals: itemName } }
                        ]
                    }
                }
            }
        });

        pos.forEach(po => {
            po.items.forEach(item => {
                orderedQty += item.quantity;
                if (po.status === 'DELIVERED_FULL' || po.status === 'DELIVERED_PARTIAL' || po.status === 'PAID') {
                    deliveredQty += item.quantity;
                }
            });
        });

        // 4. Aggregate Used Qty (JobCards in MES) for THIS project
        const jobCardOrConditions: any[] = [];
        if (itemCodeTrimmed) jobCardOrConditions.push({ itemCode: itemCodeTrimmed });
        if (itemNameTrimmed) jobCardOrConditions.push({ itemCode: itemNameTrimmed });
        if (itemCode) jobCardOrConditions.push({ itemCode: itemCode });

        const jobCards = await prisma.jobCard.findMany({
            where: {
                projectId: projectId,
                status: "COMPLETED",
                ...(jobCardOrConditions.length > 0 ? { OR: jobCardOrConditions } : {})
            }
        });

        jobCards.forEach(job => {
            // Bug fix: use null-coalescing so actualQty=0 (zero output) is not overridden by targetQty
            const qtyUsed = job.actualQty != null ? job.actualQty : (job.targetQty ?? 1);
            usedQty += qtyUsed;
        });

        // 5. Query the new definitive ProjectStock row for this item
        let currentProjectStock = 0;
        if (storeItem) {
            const projectStockRow = await prisma.projectStock.findUnique({
                where: {
                    storeItemId_projectId: {
                        storeItemId: storeItem.id,
                        projectId: project.id
                    }
                }
            });
            if (projectStockRow) {
                currentProjectStock = projectStockRow.quantity;
            }
        }

        const breakdown = [{
            projectId: project.id,
            projectName: project.name,
            projectCode: project.projectNumber || '',
            requestedQty,
            orderedQty,
            deliveredQty,
            usedQty,
            netTransfers,
            currentProjectStock
        }];

        return { success: true, breakdown };
    } catch (error: any) {
        console.error("Error fetching Store Item Project Breakdown:", error);
        return { success: false, error: error.message };
    }
}
