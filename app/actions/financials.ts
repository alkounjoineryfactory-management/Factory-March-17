"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- TAB 1: PROJECT FINANCIALS ---
export async function getProjectFinancials() {
    try {
        const projects = await prisma.project.findMany({
            include: {
                invoices: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const financials = projects.map(project => {
            const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.amount, 0);
            const balanceToInvoice = project.amount - totalInvoiced;

            return {
                id: project.id,
                projectNumber: project.projectNumber,
                name: project.name,
                totalAmount: project.amount,
                pricedBoqUrl: project.pricedBoqUrl,
                totalInvoiced,
                balanceToInvoice,
                status: project.status
            };
        });

        return { success: true, financials };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error fetching project financials:", err);
        return { success: false, error: err.message };
    }
}

export async function updateProjectPricedBoq(projectId: string, pricedBoqUrl: string) {
    try {
        await prisma.project.update({
            where: { id: projectId },
            data: { pricedBoqUrl }
        });

        revalidatePath('/admin/financial-reports');
        return { success: true };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error updating priced BOQ:", err);
        return { success: false, error: err.message };
    }
}

// --- TAB 2 & 3: INVOICE MANAGEMENT & SCHEDULE ---

export async function getInvoices(projectId?: string, month?: string) {
    try {
        const filters: Record<string, string> = {};
        if (projectId) filters.projectId = projectId;
        if (month) filters.month = month;

        const invoices = await prisma.invoice.findMany({
            where: filters,
            include: {
                project: { select: { name: true, projectNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, invoices };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error fetching invoices:", err);
        return { success: false, error: err.message };
    }
}

export async function createInvoice(data: {
    invoiceNo: string;
    projectId: string;
    type: string;
    month?: string;
    dueDate?: Date;
    amount: number;
    notes?: string;
    invoiceFileUrl?: string;
}) {
    try {
        // Validation check for unique invoice No
        const exists = await prisma.invoice.findUnique({ where: { invoiceNo: data.invoiceNo } });
        if (exists) {
            return { success: false, error: "Invoice number already exists" };
        }

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNo: data.invoiceNo,
                projectId: data.projectId,
                type: data.type,
                month: data.month,
                dueDate: data.dueDate,
                amount: data.amount,
                notes: data.notes,
                invoiceFileUrl: data.invoiceFileUrl,
                status: "PENDING"
            }
        });

        revalidatePath('/admin/financial-reports');
        return { success: true, invoice };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error creating invoice:", err);
        return { success: false, error: err.message };
    }
}

export async function updateInvoiceStatus(invoiceId: string, status: "PENDING" | "PARTIALLY_PAID" | "PAID") {
    try {
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status }
        });

        revalidatePath('/admin/financial-reports');
        return { success: true };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error updating invoice status:", err);
        return { success: false, error: err.message };
    }
}

// --- TAB 4: PAYABLES & RECEIVABLES (CASH FLOW) ---

export async function getCashFlow() {
    try {
        // Receivables: PENDING Invoices
        const receivables = await prisma.invoice.findMany({
            where: { status: { not: "PAID" } },
            include: {
                project: { select: { name: true, projectNumber: true } }
            },
            orderBy: { dueDate: 'asc' }
        });

        // Payables: Received Purchase Orders
        // Product must be received to be considered a Payable
        const payables = await prisma.purchaseOrder.findMany({
            where: {
                // Valid in-use delivery statuses (DELIVERED_PARTIAL was never real; use PARTIAL instead)
                status: { in: ["PARTIAL", "DELIVERED_FULL", "RECEIVED", "PAID"] }
            },
            include: {
                vendor: { select: { name: true } }
            },
            orderBy: { date: 'asc' }
        });

        const totalReceivables = receivables.reduce((sum, inv) => sum + inv.amount, 0);
        const totalPayables = payables.reduce((sum, po) => sum + po.totalAmount, 0);
        const netCashFlow = totalReceivables - totalPayables;

        return {
            success: true,
            cashFlow: {
                receivables,
                payables,
                totalReceivables,
                totalPayables,
                netCashFlow
            }
        };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error fetching cash flow:", err);
        return { success: false, error: err.message };
    }
}

