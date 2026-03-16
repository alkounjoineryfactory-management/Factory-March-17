"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Loader2, GripHorizontal, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
    getFactorySections, createFactorySection, updateFactorySection, deleteFactorySection,
    createFactorySubSection, updateFactorySubSection, deleteFactorySubSection 
} from "@/app/actions/factory-settings";
import { getAdminUsers } from "@/app/actions";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

export default function SectionsTab() {
    const [sections, setSections] = useState<any[]>([]);
    const [adminUsers, setAdminUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    const [selectedIncharge, setSelectedIncharge] = useState<string[]>([]);
    const [selectedForeman, setSelectedForeman] = useState<string[]>([]);

    // Sub-Sections States
    const [managingSectionId, setManagingSectionId] = useState<string | null>(null);
    const [subSectionName, setSubSectionName] = useState("");
    const [editingSubSectionId, setEditingSubSectionId] = useState<string | null>(null);

    const activeSectionForSub = useMemo(() => {
        return sections.find(s => s.id === managingSectionId);
    }, [sections, managingSectionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [sList, uList] = await Promise.all([
                getFactorySections(),
                getAdminUsers()
            ]);
            setSections(sList);
            setAdminUsers(uList);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const staffOptions = useMemo(() => {
        return adminUsers
            .filter(u => u.role !== "SUPER_ADMIN" && u.role !== "ADMIN")
            .map(u => ({ label: u.name || u.username, value: u.id }));
    }, [adminUsers]);

    const handleOpenCreate = () => {
        setEditingSection(null);
        setSelectedIncharge([]);
        setSelectedForeman([]);
        setModalOpen(true);
    };

    const handleOpenEdit = (section: any) => {
        setEditingSection(section);
        setSelectedIncharge(section.incharges ? section.incharges.map((u: any) => u.id) : []);
        setSelectedForeman(section.foremen ? section.foremen.map((u: any) => u.id) : []);
        setModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete section "${name}"?`)) {
            try {
                await deleteFactorySection(id);
                loadData();
            } catch (error) {
                alert("Failed to delete section. It might be in use.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);

        try {
            if (editingSection) {
                await updateFactorySection(editingSection.id, formData);
            } else {
                await createFactorySection(formData);
            }
            setModalOpen(false);
            loadData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubSectionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!managingSectionId) return;
        setSubmitting(true);
        
        const fd = new FormData(e.currentTarget);
        fd.append("sectionId", managingSectionId);

        try {
            if (editingSubSectionId) {
                await updateFactorySubSection(editingSubSectionId, fd);
            } else {
                await createFactorySubSection(fd);
            }
            setSubSectionName("");
            setEditingSubSectionId(null);
            loadData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSubSection = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete sub-section "${name}"?`)) {
            try {
                await deleteFactorySubSection(id);
                loadData();
            } catch (error) {
                alert("Failed to delete sub-section.");
            }
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 dark:border-white/5 p-6 md:p-8 text-card-foreground relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10 group-hover:bg-primary/10 transition-colors duration-700"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                            <GripHorizontal className="w-5 h-5" />
                        </div>
                        Factory Sections
                    </h2>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2 opacity-80">
                        Manage factory departments and operational areas.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="h-11 rounded-xl px-6 font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                    <Plus className="w-4 h-4 mr-2" /> Add Section
                </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/5 dark:border-white/5 shadow-inner bg-background/30 backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black tracking-widest text-muted-foreground uppercase bg-muted/30 border-b border-black/5 dark:border-white/5">
                             <tr>
                                <th className="px-6 py-5">Section Name</th>
                                <th className="px-6 py-5">Sub-Sections</th>
                                <th className="px-6 py-5">Incharges</th>
                                <th className="px-6 py-5">Foremen</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sections.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No sections found.</td></tr>
                            ) : (
                                sections.map((section) => (
                                    <tr key={section.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-5 font-bold text-foreground">{section.name}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {section.subSections && section.subSections.length > 0 ? (
                                                    section.subSections.map((sub: any) => (
                                                        <span key={sub.id} className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border border-border/50">
                                                            {sub.name}
                                                        </span>
                                                    ))
                                                ) : <span className="text-muted-foreground opacity-50 text-[10px] italic">None setup</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-2">
                                                {section.incharges && section.incharges.length > 0 ? (
                                                    section.incharges.map((user: any) => (
                                                        <span key={user.id} className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-primary/20 shadow-sm">
                                                            {user.name || user.username}
                                                        </span>
                                                    ))
                                                ) : <span className="text-muted-foreground opacity-50">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-2">
                                                {section.foremen && section.foremen.length > 0 ? (
                                                    section.foremen.map((user: any) => (
                                                        <span key={user.id} className="bg-foreground/10 text-foreground px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-black/10 dark:border-white/10 shadow-sm">
                                                            {user.name || user.username}
                                                        </span>
                                                    ))
                                                ) : <span className="text-muted-foreground opacity-50">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setManagingSectionId(section.id); setSubSectionName(""); setEditingSubSectionId(null); }} className="h-9 w-9 rounded-xl text-primary hover:text-primary hover:bg-primary/10" title="Manage Sub-Sections">
                                                    <FolderTree className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(section)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(section.id, section.name)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-md bg-card/70 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-[0_15px_50px_rgb(0,0,0,0.12)] rounded-3xl p-6">
                        <DialogHeader className="pb-4">
                            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                                    {editingSection ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </div>
                                {editingSection ? "Edit Section" : "Add New Section"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Section Name <span className="text-red-500">*</span></Label>
                                <Input id="name" name="name" defaultValue={editingSection?.name} required placeholder="e.g. Cutting" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 relative z-[60]">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Section Incharges</Label>
                                    <div className="bg-background/50 border border-black/10 dark:border-white/10 shadow-inner rounded-xl">
                                        <MultiSelect
                                            options={staffOptions}
                                            selected={selectedIncharge}
                                            onChange={setSelectedIncharge}
                                            placeholder="Select Incharges..."
                                        />
                                    </div>
                                    <input type="hidden" name="inchargeIds" value={JSON.stringify(selectedIncharge)} />
                                </div>
                                <div className="space-y-2 relative z-[50]">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Section Foremen</Label>
                                    <div className="bg-background/50 border border-black/10 dark:border-white/10 shadow-inner rounded-xl">
                                        <MultiSelect
                                            options={staffOptions}
                                            selected={selectedForeman}
                                            onChange={setSelectedForeman}
                                            placeholder="Select Foremen..."
                                        />
                                    </div>
                                    <input type="hidden" name="foremanIds" value={JSON.stringify(selectedForeman)} />
                                </div>
                            </div>
                            <DialogFooter className="pt-6 border-t border-black/5 dark:border-white/5 gap-3">
                                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="h-11 rounded-xl px-6 font-bold uppercase tracking-wider text-[10px] hover:bg-black/5 dark:hover:bg-white/5">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="h-11 rounded-xl px-8 font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    {editingSection ? "Save Changes" : "Create Section"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Sub-Sections Dialog */}
                <Dialog open={!!managingSectionId} onOpenChange={(open) => !open && setManagingSectionId(null)}>
                    <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border shadow-xl rounded-2xl p-6">
                        <DialogHeader className="pb-4">
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <FolderTree className="w-5 h-5 text-primary" /> 
                                Sub-Sections for {activeSectionForSub?.name}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {activeSectionForSub?.subSections?.length === 0 ? (
                                    <div className="text-sm text-center py-6 text-muted-foreground italic bg-muted/20 border border-dashed rounded-xl">No sub-sections added yet.</div>
                                ) : (
                                    activeSectionForSub?.subSections?.map((sub: any) => (
                                        <div key={sub.id} className="flex items-center justify-between p-3 border rounded-xl bg-background/50 group hover:border-primary/30 transition-colors">
                                            <span className="font-semibold text-sm">{sub.name}</span>
                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingSubSectionId(sub.id); setSubSectionName(sub.name); }} className="h-7 w-7 text-muted-foreground hover:text-primary">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteSubSection(sub.id, sub.name)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleSubSectionSubmit} className="pt-4 border-t flex items-end gap-3">
                                <div className="flex-1 space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">{editingSubSectionId ? "Edit Sub-Section" : "Add New Sub-Section"}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            name="name"
                                            value={subSectionName}
                                            onChange={(e) => setSubSectionName(e.target.value)}
                                            placeholder="e.g. Paint Line 1" 
                                            required 
                                            className="h-9 font-medium" 
                                        />
                                        <Button type="submit" disabled={submitting} className="h-9 px-4 font-bold tracking-wide uppercase text-[10px]">
                                            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingSubSectionId ? "Save" : "Add"}
                                        </Button>
                                    </div>
                                </div>
                                {editingSubSectionId && (
                                    <Button type="button" variant="ghost" onClick={() => { setEditingSubSectionId(null); setSubSectionName(''); }} className="h-9 px-3 text-xs mb-[1px]">Cancel</Button>
                                )}
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
