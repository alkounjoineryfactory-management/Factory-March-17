import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { getReportsDashboardData, getProjectsReport, getProductionOrdersReport, getWeeklyTasksReport, getDailyJobCardsReport } from "@/app/actions/reports";
import { getSystemSettings } from "@/app/actions";
import ReportsDashboardClient from "@/components/admin/reports/dashboard-client";

export default async function ReportsPage() {
    // Parallel data fetching for speed
    const [
        kpiData,
        projectsReport,
        productionOrdersReport,
        weeklyTasksReport,
        dailyJobCardsReport,
        settings
    ] = await Promise.all([
        getReportsDashboardData(),
        getProjectsReport(),
        getProductionOrdersReport(),
        getWeeklyTasksReport(),
        getDailyJobCardsReport(),
        getSystemSettings()
    ]);

    return (
        <AdminPageLayout
            title="Enterprise Reports"
            description="Comprehensive analytics, production tracking, and factory performance metrics."
        >
            <ReportsDashboardClient
                kpiData={kpiData}
                projects={projectsReport}
                productionOrders={productionOrdersReport}
                weeklyTasks={weeklyTasksReport}
                dailyJobCards={dailyJobCardsReport}
                settings={settings}
            />
        </AdminPageLayout>
    );
}
