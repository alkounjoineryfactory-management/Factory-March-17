"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Trash2, Edit2, Link as LinkIcon, Download, FileText, Eye, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { createProductionOrder, updateProductionOrder, deleteProductionOrder } from "@/app/actions/production-orders";
import { format } from "date-fns";

// Base interface for the structure of one item
interface OrderItem {
    id?: string;
    boqRef?: string | null;
    slNo?: string | null;
    itemCode?: string | null;
    itemDescription: string;
    qty: number;
    unit: string;
    carpentryLabourHrs: number;
    polishLabourHrs: number;
    carpentryMaterialAmount: number;
    polishMaterialAmount: number;
    installationTransportAmount: number;
}

export default function ProductionOrderManager({ project, initialOrders }: { project: any, initialOrders: any[] }) {
    const [orders, setOrders] = useState(initialOrders);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    // Items state for the form
    const [items, setItems] = useState<OrderItem[]>([]);
    const [itemForm, setItemForm] = useState<Partial<OrderItem>>({
        qty: 1, unit: "pcs", carpentryLabourHrs: 0, polishLabourHrs: 0,
        carpentryMaterialAmount: 0, polishMaterialAmount: 0, installationTransportAmount: 0, boqRef: ""
    });

    // Reset things when opening modal
    useEffect(() => {
        if (modalOpen) {
            if (editingOrder && editingOrder.items) {
                setItems(editingOrder.items);
            } else {
                setItems([]);
            }
            setItemForm({
                qty: 1, unit: "pcs", carpentryLabourHrs: 0, polishLabourHrs: 0,
                carpentryMaterialAmount: 0, polishMaterialAmount: 0, installationTransportAmount: 0, boqRef: ""
            });
        }
    }, [modalOpen, editingOrder]);

    const handleOpenCreate = () => {
        setEditingOrder(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (order: any) => {
        setEditingOrder(order);
        setModalOpen(true);
    };

    const handleDelete = async (id: string, poNumber: string) => {
        if (confirm(`Are you sure you want to delete Production Order: ${poNumber}?`)) {
            try {
                const res = await deleteProductionOrder(id, project.id);
                if (res.error) throw new Error(res.error);
                setOrders(orders.filter((o: any) => o.id !== id));
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const handleAddItem = () => {
        if (!itemForm.itemDescription) {
            alert("Item Description is required.");
            return;
        }
        setItems([...items, itemForm as OrderItem]);
        // Reset subform
        setItemForm({
            qty: 1, unit: "pcs", carpentryLabourHrs: 0, polishLabourHrs: 0,
            carpentryMaterialAmount: 0, polishMaterialAmount: 0, installationTransportAmount: 0,
            itemDescription: "", itemCode: "", slNo: "", boqRef: ""
        });
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (items.length === 0) {
            alert("Please add at least one item to the production order.");
            return;
        }

        setSubmitting(true);
        const formData = new FormData(e.currentTarget);

        // Append JSON encoded items
        formData.append("items", JSON.stringify(items));

        try {
            if (editingOrder) {
                const res = await updateProductionOrder(editingOrder.id, formData);
                if (res.error) throw new Error(res.error);
                setOrders(orders.map((o: any) => o.id === editingOrder.id ? res.data : o));
            } else {
                const res = await createProductionOrder(project.id, formData);
                if (res.error) throw new Error(res.error);
                setOrders([res.data, ...orders]);
            }
            setModalOpen(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 relative pb-10">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/4 w-1/2 h-48 bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 backdrop-blur-2xl p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <div className="relative z-10 w-full sm:w-auto">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                            <FileText className="w-6 h-6" />
                        </div>
                        Production Orders
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground mt-1.5 flex items-center gap-2">
                        Detailed BOQ and tracking for <Badge variant="outline" className="font-bold uppercase tracking-wider text-[10px] bg-background/50 text-foreground border-black/5 dark:border-white/5">{project.name}</Badge>
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all transform hover:scale-105 gap-2 h-11 px-6 rounded-2xl font-bold">
                    <Plus className="w-4 h-4" /> New Order
                </Button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-muted/30 backdrop-blur-md text-muted-foreground border-b border-black/5 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-5 font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">Date</th>
                                <th className="px-6 py-5 font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">PO Number</th>
                                <th className="px-6 py-5 font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">Item Description</th>
                                <th className="px-6 py-5 font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">Qty</th>
                                <th className="px-6 py-5 font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">Labour (Hrs)</th>
                                <th className="px-6 py-5 font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">Links</th>
                                <th className="px-6 py-5 text-right font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 dark:divide-white/5">
                            {orders.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-medium">No production orders found for this project.</td></tr>
                            ) : (
                                orders.map((order) => {
                                    // If the order has items, map through them and create a row for each item
                                    if (order.items && order.items.length > 0) {
                                        const rowCount = order.items.length;
                                        const displayItems = [...order.items].reverse();
                                        return displayItems.map((item: any, index: number) => (
                                            <tr key={`${order.id}-${item.id || index}`} className="hover:bg-primary/5 hover:shadow-md transition-all duration-300 transform-gpu hover:scale-[1.002] border-l-4 border-l-transparent hover:border-l-primary group bg-transparent">
                                                {/* Show Order-level details only on the first row of that order and span them */}
                                                {index === 0 && (
                                                    <>
                                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap align-top bg-muted/5 border-r border-white/5 dark:border-white/5 font-medium" rowSpan={rowCount}>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs uppercase tracking-widest">{format(new Date(order.date), "MMM yyyy")}</span>
                                                                <span className="text-base text-foreground font-bold">{format(new Date(order.date), "dd")}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap align-top bg-muted/5 border-r border-white/5 dark:border-white/5" rowSpan={rowCount}>
                                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 shadow-sm font-mono text-xs px-3 py-1.5 uppercase tracking-wider font-bold">
                                                                {order.productionOrderNumber}
                                                            </Badge>
                                                        </td>
                                                    </>
                                                )}

                                                {/* Item-level details */}
                                                <td className="px-6 py-4 text-foreground relative">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-transparent group-hover:from-primary/5 transition-colors pointer-events-none"></div>
                                                    <div className="font-bold text-[15px] relative z-10 leading-snug">{item.itemDescription}</div>
                                                    <div className="text-[10px] text-muted-foreground mt-1.5 font-semibold flex flex-wrap gap-2 uppercase tracking-wider relative z-10">
                                                        {item.itemCode && <span className="bg-background/50 px-2 py-0.5 rounded border border-black/5 dark:border-white/5 shadow-sm flex items-center gap-1">Code: <span className="text-foreground">{item.itemCode}</span></span>}
                                                        {item.slNo && <span className="bg-background/50 px-2 py-0.5 rounded border border-black/5 dark:border-white/5 shadow-sm flex items-center gap-1">Sl No: <span className="text-foreground">{item.slNo}</span></span>}
                                                        {item.boqRef && <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-500/30 flex items-center gap-1">BOQ: {item.boqRef}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-foreground font-bold text-lg">
                                                    {item.qty} <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{item.unit}</span>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground text-xs space-y-2">
                                                    <div className="flex justify-between items-center bg-background/30 px-2 py-1 rounded-md border border-black/5 dark:border-white/5 shadow-inner">
                                                        <span className="font-semibold uppercase tracking-wider text-[9px]">Carpentry</span>
                                                        <span className="font-black text-foreground">{item.carpentryLabourHrs}h</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-background/30 px-2 py-1 rounded-md border border-black/5 dark:border-white/5 shadow-inner">
                                                        <span className="font-semibold uppercase tracking-wider text-[9px]">Polish</span>
                                                        <span className="font-black text-foreground">{item.polishLabourHrs}h</span>
                                                    </div>
                                                </td>

                                                {/* Show attachments and actions only on the first item row of that order and span them */}
                                                {index === 0 && (
                                                    <>
                                                        <td className="px-6 py-4 align-top border-l border-white/5 dark:border-white/5" rowSpan={rowCount}>
                                                            <div className="flex flex-col gap-2">
                                                                {order.autocadDrawingUrl && (
                                                                    <a href={order.autocadDrawingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-2 rounded-xl border border-blue-200/50 dark:border-blue-500/30 transition-colors w-fit shadow-sm">
                                                                        <Download className="w-3.5 h-3.5" /> AutoCAD Dwg
                                                                    </a>
                                                                )}
                                                                {order.pdfDrawingUrl && (
                                                                    <a href={order.pdfDrawingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-2 rounded-xl border border-rose-200/50 dark:border-rose-500/30 transition-colors w-fit shadow-sm">
                                                                        <FileText className="w-3.5 h-3.5" /> PDF Dwg
                                                                    </a>
                                                                )}
                                                                {order.cuttingListUrl && (
                                                                    <a href={order.cuttingListUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-3 py-2 rounded-xl border border-amber-200/50 dark:border-amber-500/30 transition-colors w-fit shadow-sm">
                                                                        <LinkIcon className="w-3.5 h-3.5" /> Cutting List
                                                                    </a>
                                                                )}
                                                                {order.materialListUrl && (
                                                                    <a href={order.materialListUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-2 rounded-xl border border-emerald-200/50 dark:border-emerald-500/30 transition-colors w-fit shadow-sm">
                                                                        <LinkIcon className="w-3.5 h-3.5" /> Material List
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right align-top border-l border-white/5 dark:border-white/5" rowSpan={rowCount}>
                                                            <div className="flex justify-end gap-1 bg-background/50 backdrop-blur-md rounded-xl p-1 border border-black/5 dark:border-white/5 shadow-sm inline-flex">
                                                                <Link href={`/admin/production-orders/view/${order.id}`}>
                                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="View Order">
                                                                        <Eye className="w-4 h-4" />
                                                                    </Button>
                                                                </Link>
                                                                <div className="w-px bg-white/10 dark:bg-white/5 my-1 mx-0.5"></div>
                                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(order)} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors" title="Edit Order">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </Button>
                                                                <div className="w-px bg-white/10 dark:bg-white/5 my-1 mx-0.5"></div>
                                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id, order.productionOrderNumber)} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete Order">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ));
                                    }

                                    // If the order has no items (should not happen ideally, but just in case)
                                    return (
                                        <tr key={order.id} className="hover:bg-primary/5 transition-colors group">
                                            <td className="px-6 py-4 text-muted-foreground whitespace-nowrap align-top">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs uppercase tracking-widest">{format(new Date(order.date), "MMM yyyy")}</span>
                                                    <span className="text-base text-foreground font-bold">{format(new Date(order.date), "dd")}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap align-top">
                                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 shadow-sm font-mono text-xs px-3 py-1.5 uppercase tracking-wider font-bold">
                                                    {order.productionOrderNumber}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground/50 italic font-medium" colSpan={3}>
                                                No items added to this order.
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col gap-2">
                                                    {order.autocadDrawingUrl && (
                                                        <a href={order.autocadDrawingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-2 rounded-xl border border-blue-200/50 dark:border-blue-500/30 transition-colors w-fit shadow-sm">
                                                            <Download className="w-3.5 h-3.5" /> AutoCAD Dwg
                                                        </a>
                                                    )}
                                                    {order.pdfDrawingUrl && (
                                                        <a href={order.pdfDrawingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-2 rounded-xl border border-rose-200/50 dark:border-rose-500/30 transition-colors w-fit shadow-sm">
                                                            <FileText className="w-3.5 h-3.5" /> PDF Dwg
                                                        </a>
                                                    )}
                                                    {order.cuttingListUrl && (
                                                        <a href={order.cuttingListUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-3 py-2 rounded-xl border border-amber-200/50 dark:border-amber-500/30 transition-colors w-fit shadow-sm">
                                                            <LinkIcon className="w-3.5 h-3.5" /> Cutting List
                                                        </a>
                                                    )}
                                                    {order.materialListUrl && (
                                                        <a href={order.materialListUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-2 rounded-xl border border-emerald-200/50 dark:border-emerald-500/30 transition-colors w-fit shadow-sm">
                                                            <LinkIcon className="w-3.5 h-3.5" /> Material List
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                <div className="flex justify-end gap-1 bg-background/50 backdrop-blur-md rounded-xl p-1 border border-black/5 dark:border-white/5 shadow-sm inline-flex">
                                                    <Link href={`/admin/production-orders/view/${order.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="View Order">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    <div className="w-px bg-white/10 dark:bg-white/5 my-1 mx-0.5"></div>
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(order)} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors" title="Edit Order">
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <div className="w-px bg-white/10 dark:bg-white/5 my-1 mx-0.5"></div>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id, order.productionOrderNumber)} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete Order">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="w-[95vw] max-w-[1400px] max-h-[90vh] overflow-y-auto bg-card/70 backdrop-blur-2xl border-white/20 dark:border-white/10 shadow-[0_15px_50px_rgb(0,0,0,0.12)]">
                    <DialogHeader className="border-b border-black/5 dark:border-white/5 pb-4">
                        <DialogTitle className="text-2xl font-black tracking-tight">{editingOrder ? "Edit Production Order" : "Create Production Order"}</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-muted-foreground">
                            Detailed breakdown of item, quantities, costs, and attachments.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-8 pt-6 relative" encType="multipart/form-data">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none rounded-2xl"></div>

                        {/* Section 1: Basic Info */}
                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-primary mb-5 uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-3">Basic Info</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date <span className="text-destructive">*</span></Label>
                                    <Input name="date" type="date" defaultValue={editingOrder?.date ? format(new Date(editingOrder.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')} required className="bg-background/40 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-inner rounded-xl h-11" />
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Number <span className="text-destructive">*</span></Label>
                                    <Input name="productionOrderNumber" defaultValue={editingOrder?.productionOrderNumber} required placeholder="PO-2026-001" className="bg-primary/5 border border-primary/20 shadow-inner rounded-xl font-mono text-primary font-bold h-11 uppercase" />
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">BOQ Ref</Label>
                                    <Input name="boqRef" defaultValue={editingOrder?.boqRef} placeholder="e.g. BOQ-01A" className="bg-background/40 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-inner rounded-xl h-11 uppercase" />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Items */}
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-5 border-b border-black/5 dark:border-white/5 pb-3">
                                <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Line Items</h3>
                            </div>

                            {/* Added Items List */}
                            {items.length > 0 && (
                                <div className="space-y-4 mb-8">
                                    <div className="bg-background/20 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/30 text-muted-foreground text-[10px] uppercase font-bold tracking-[0.2em] border-b border-white/5 dark:border-white/5">
                                                <tr>
                                                    <th className="px-5 py-3">Item</th>
                                                    <th className="px-5 py-3 text-right">Qty</th>
                                                    <th className="px-5 py-3 text-right">Lab/Mat (QR)</th>
                                                    <th className="px-5 py-3 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 dark:divide-white/5">
                                                {items.map((it, idx) => (
                                                    <tr key={idx} className="bg-transparent hover:bg-primary/5 transition-colors">
                                                        <td className="px-5 py-4">
                                                            <div className="font-bold text-foreground text-[15px]">{it.itemDescription}</div>
                                                            <div className="text-[10px] text-muted-foreground mt-1.5 flex flex-wrap gap-2 uppercase font-semibold tracking-wider">
                                                                <span className="bg-background/50 px-2 py-0.5 rounded border border-black/5 dark:border-white/5 shadow-sm">Code: {it.itemCode || 'N/A'}</span>
                                                                <span className="bg-background/50 px-2 py-0.5 rounded border border-black/5 dark:border-white/5 shadow-sm">Sl: {it.slNo || 'N/A'}</span>
                                                                <span className="bg-blue-500/10 text-blue-500 rounded px-2 py-0.5 border border-blue-500/20">BOQ: {it.boqRef || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-right font-bold text-lg text-foreground">{it.qty} <span className="text-xs text-muted-foreground uppercase">{it.unit}</span></td>
                                                        <td className="px-5 py-4 text-right text-muted-foreground text-xs space-y-1">
                                                            <div><span className="font-semibold text-[9px] uppercase tracking-widest">L:</span> <span className="font-bold text-foreground">{Number(it.carpentryLabourHrs) + Number(it.polishLabourHrs)}h</span></div>
                                                            <div><span className="font-semibold text-[9px] uppercase tracking-widest">M:</span> <span className="font-bold text-foreground">QR {(Number(it.carpentryMaterialAmount) + Number(it.polishMaterialAmount)).toFixed(2)}</span></div>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Add New Item Form Block */}
                            <div className="bg-card/40 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-inner rounded-3xl p-6 sm:p-8 space-y-6">
                                <h4 className="text-base font-black text-foreground flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    Add New Line Item
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">BOQ Ref</Label>
                                        <Input
                                            value={itemForm.boqRef || ''}
                                            onChange={e => setItemForm({ ...itemForm, boqRef: e.target.value })}
                                            placeholder="BOQ-01"
                                            className="bg-background/50 border-black/5 dark:border-white/5 rounded-xl uppercase h-10"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sl. No</Label>
                                        <Input
                                            value={itemForm.slNo || ''}
                                            onChange={e => setItemForm({ ...itemForm, slNo: e.target.value })}
                                            placeholder="1"
                                            className="bg-background/50 border-black/5 dark:border-white/5 rounded-xl h-10"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item Code</Label>
                                        <Input
                                            value={itemForm.itemCode || ''}
                                            onChange={e => setItemForm({ ...itemForm, itemCode: e.target.value })}
                                            placeholder="WD-001"
                                            className="bg-background/50 border-black/5 dark:border-white/5 rounded-xl uppercase h-10"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qty <span className="text-destructive">*</span></Label>
                                        <Input
                                            type="number" step="0.01"
                                            value={itemForm.qty || 1}
                                            onChange={e => setItemForm({ ...itemForm, qty: parseFloat(e.target.value) })}
                                            className="bg-background/50 border-black/5 dark:border-white/5 rounded-xl font-mono h-10 text-base font-bold text-primary"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit <span className="text-destructive">*</span></Label>
                                        <Input
                                            value={itemForm.unit || 'pcs'}
                                            onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                                            className="bg-background/50 border-black/5 dark:border-white/5 rounded-xl uppercase text-xs font-semibold h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item Description <span className="text-destructive">*</span></Label>
                                    <Textarea
                                        value={itemForm.itemDescription || ''}
                                        onChange={e => setItemForm({ ...itemForm, itemDescription: e.target.value })}
                                        placeholder="Detailed description of the item to be produced..."
                                        className="min-h-[80px] bg-background/50 border-black/5 dark:border-white/5 rounded-2xl resize-none shadow-inner text-[15px] font-medium leading-relaxed"
                                    />
                                </div>

                                {/* Item Labours & Costs */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                    <div className="space-y-4 bg-background/40 p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-inner relative overflow-hidden group/est">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-transparent group-hover/est:from-indigo-500/5 transition-colors pointer-events-none"></div>
                                        <h5 className="text-[10px] font-black text-indigo-500 uppercase flex justify-between tracking-widest relative z-10">Carpentry Estimation</h5>
                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Labour Hours</Label>
                                                <Input type="number" step="0.5" className="h-10 bg-background/50 border-black/5 dark:border-white/5 rounded-xl font-mono text-foreground font-bold" value={itemForm.carpentryLabourHrs || 0} onChange={e => setItemForm({ ...itemForm, carpentryLabourHrs: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Material Cost</Label>
                                                <Input type="number" step="0.01" className="h-10 bg-background/50 border-black/5 dark:border-white/5 rounded-xl font-mono text-foreground font-bold" value={itemForm.carpentryMaterialAmount || 0} onChange={e => setItemForm({ ...itemForm, carpentryMaterialAmount: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4 bg-background/40 p-5 rounded-2xl border border-black/5 dark:border-white/5 shadow-inner relative overflow-hidden group/est">
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-transparent group-hover/est:from-amber-500/5 transition-colors pointer-events-none"></div>
                                        <h5 className="text-[10px] font-black text-amber-500 uppercase flex justify-between tracking-widest relative z-10">Polish Estimation</h5>
                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Labour Hours</Label>
                                                <Input type="number" step="0.5" className="h-10 bg-background/50 border-black/5 dark:border-white/5 rounded-xl font-mono text-foreground font-bold" value={itemForm.polishLabourHrs || 0} onChange={e => setItemForm({ ...itemForm, polishLabourHrs: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Material Cost</Label>
                                                <Input type="number" step="0.01" className="h-10 bg-background/50 border-black/5 dark:border-white/5 rounded-xl font-mono text-foreground font-bold" value={itemForm.polishMaterialAmount || 0} onChange={e => setItemForm({ ...itemForm, polishMaterialAmount: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pb-2 border-b border-black/5 dark:border-white/5">
                                    <div className="space-y-2 w-full sm:w-1/3">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Installation/Transport (hrs)</Label>
                                        <Input type="number" step="0.01" className="h-10 bg-background/50 border-black/5 dark:border-white/5 rounded-xl font-mono text-foreground font-bold" value={itemForm.installationTransportAmount || 0} onChange={e => setItemForm({ ...itemForm, installationTransportAmount: parseFloat(e.target.value) })} />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-3">
                                    <Button type="button" variant="outline" onClick={handleAddItem} className="bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground font-bold uppercase tracking-wider text-[10px] h-10 px-6 rounded-xl transition-all shadow-sm">
                                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                                        Save Line Item
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Attachments */}
                        <div className="relative z-10 pt-4">
                            <h3 className="text-sm font-bold text-primary mb-5 uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-3">Reference Attachments</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card/30 p-6 rounded-2xl border border-black/5 dark:border-white/5">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">AutoCAD Drawing <span className="font-medium text-muted-foreground/50 lowercase tracking-normal">(dwg, dxf, pdf, zip)</span></Label>
                                    <Input type="file" name="autocadDrawingFile" accept=".dwg,.dxf,.pdf,.zip" className="cursor-pointer file:cursor-pointer file:font-semibold file:text-[10px] file:uppercase file:tracking-wider file:bg-blue-500/10 file:text-blue-500 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 h-11 bg-background/50 border-black/5 dark:border-white/5 pt-2 shadow-inner rounded-xl" />
                                    <input type="hidden" name="existingAutocadDrawingUrl" value={editingOrder?.autocadDrawingUrl || ""} />
                                    {editingOrder?.autocadDrawingUrl && (
                                        <p className="text-[10px] font-bold uppercase tracking-wider mt-2.5 text-muted-foreground">Current: <a href={editingOrder.autocadDrawingUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400 hover:underline">View Uploaded File</a></p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">PDF Drawing <span className="font-medium text-muted-foreground/50 lowercase tracking-normal">(pdf)</span></Label>
                                    <Input type="file" name="pdfDrawingFile" accept=".pdf" className="cursor-pointer file:cursor-pointer file:font-semibold file:text-[10px] file:uppercase file:tracking-wider file:bg-rose-500/10 file:text-rose-500 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 h-11 bg-background/50 border-black/5 dark:border-white/5 pt-2 shadow-inner rounded-xl" />
                                    <input type="hidden" name="existingPdfDrawingUrl" value={editingOrder?.pdfDrawingUrl || ""} />
                                    {editingOrder?.pdfDrawingUrl && (
                                        <p className="text-[10px] font-bold uppercase tracking-wider mt-2.5 text-muted-foreground">Current: <a href={editingOrder.pdfDrawingUrl} target="_blank" rel="noreferrer" className="text-rose-500 hover:text-rose-400 hover:underline">View Uploaded File</a></p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">Cutting List <span className="font-medium text-muted-foreground/50 lowercase tracking-normal">(pdf, excel, images)</span></Label>
                                    <Input type="file" name="cuttingListFile" accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg" className="cursor-pointer file:cursor-pointer file:font-semibold file:text-[10px] file:uppercase file:tracking-wider file:bg-amber-500/10 file:text-amber-500 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 h-11 bg-background/50 border-black/5 dark:border-white/5 pt-2 shadow-inner rounded-xl" />
                                    <input type="hidden" name="existingCuttingListUrl" value={editingOrder?.cuttingListUrl || ""} />
                                    {editingOrder?.cuttingListUrl && (
                                        <p className="text-[10px] font-bold uppercase tracking-wider mt-2.5 text-muted-foreground">Current: <a href={editingOrder.cuttingListUrl} target="_blank" rel="noreferrer" className="text-amber-500 hover:text-amber-400 hover:underline">View Uploaded File</a></p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">Material List <span className="font-medium text-muted-foreground/50 lowercase tracking-normal">(pdf, excel, images)</span></Label>
                                    <Input type="file" name="materialListFile" accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg" className="cursor-pointer file:cursor-pointer file:font-semibold file:text-[10px] file:uppercase file:tracking-wider file:bg-emerald-500/10 file:text-emerald-500 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 h-11 bg-background/50 border-black/5 dark:border-white/5 pt-2 shadow-inner rounded-xl" />
                                    <input type="hidden" name="existingMaterialListUrl" value={editingOrder?.materialListUrl || ""} />
                                    {editingOrder?.materialListUrl && (
                                        <p className="text-[10px] font-bold uppercase tracking-wider mt-2.5 text-muted-foreground">Current: <a href={editingOrder.materialListUrl} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 hover:underline">View Uploaded File</a></p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-8 border-t border-black/5 dark:border-white/5 relative z-10 flex gap-3">
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-11 rounded-xl px-6 font-bold uppercase tracking-wider text-[10px] bg-background/50 border-black/10 dark:border-white/10 hover:bg-background">Cancel</Button>
                            <Button type="submit" disabled={submitting} className="h-11 rounded-xl px-8 font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingOrder ? "Save Changes" : "Create Production Order"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
