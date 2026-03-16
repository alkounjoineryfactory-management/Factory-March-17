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
import { createPurchaseOrder } from "@/app/actions/procurement";

interface CreatePurchaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendors: any[];
    projects: any[];
}

export function CreatePurchaseOrderDialog({ open, onOpenChange, vendors, projects }: CreatePurchaseOrderDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Header Data
    const [poNumber, setPoNumber] = useState(`PO-${Math.floor(100000 + Math.random() * 900000)}`);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [vendorId, setVendorId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [notes, setNotes] = useState("");

    // Line Items
    const [items, setItems] = useState([
        { itemCode: "", itemDescription: "", quantity: 1, unit: "pcs", unitPrice: 0 }
    ]);

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { itemCode: "", itemDescription: "", quantity: 1, unit: "pcs", unitPrice: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!vendorId) {
            toast.error("Please select a vendor");
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
            if (items[i].unitPrice < 0) {
                toast.error(`Invalid unit price in item row ${i + 1}`);
                return;
            }
        }

        setIsLoading(true);
        try {
            const formData = {
                poNumber,
                date: new Date(date),
                vendorId,
                projectId: projectId || undefined,
                notes,
                items: items.map(item => ({
                    ...item,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice)
                }))
            };

            const result = await createPurchaseOrder(formData);

            if (result.success) {
                toast.success("Purchase Order created successfully!");
                onOpenChange(false);
                // Reset form
                setPoNumber(`PO-${Math.floor(100000 + Math.random() * 900000)}`);
                setVendorId("");
                setProjectId("");
                setNotes("");
                setItems([{ itemCode: "", itemDescription: "", quantity: 1, unit: "pcs", unitPrice: 0 }]);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to create PO");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl bg-card/90 backdrop-blur-2xl border-white/10 dark:border-white/5 shadow-2xl h-[90vh] flex flex-col p-0">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <DialogHeader className="p-6 pb-4 border-b border-white/5">
                        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                            Create Purchase Order
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Summary Block */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-muted/20 border border-white/5">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">PO Number *</Label>
                                        <Input
                                            value={poNumber}
                                            onChange={(e) => setPoNumber(e.target.value)}
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
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vendor / Supplier *</Label>
                                    <select
                                        value={vendorId}
                                        onChange={(e) => setVendorId(e.target.value)}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        required
                                    >
                                        <option value="">-- Select Vendor --</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
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
                                        <option value="">-- General Inventory / No Link --</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internal Notes</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add notes..."
                                        className="bg-background/50 resize-none h-[68px]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Line Items Block */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Line Items</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Row
                                </Button>
                            </div>

                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr className="text-xs font-bold tracking-wider uppercase">
                                            <th className="px-4 py-3 text-left w-24">Code</th>
                                            <th className="px-4 py-3 text-left">Description *</th>
                                            <th className="px-4 py-3 text-left w-24">Qty *</th>
                                            <th className="px-4 py-3 text-left w-24">Unit</th>
                                            <th className="px-4 py-3 text-left w-32">Unit Price *</th>
                                            <th className="px-4 py-3 text-right w-32">Total</th>
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
                                                        className="h-8 text-xs font-mono"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={item.itemDescription}
                                                        onChange={(e) => handleItemChange(index, "itemDescription", e.target.value)}
                                                        placeholder="Material name..."
                                                        className="h-8 text-sm"
                                                        required
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        min="0.1"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                        className="h-8 text-sm"
                                                        required
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={item.unit}
                                                        onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unitPrice}
                                                        onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                                                        className="h-8 text-sm"
                                                        required
                                                    />
                                                </td>
                                                <td className="p-2 text-right font-medium text-foreground">
                                                    {(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}
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

                            <div className="flex justify-end p-4 rounded-xl bg-muted/20 border border-white/5">
                                <div className="text-right">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Grand Total</p>
                                    <p className="text-2xl font-black text-foreground">
                                        QAR {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
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
                            {isLoading ? "Saving..." : "Create Purchase Order"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
