
import { Sidebar } from "@/components/ui/sidebar";
import { getCurrentAdmin, getSystemSettings } from "@/app/actions";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentAdmin();

    // No authenticated user → must be the login page.
    // Render bare children so the login page fills the full screen
    // without leaking any navigation items to unauthenticated visitors.
    if (!user) {
        return <>{children}</>;
    }

    const systemSettings = await getSystemSettings();

    return (
        <div className="flex min-h-screen bg-background transition-colors duration-200 print:bg-white">
            <div className="print:hidden">
                <Sidebar user={user} systemSettings={systemSettings} />
            </div>
            <main className="flex-1 ml-64 p-8 print:ml-0 print:p-0 print:bg-white">
                {children}
            </main>
        </div>
    );
}
