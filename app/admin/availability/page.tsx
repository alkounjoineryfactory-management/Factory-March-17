import AvailabilityDashboard from "@/components/admin/availability-dashboard";
import WeeklyAvailability from "@/components/admin/weekly-availability";
import { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { Gauge, Users, CalendarRange, User, Monitor } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";

export const metadata: Metadata = {
    title: "Factory Status | Factory Manager",
    description: "Real-time and weekly resource availability",
};

export const dynamic = 'force-dynamic';

export default async function AvailabilityPage() {
    const projects = await prisma.project.findMany({ orderBy: { name: 'asc' } });
    const sections = await prisma.section.findMany({ orderBy: { name: 'asc' } });
    const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });
    const machines = await prisma.machine.findMany({ orderBy: { name: 'asc' } });
    const users = await prisma.user.findMany({ select: { id: true, name: true, username: true, role: true }, orderBy: { name: 'asc' } });

    const productionOrders = await prisma.productionOrder.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    });


    return (
        <AdminPageLayout
            title="Resource Availability"
            description="Monitor live status and weekly capacity of all resources."
        >
            <div className="bg-card/40 backdrop-blur-2xl text-card-foreground rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 dark:border-white/5 relative overflow-hidden group">
                {/* Ambient Wrapper Glow */}
                <div className="absolute top-0 right-0 w-1/3 h-1/2 bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10 transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>

                <Tabs defaultValue="live" className="w-full relative z-10">
                    {/* Premium Minimalist Tabs exactly matching user reference */}
                    <div className="w-full flex justify-center mb-10 overflow-x-auto no-scrollbar pt-2">
                        <TabsList className="flex items-center w-full max-w-4xl h-auto p-0 bg-transparent rounded-none border-b border-black/10 dark:border-white/10 gap-0">
                            <TabsTrigger
                                value="live"
                                className="flex-1 max-w-[300px] h-[52px] rounded-none border border-transparent border-b-0 data-[state=active]:border-foreground/60 data-[state=active]:border-b-foreground/60 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground font-bold uppercase tracking-widest text-[11px] transition-all hover:text-foreground/80 -mb-[1px]"
                            >
                                <span className="flex items-center justify-center gap-2.5 w-full">
                                    <Users className="w-4 h-4" /> Live View
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="weekly"
                                className="flex-1 max-w-[300px] h-[52px] rounded-none border border-transparent border-b-0 data-[state=active]:border-foreground/60 data-[state=active]:border-b-foreground/60 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground font-bold uppercase tracking-widest text-[11px] transition-all hover:text-foreground/80 -mb-[1px]"
                            >
                                <span className="flex items-center justify-center gap-2.5 w-full">
                                    <CalendarRange className="w-4 h-4" /> Employees Timeline
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="machines-weekly"
                                className="flex-1 max-w-[300px] h-[52px] rounded-none border border-transparent border-b-0 data-[state=active]:border-foreground/60 data-[state=active]:border-b-foreground/60 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground font-bold uppercase tracking-widest text-[11px] transition-all hover:text-foreground/80 -mb-[1px]"
                            >
                                <span className="flex items-center justify-center gap-2.5 w-full">
                                    <Monitor className="w-4 h-4" /> Machines Timeline
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="staff-weekly"
                                className="flex-1 max-w-[300px] h-[52px] rounded-none border border-transparent border-b-0 data-[state=active]:border-foreground/60 data-[state=active]:border-b-foreground/60 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground font-bold uppercase tracking-widest text-[11px] transition-all hover:text-foreground/80 -mb-[1px]"
                            >
                                <span className="flex items-center justify-center gap-2.5 w-full">
                                    <User className="w-4 h-4" /> Staff Timeline
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="live" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-transparent rounded-3xl">
                            <AvailabilityDashboard />
                        </div>
                    </TabsContent>

                    <TabsContent value="weekly" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-background/20 backdrop-blur-md rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
                            <WeeklyAvailability
                                projects={projects}
                                sections={sections}
                                employees={employees}
                                machines={machines}
                                users={users}
                                productionOrders={productionOrders}
                                weeklyPlans={[]}
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="machines-weekly" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-background/20 backdrop-blur-md rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
                            <WeeklyAvailability
                                projects={projects}
                                sections={sections}
                                employees={employees}
                                machines={machines}
                                users={users}
                                productionOrders={productionOrders}
                                weeklyPlans={[]}
                                viewMode="machines"
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="staff-weekly" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-background/20 backdrop-blur-md rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
                            <WeeklyAvailability
                                projects={projects}
                                sections={sections}
                                employees={employees}
                                machines={machines}
                                users={users}
                                productionOrders={productionOrders}
                                weeklyPlans={[]}
                                viewMode="staff"
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminPageLayout>
    );
}
