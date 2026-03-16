import { prisma } from "@/lib/prisma";
import { getMachines, getSections, getProjects } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumProjectCarousel } from "@/components/admin/premium-project-carousel";
import { Activity, Archive, BarChart3, CalendarDays, CheckCircle2, Factory, LayoutDashboard, Settings2, Users, PlusCircle, PenTool, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { PremiumCard } from "@/components/admin/premium-card";

export default async function AdminPage() {
    const [projects, sections, machines] = await Promise.all([
        getProjects(),
        getSections(),
        getMachines(),
    ]);

    // Calculate some quick stats for the Hero Section
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length; // Assuming status exists, or just use total
    const totalMachines = machines.length;
    const activeMachines = machines.filter(m => m.status === 'ACTIVE').length;    // Gradient Text Helper
    const gradientText = "bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500";

    return (
        <AdminPageLayout
            title="Factory Dashboard"
            description="Verify production flow, manage resources, and track progress in real-time."
            action={
                <div className="flex gap-3">
                    <Link href="/admin/reports">
                        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all">
                            <BarChart3 className="w-4 h-4" /> View Reports
                        </Button>
                    </Link>
                </div>
            }
        >
            <div className="space-y-12 relative pb-20">
                {/* Animated Background Mesh Orb */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse duration-10000"></div>

                {/* Ultra-Premium Hero Section */}
                <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

                        <PremiumCard className="p-1 relative overflow-hidden group" contentClassName="p-0">
                            {/* Dynamic Glowing Border */}
                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="bg-card/40 dark:bg-[#0f0f11]/60 backdrop-blur-3xl p-6 rounded-[20px] h-full border border-black/5 dark:border-white/5 relative z-10 flex flex-col justify-between overflow-hidden">
                                {/* Ambient inner glow */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>

                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                        <Archive className="w-6 h-6" />
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                </div>
                                <div>
                                    <div className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter drop-shadow-sm">{totalProjects}</div>
                                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-2">Total Projects</div>
                                </div>
                            </div>
                        </PremiumCard>

                        <PremiumCard className="p-1 relative overflow-hidden group" contentClassName="p-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="bg-card/40 dark:bg-[#0f0f11]/60 backdrop-blur-3xl p-6 rounded-[20px] h-full border border-black/5 dark:border-white/5 relative z-10 flex flex-col justify-between overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>

                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                </div>
                                <div>
                                    <div className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter drop-shadow-sm">{activeProjects}</div>
                                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-2">Active Factory</div>
                                </div>
                            </div>
                        </PremiumCard>

                        <PremiumCard className="p-1 relative overflow-hidden group" contentClassName="p-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="bg-card/40 dark:bg-[#0f0f11]/60 backdrop-blur-3xl p-6 rounded-[20px] h-full border border-black/5 dark:border-white/5 relative z-10 flex flex-col justify-between overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-700"></div>

                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3.5 bg-amber-50/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                        <Factory className="w-6 h-6" />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter drop-shadow-sm">{totalMachines}</div>
                                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-2">Managed Assets</div>
                                </div>
                            </div>
                        </PremiumCard>

                        <PremiumCard className="p-1 relative overflow-hidden group" contentClassName="p-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="bg-card/40 dark:bg-[#0f0f11]/60 backdrop-blur-3xl p-6 rounded-[20px] h-full border border-black/5 dark:border-white/5 relative z-10 flex flex-col justify-between overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-700"></div>

                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3.5 bg-purple-50/50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl ring-1 ring-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                                        <Users className="w-6 h-6" />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter drop-shadow-sm">{sections.length}</div>
                                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-2">Departments</div>
                                </div>
                            </div>
                        </PremiumCard>
                    </div>

                    {/* Quick Actions Bar */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 bg-card/30 dark:bg-card/10 backdrop-blur-2xl p-2 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                        <Link href="/admin/projects" className="flex-1 sm:flex-none">
                            <Button className="w-full sm:w-auto h-12 gap-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-[0_10px_20px_rgba(79,70,229,0.15)] hover:shadow-[0_10px_25px_rgba(79,70,229,0.3)] transition-all group">
                                <PlusCircle className="w-4 h-4" />
                                <span className="font-semibold tracking-wide">New Project</span>
                            </Button>
                        </Link>

                        <Link href="/admin/schedule" prefetch={false} className="flex-1 sm:flex-none">
                            <Button variant="outline" className="w-full sm:w-auto h-12 gap-3 bg-white/50 dark:bg-[#0f0f11]/50 border-white/10 hover:bg-white dark:hover:bg-[#1a1a1f] rounded-xl transition-all group">
                                <CalendarDays className="w-4 h-4 text-indigo-500" />
                                <span className="font-medium">Master Schedule</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all text-gray-400" />
                            </Button>
                        </Link>

                        <Link href="/admin/availability" className="flex-1 sm:flex-none">
                            <Button variant="outline" className="w-full sm:w-auto h-12 gap-3 bg-white/50 dark:bg-[#0f0f11]/50 border-white/10 hover:bg-white dark:hover:bg-[#1a1a1f] rounded-xl transition-all group">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                <span className="font-medium">Live Floor Status</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all text-gray-400" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* 3D Project Carousel */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <PremiumProjectCarousel projects={projects} />
                </div>
            </div>
        </AdminPageLayout>
    );
}
