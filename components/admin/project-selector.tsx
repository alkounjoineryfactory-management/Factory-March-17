"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "@/app/actions/projects";
import { useState } from "react";

interface Project {
    id: string;
    name: string;
    client: string | null;
}

export default function ProjectSelector({ projects }: { projects: Project[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedProjectId = searchParams.get("projectId") || "";
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleProjectChange = (projectId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (projectId && projectId !== "all") {
            params.set("projectId", projectId);
        } else {
            params.delete("projectId");
        }
        router.push(`/admin?${params.toString()}`);
    };

    return (
        <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
            <div className="flex-1 w-full">
                <Label className="mb-2 block text-sm font-medium text-gray-500">Selected Project</Label>
                <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                    <SelectTrigger className="w-full md:w-[400px] h-11 bg-gray-50/50 border-gray-200 focus:ring-indigo-500/20">
                        <SelectValue placeholder="Select a Project" />
                    </SelectTrigger>
                    <SelectContent>
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="cursor-pointer py-3">
                                <span className="font-medium text-gray-700">{p.name}</span>
                                {p.client && <span className="ml-2 text-gray-400 text-xs">({p.client})</span>}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full md:w-auto h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all">
                        + Create New Project
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                    </DialogHeader>
                    <form action={async (formData) => {
                        await createProject(formData);
                        setIsDialogOpen(false);
                    }} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Project Name</Label>
                            <Input name="name" required placeholder="e.g. Office Renovation" className="h-10" />
                        </div>
                        <div className="space-y-2">
                            <Label>Client Name</Label>
                            <Input name="client" placeholder="e.g. Acme Corp" className="h-10" />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (QR)</Label>
                            <Input type="number" step="0.01" name="amount" placeholder="0.00" className="h-10" />
                        </div>
                        <div className="space-y-2">
                            <Label>Deadline</Label>
                            <Input type="date" name="deadline" className="h-10" />
                        </div>
                        <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700">Create & Auto-Invoice</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
