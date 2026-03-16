import { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionsTab from "@/components/admin/factory-settings/sections-tab";
import MachinesTab from "@/components/admin/factory-settings/machines-tab";
import EmployeesTab from "@/components/admin/factory-settings/employees-tab";
import WorkingHoursTab from "@/components/admin/factory-settings/working-hours-tab";
import OTRateTab from "@/components/admin/factory-settings/ot-rate-tab";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { Clock, Layers, Monitor, Users, Banknote } from "lucide-react";

export const metadata: Metadata = {
    title: "Factory Settings | Factory Manager",
    description: "Manage Sections, Machines, and Employees",
};

export default function FactorySettingsPage() {
    return (
        <AdminPageLayout
            title="Factory Settings"
            description="Manage your factory layout, machines, and workforce."
        >
            <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
                <Tabs defaultValue="sections" className="w-full">
                    <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-transparent gap-8 mb-8">
                        <TabsTrigger
                            value="sections"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent px-1 py-3 text-muted-foreground font-medium transition-all hover:text-foreground"
                        >
                            <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Sections</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="machines"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent px-1 py-3 text-muted-foreground font-medium transition-all hover:text-foreground"
                        >
                            <span className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Machines</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="employees"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent px-1 py-3 text-muted-foreground font-medium transition-all hover:text-foreground"
                        >
                            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Employees</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="working-hours"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent px-1 py-3 text-muted-foreground font-medium transition-all hover:text-foreground"
                        >
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Working Hours</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="ot-rate"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent px-1 py-3 text-muted-foreground font-medium transition-all hover:text-foreground"
                        >
                            <span className="flex items-center gap-2"><Banknote className="w-4 h-4" /> OT Rate</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="sections" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <SectionsTab />
                    </TabsContent>

                    <TabsContent value="machines" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <MachinesTab />
                    </TabsContent>

                    <TabsContent value="employees" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <EmployeesTab />
                    </TabsContent>

                    <TabsContent value="working-hours" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <WorkingHoursTab />
                    </TabsContent>

                    <TabsContent value="ot-rate" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <OTRateTab />
                    </TabsContent>
                </Tabs>
            </div>
        </AdminPageLayout>
    );
}
