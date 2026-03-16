"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { createProject } from "@/app/actions/projects";

export function CreateProjectDialog() {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const formData = new FormData(e.currentTarget);
            await createProject(formData);
            setOpen(false);
        } catch (err: any) {
            setError(err.message || "Failed to create project");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center gap-2 shadow-sm font-medium">
                    <Plus className="w-4 h-4" />
                    Create Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <FolderKanban className="w-5 h-5 text-primary" />
                        Create New Project
                    </DialogTitle>
                    <DialogDescription>
                        Fill in the project details and upload any necessary reference documents.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-6 pt-4" encType="multipart/form-data">
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Column 1: Details */}
                        <div className="space-y-6">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Project Details</h4>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">Project Name <span className="text-destructive">*</span></Label>
                                    <Input id="name" name="name" placeholder="Villa Fitout" required className="h-10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="projectNumber" className="text-sm font-medium">Project Number</Label>
                                    <Input id="projectNumber" name="projectNumber" placeholder="PRJ-1001" className="h-10" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="client" className="text-sm font-medium">Client Name</Label>
                                    <Input id="client" name="client" placeholder="e.g. Al Jazeera" className="h-10" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="amount" className="text-sm font-medium">Amount (QR)</Label>
                                    <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" className="h-10" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="startingDate" className="text-sm font-medium">Starting Date</Label>
                                    <Input id="startingDate" name="startingDate" type="date" className="h-10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deadline" className="text-sm font-medium">Deadline</Label>
                                    <Input id="deadline" name="deadline" type="date" className="h-10" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-sm font-medium">Location Name</Label>
                                    <Input id="location" name="location" placeholder="e.g. West Bay, Doha" className="h-10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="locationLink" className="text-sm font-medium">Location Link</Label>
                                    <Input id="locationLink" name="locationLink" placeholder="Google Maps URL" type="url" className="h-10" />
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Documents */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Reference Documents</h4>

                                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="blankBoq" className="text-sm font-medium">Blank BOQ</Label>
                                        <Input id="blankBoq" name="blankBoq" type="file" className="h-10 cursor-pointer file:h-full file:mr-4 file:px-4 file:bg-primary/5 file:text-primary file:border-0 file:rounded-md file:text-xs file:font-semibold hover:file:bg-primary/10 transition-all border-muted-foreground/20 hover:border-primary/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="idDrawing" className="text-sm font-medium">ID Drawing</Label>
                                        <Input id="idDrawing" name="idDrawing" type="file" className="h-10 cursor-pointer file:h-full file:mr-4 file:px-4 file:bg-primary/5 file:text-primary file:border-0 file:rounded-md file:text-xs file:font-semibold hover:file:bg-primary/10 transition-all border-muted-foreground/20 hover:border-primary/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="threeDDrawing" className="text-sm font-medium">3D Drawing</Label>
                                        <Input id="threeDDrawing" name="threeDDrawing" type="file" className="h-10 cursor-pointer file:h-full file:mr-4 file:px-4 file:bg-primary/5 file:text-primary file:border-0 file:rounded-md file:text-xs file:font-semibold hover:file:bg-primary/10 transition-all border-muted-foreground/20 hover:border-primary/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="materialsDetails" className="text-sm font-medium">Material & Labour Details</Label>
                                        <Input id="materialsDetails" name="materialsDetails" type="file" className="h-10 cursor-pointer file:h-full file:mr-4 file:px-4 file:bg-primary/5 file:text-primary file:border-0 file:rounded-md file:text-xs file:font-semibold hover:file:bg-primary/10 transition-all border-muted-foreground/20 hover:border-primary/50" />
                                    </div>
                                    
                                    <div className="space-y-2 opacity-60">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="productionOrders" className="text-sm font-medium">Production Orders</Label>
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded-sm">Auto-fetched</span>
                                        </div>
                                        <Input id="productionOrders" name="productionOrders" type="file" disabled className="h-10 bg-muted/50 cursor-not-allowed border-dashed" />
                                        <p className="text-[10px] text-muted-foreground italic mt-1">Uploaded via Production Orders module.</p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="otherAttachment" className="text-sm font-medium">Other Attachment</Label>
                                        <Input id="otherAttachment" name="otherAttachment" type="file" className="h-10 cursor-pointer file:h-full file:mr-4 file:px-4 file:bg-primary/5 file:text-primary file:border-0 file:rounded-md file:text-xs file:font-semibold hover:file:bg-primary/10 transition-all border-muted-foreground/20 hover:border-primary/50" />
                                    </div>
                                </div>
                            </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-sm font-medium">
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Project"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
