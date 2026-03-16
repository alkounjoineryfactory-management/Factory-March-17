import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { getProjectFinancials, getInvoices, getCashFlow, getVendorsWithPayables, getAccounts, getTransactions } from "@/app/actions/financials";
import { getProjectsForDropdown } from "@/app/actions/store";
import FinancialDashboardClient from "@/components/admin/financial-reports/financial-dashboard-client";
import { prisma } from "@/lib/prisma";

export const metadata = {
    title: "Financial Reports | Factory Manager"
};

export default async function FinancialReportsPage() {
    // 1. Fetch data for Project Financials (Tab 1)
    const { financials = [] } = await getProjectFinancials();

    // 2. Fetch data for all Invoices (Tab 2 & 3)
    const { invoices = [] } = await getInvoices();

    // 3. Fetch Projects just for dropdown mapping
    const { projects = [] } = await getProjectsForDropdown();

    // 4. Fetch Cash Flow Data (Tab 4)
    const { cashFlow = { receivables: [], payables: [], totalReceivables: 0, totalPayables: 0, netCashFlow: 0 } } = await getCashFlow();

    // 5. Fetch Vendors along with their active purchase orders for Payables computation (Tab 4 and 5)
    const { vendors = [] } = await getVendorsWithPayables();

    // 6. Fetch Chart of Accounts (Tab 5)
    const { accounts = [] } = await getAccounts();

    // 7. Fetch Transactions (Tab 6)
    const { transactions = [] } = await getTransactions();

    // 8. Fetch System Settings for PDF generation
    const settings = await prisma.systemSettings.findFirst();

    return (
        <AdminPageLayout
            title="Financial Reports & Invoicing"
            description="Manage client receivables, track monthly schedules, and overview supplier payables."
        >
            <FinancialDashboardClient
                projects={projects}
                financials={financials}
                invoices={invoices}
                cashFlow={cashFlow}
                vendors={vendors}
                accounts={accounts}
                transactions={transactions}
                settings={settings}
            />
        </AdminPageLayout>
    );
}
