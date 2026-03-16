"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createMaterialRequisition } from "@/app/actions/procurement";

interface CreateMaterialRequisitionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    users: any[];
    projects: any[];
    storeItems: any[];
}

export function CreateMaterialRequisitionDialog({ open, onOpenChange, users, projects, storeItems }: CreateMaterialRequisitionDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Header Data
    const [mrNumber, setMrNumber] = useState(`MR-${Math.floor(1000 + Math.random() * 9000)}`);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [requesterId, setRequesterId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [notes, setNotes] = useState("");

    // Line Items
    const [items, setItems] = useState([
        { itemCode: "", itemDescription: "", quantity: 1, unit: "pcs" }
    ]);

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleStoreItemChange = (index: number, itemName: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], itemDescription: itemName };

        const selectedItem = storeItems.find((si: any) => si.name === itemName);
        if (selectedItem) {
            newItems[index].itemCode = selectedItem.itemCode || "";
            if (selectedItem.unit) {
                newItems[index].unit = selectedItem.unit;
            }
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { itemCode: "", itemDescription: "", quantity: 1, unit: "pcs" }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!requesterId) {
            toast.error("Please select a requester");
            return;
        }

        // Validate items
        for (let i = 0; i < items.length; i++) {
            if (!items[i].itemDescription) {
                toast.error(`Description missing in item row ${i + 1}`);
                return;
            }
            if (items[i].quantity <= 0) {
                toast.error(`Invalid quantity in item row ${i + 1}`);
                return;
            }
        }

        setIsLoading(true);
        try {
            const formData = {
                mrNumber,
                date: new Date(date),
                requesterId,
                projectId: projectId || undefined,
                notes,
                items: items.map(item => ({
                    ...item,
                    quantity: Number(item.quantity)
                }))
            };

            const result = await createMaterialRequisition(formData);

            if (result.success) {
                toast.success("Material Requisition created successfully!");
                onOpenChange(false);
                // Reset form
                setMrNumber(`MR-${Math.floor(1000 + Math.random() * 9000)}`);
                setRequesterId("");
                setProjectId("");
                setNotes("");
                setItems([{ itemCode: "", itemDescription: "", quantity: 1, unit: "pcs" }]);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to create Requisition");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-card/90 backdrop-blur-2xl border-white/10 dark:border-white/5 shadow-2xl h-[85vh] flex flex-col p-0">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <DialogHeader className="p-6 pb-4 border-b border-white/5">
                        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                            Create Material Requisition
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Summary Block */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-muted/20 border border-white/5">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">MR Number *</Label>
                                        <Input
                                            value={mrNumber}
                                            onChange={(e) => setMrNumber(e.target.value)}
                                            className="font-mono bg-background/50"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date *</Label>
                                        <Input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="bg-background/50"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requester (User) *</Label>
                                    <select
                                        value={requesterId}
                                        onChange={(e) => setRequesterId(e.target.value)}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        required
                                    >
                                        <option value="">-- Select User --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link Project (Optional)</Label>
                                    <select
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">-- General / Maintenance --</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purpose / Notes</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Reason for material request..."
                                        className="bg-background/50 resize-none h-[68px]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Line Items Block */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Required Materials</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Material
                                </Button>
                            </div>

                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr className="text-xs font-bold tracking-wider uppercase">
                                            <th className="px-4 py-3 text-left w-24">Code</th>
                                            <th className="px-4 py-3 text-left">Description *</th>
                                            <th className="px-4 py-3 text-left w-32">Qty *</th>
                                            <th className="px-4 py-3 text-left w-24">Unit</th>
                                            <th className="px-4 py-3 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 bg-background/30">
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="p-2">
                                                    <Input
                                                        value={item.itemCode || ""}
                                                        onChange={(e) => handleItemChange(index, "itemCode", e.target.value)}
                                                        className="h-9 text-xs font-mono"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <select
                                                        value={item.itemDescription}
                                                        onChange={(e) => handleStoreItemChange(index, e.target.value)}
                                                        className="w-full h-9 px-3 rounded-md border border-input bg-background/50 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                        required
                                                    >
                                                        <option value="">-- Select Inventory Item --</option>
                                                        {storeItems && storeItems.map((si: any) => (
                                                            <option key={si.id} value={si.name}>{si.name} ({si.itemCode})</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        min="0.1"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                        className="h-9 text-sm"
                                                        required
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={item.unit}
                                                        onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                                        placeholder="pcs, kg, m..."
                                                        className="h-9 text-sm text-center"
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                        onClick={() => removeItem(index)}
                                                        disabled={items.length <= 1}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t border-white/5 bg-background/50">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300"
                        >
                            {isLoading ? "Submitting..." : "Submit Requisition"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
