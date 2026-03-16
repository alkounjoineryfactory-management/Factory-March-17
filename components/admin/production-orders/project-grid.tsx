"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FolderKanban, ArrowRight, Calendar, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type Project = {
    id: string;
    name: string;
    client: string | null;
    status: string;
    deadline: Date | null;
    _count?: { productionOrders: number };
};

export default function ProjectGrid({ projects }: { projects: Project[] }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredProjects = projects.filter(project => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return project.name.toLowerCase().includes(query) || (project.client && project.client.toLowerCase().includes(query));
    });

    return (
        <div className="space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search projects by name or client..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-card border-border focus-visible:ring-primary"
                />
            </div>

            {filteredProjects.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-card">
                    <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium text-foreground">No projects found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        We couldn't find any projects matching your search.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProjects.map((project) => (
                        <Card
                            key={project.id}
                            onClick={() => router.push(`/admin/production-orders/${project.id}`)}
                            className="h-full hover:shadow-md transition-all duration-200 border-border bg-card group cursor-pointer hover:border-primary/50 relative overflow-hidden"
                        >
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                            {project.name}
                                        </CardTitle>
                                        {project.client && (
                                            <CardDescription className="flex items-center gap-1.5 mt-1.5 line-clamp-1">
                                                <User className="h-3.5 w-3.5" /> {project.client}
                                            </CardDescription>
                                        )}
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`w-fit mt-3 text-xs uppercase
                                            ${project.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800/50' :
                                            project.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800/50' :
                                                'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800/50'}
                                        `}
                                >
                                    {project.status}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between text-sm mt-2 pt-4 border-t border-border/50">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        {project.deadline ? format(new Date(project.deadline), "MMM d, yyyy") : "No deadline"}
                                    </div>
                                    <div className="font-medium text-foreground bg-secondary px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1.5">
                                        {project._count?.productionOrders || 0} Orders
                                        <ArrowRight className="h-3 w-3 opacity-50 group-hover:opacity-100 group-hover:-rotate-45 transition-all" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