export async function getVendorsWithPayables() {
    try {
        const vendors = await prisma.vendor.findMany({
            include: {
                purchaseOrders: {
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, vendors };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error fetching vendors with payables:", err);
        return { success: false, error: err.message };
    }
}

export async function receiveInvoicePayment(invoiceId: string, amountReceived: number) {
    try {
        if (amountReceived <= 0) {
            throw new Error("Amount must be greater than zero.");
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) throw new Error("Invoice not found");

        const newPaidAmount = invoice.paidAmount + amountReceived;

        // Auto-determine new status
        let newStatus = invoice.status;
        if (newPaidAmount >= invoice.amount) {
            newStatus = "PAID";
        } else if (newPaidAmount > 0) {
            newStatus = "PARTIALLY_PAID";
        }

        const updated = await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                paidAmount: newPaidAmount,
                status: newStatus
            }
        });

        // AUTOMATED LEDGER ENTRY (Accounts Receivable -> Cash)
        // 1. Find standard accounts
        const cashAccount = await prisma.chartOfAccount.findFirst({
            where: { name: { contains: "Cash & Cash Equivalents" } }
        });
        const arAccount = await prisma.chartOfAccount.findFirst({
            where: { name: { contains: "Accounts Receivable" } }
        });

        if (cashAccount && arAccount) {
            // Debit: Cash (Asset Increasing)
            // Credit: AR (Asset Decreasing)
            await recordTransaction({
                type: "INCOME",
                description: `Payment received for Invoice #${invoice.invoiceNo}`,
                amount: amountReceived,
                date: new Date(),
                debitAccountId: cashAccount.id,     // Cash goes up
                creditAccountId: arAccount.id,      // AR goes down
            });
        }

        revalidatePath('/admin/financial-reports');
        return { success: true, invoice: updated };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error receiving payment:", err);
        return { success: false, error: err.message };
    }
}

export async function markPayablePaid(poId: string) {
    try {
        const updated = await prisma.purchaseOrder.update({
            where: { id: poId },
            data: { status: "PAID" }
        });

        // AUTOMATED LEDGER ENTRY (Accounts Payable -> Cash)
        // 1. Find standard accounts
        const cashAccount = await prisma.chartOfAccount.findFirst({
            where: { name: { contains: "Cash & Cash Equivalents" } }
        });
        const apAccount = await prisma.chartOfAccount.findFirst({
            where: { name: { contains: "Accounts Payable" } }
        });

        if (cashAccount && apAccount && updated.totalAmount) {
            // Debit: AP (Liability Decreasing)
            // Credit: Cash (Asset Decreasing)
            await recordTransaction({
                type: "EXPENSE",
                description: `Payment made for PO #${updated.poNumber}`,
                amount: updated.totalAmount,
                date: new Date(),
                debitAccountId: apAccount.id,       // AP goes down
                creditAccountId: cashAccount.id,    // Cash goes down
            });
        }

        revalidatePath('/admin/financial-reports', 'layout');
        revalidatePath('/admin/procurement', 'layout');
        return { success: true, purchaseOrder: updated };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error marking payable as paid:", err);
        return { success: false, error: err.message };
    }
}

// --- TAB 5: CHART OF ACCOUNTS ---

export async function getAccounts() {
    try {
        const accounts = await prisma.chartOfAccount.findMany({
            orderBy: [
                { category: 'asc' },
                { code: 'asc' }
            ]
        });
        return { success: true, accounts };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error fetching accounts:", err);
        return { success: false, error: err.message };
    }
}

export async function createAccount(data: {
    name: string;
    category: string;
    type: string;
    code?: string;
    balance?: number;
    description?: string;
}) {
    try {
        let finalCode = data.code;

        if (!finalCode) {
            // Auto-generate code based on category
            const prefixMap: Record<string, string> = {
                "Assets": "1",
                "Liabilities": "2",
                "Equity": "3",
                "Revenue": "4",
                "COGS": "5",
                "Expenses": "6",
            };
            const prefix = prefixMap[data.category] || "9";

            // Find highest code in this category
            const highestAccount = await prisma.chartOfAccount.findFirst({
                where: { category: data.category },
                orderBy: { code: 'desc' }
            });

            if (highestAccount && !isNaN(parseInt(highestAccount.code))) {
                const currentMax = parseInt(highestAccount.code);
                // Increment by 10 to leave room for insertions
                finalCode = (currentMax + 10).toString();
            } else {
                finalCode = prefix + "000"; // Starting code
            }
        }

        const existing = await prisma.chartOfAccount.findUnique({
            where: { code: finalCode }
        });

        if (existing) {
            throw new Error(`Account code ${finalCode} is already in use.`);
        }

        const account = await prisma.chartOfAccount.create({
            data: {
                ...data,
                code: finalCode,
                balance: data.balance || 0
            }
        });

        revalidatePath('/admin/financial-reports');
        return { success: true, account };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error creating account:", err);
        return { success: false, error: err.message };
    }
}

export async function deleteAccount(id: string) {
    try {
        await prisma.chartOfAccount.delete({
            where: { id }
        });

        revalidatePath('/admin/financial-reports');
        return { success: true };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error deleting account:", err);
        return { success: false, error: err.message };
    }
}

// --- TAB 6: TRANSACTIONS (LEDGER) ---

export async function getTransactions() {
    try {
        const transactions = await prisma.transaction.findMany({
            orderBy: { date: 'desc' },
            include: {
                debitAccount: true,
                creditAccount: true
            }
        });
        return { success: true, transactions };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error fetching transactions:", err);
        return { success: false, error: err.message };
    }
}

export async function recordTransaction(data: {
    type: string;
    description: string;
    amount: number;
    date: Date;
    debitAccountId: string;
    creditAccountId: string;
}) {
    try {
        if (data.amount <= 0) {
            throw new Error("Transaction amount must be greater than zero.");
        }

        const result = await prisma.$transaction(async (tx) => {
            // Fetch accounts to check normal balance rules
            const debitAccount = await tx.chartOfAccount.findUnique({ where: { id: data.debitAccountId } });
            const creditAccount = await tx.chartOfAccount.findUnique({ where: { id: data.creditAccountId } });

            if (!debitAccount || !creditAccount) {
                throw new Error("Invalid account selection.");
            }

            // Generate unique reference
            const reference = `TXN-${Date.now().toString().slice(-6)}`;

            // Create Transaction record
            const transaction = await tx.transaction.create({
                data: {
                    reference,
                    date: data.date,
                    description: data.description,
                    amount: data.amount,
                    type: data.type,
                    debitAccountId: data.debitAccountId,
                    creditAccountId: data.creditAccountId
                }
            });

            // Update Balances Based on Standard Accounting Rules
            // Debit Side
            const isDebitAccDebitNormal = debitAccount.type === "Debit";
            await tx.chartOfAccount.update({
                where: { id: data.debitAccountId },
                data: { balance: { increment: isDebitAccDebitNormal ? data.amount : -data.amount } }
            });

            // Credit Side
            const isCreditAccCreditNormal = creditAccount.type === "Credit";
            await tx.chartOfAccount.update({
                where: { id: data.creditAccountId },
                data: { balance: { increment: isCreditAccCreditNormal ? data.amount : -data.amount } }
            });

            return transaction;
        });

        revalidatePath('/admin/financial-reports');
        return { success: true, transaction: result };
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error("Error recording transaction:", err);
        return { success: false, error: err.message };
    }
}
