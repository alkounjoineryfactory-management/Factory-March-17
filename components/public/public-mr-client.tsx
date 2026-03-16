"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { saveMaterialRequisitionItemApproval } from "@/app/actions/material-requisitions-public";
import { Badge } from "@/components/ui/badge";
import { FileText, Factory, Briefcase, Info, CheckCircle, XCircle, Send } from "lucide-react";

// Types derived from Prisma
type MaterialRequisition = any;

export function PublicMRClient({ initialMr }: { initialMr: MaterialRequisition }) {
    const [mr, setMr] = useState<MaterialRequisition>(initialMr);

    // Track unsaved local state for item comments before they are submitted
    const [localComments, setLocalComments] = useState<Record<string, string>>({});
    // Track loading states per item
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleApprovalDecision = async (itemId: string, status: "APPROVED" | "REJECTED") => {
        setIsUpdating(itemId);
        try {
            const comment = localComments[itemId] || "";
            await saveMaterialRequisitionItemApproval(itemId, status, comment);

            // Optimistically update the UI to lock it in
            setMr((prev: MaterialRequisition) => {
                const updatedItems = prev.items.map((item: any) => {
                    if (item.id === itemId) {
                        return { ...item, approvalStatus: status, comments: comment };
                    }
                    return item;
                });
                return { ...prev, items: updatedItems };
            });

        } catch (error) {
            console.error("Failed to save approval decision", error);
            alert("Error saving approval. Please try again.");
        } finally {
            setIsUpdating(null);
        }
    };

    const handleCommentChange = (itemId: string, val: string) => {
        setLocalComments(prev => ({
            ...prev,
            [itemId]: val
        }));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200">Pending Review</Badge>;
            case "APPROVED":
                return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
            case "REJECTED":
                return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Changes Requested</Badge>;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 mb-10 ring-1 ring-zinc-900/5 dark:ring-white/10">
            {/* Header / Letterhead */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-8 sm:px-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Factory className="w-8 h-8 text-emerald-400" />
                            <h1 className="text-3xl font-black tracking-tight">MATERIAL REQUISITION</h1>
                        </div>
                        <p className="text-zinc-400 font-medium tracking-wide">Item-Level Review & Approval</p>
                    </div>
                    <div className="text-left sm:text-right bg-black/20 p-4 sm:p-5 rounded-xl backdrop-blur-sm border border-white/10 w-full sm:w-auto mt-4 sm:mt-0">
                        <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">MR Number</p>
                        <p className="text-2xl font-black font-mono tracking-wider text-emerald-400">{mr.mrNumber}</p>
                        <p className="text-sm text-zinc-300 mt-2">{format(new Date(mr.date), "MMMM dd, yyyy")}</p>
                    </div>
                </div>
            </div>

            {/* General Info */}
            <div className="p-8 sm:px-12 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Identification
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-zinc-500 mb-1">Project Name</p>
                                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{mr.project?.name || "General Inventory"}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                                <div>
                                    <p className="text-sm text-zinc-500 mb-1">Project Number</p>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{mr.project?.projectNumber || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-500 mb-1">Requester</p>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{mr.requester?.name || mr.requester?.username || "Unknown"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {mr.notes && (
                        <div>
                            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Purpose / Flow Notes
                            </h3>
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {mr.notes}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Items Verification Table */}
            <div className="p-8 sm:px-12 bg-white dark:bg-zinc-900">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        Materials Review
                    </h3>
                </div>

                <div className="space-y-6">
                    {mr.items?.map((item: any, idx: number) => {
                        const isPending = item.approvalStatus === "PENDING";
                        const isApproved = item.approvalStatus === "APPROVED";
                        const isRejected = item.approvalStatus === "REJECTED";
                        const currentVal = localComments[item.id] !== undefined ? localComments[item.id] : (item.comments || "");

                        return (
                            <div key={item.id} className={`rounded-xl border shadow-sm transition-colors ${isApproved ? 'bg-green-50/30 border-green-200 dark:bg-green-950/20 dark:border-green-900/50' : isRejected ? 'bg-red-50/30 border-red-200 dark:bg-red-950/20 dark:border-red-900/50' : 'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'}`}>
                                <div className="p-5 flex flex-col md:flex-row gap-6">
                                    {/* Item Data */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-xs font-mono bg-zinc-100 text-zinc-500 dark:bg-zinc-800 px-2 py-0.5 rounded">SL: {idx + 1}</span>
                                                    {item.itemCode && (
                                                        <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">[{item.itemCode}]</span>
                                                    )}
                                                </div>
                                                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                                                    {item.itemDescription}
                                                </h4>
                                            </div>
                                            <div className="text-right ml-4">
                                                <div className="text-sm text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Qty Req</div>
                                                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                                    {item.quantity} <span className="text-sm font-medium text-emerald-600/70">{item.unit}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Area */}
                                    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-5 md:pt-0 md:pl-6 flex flex-col gap-4">

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</span>
                                            {getStatusBadge(item.approvalStatus || 'PENDING')}
                                        </div>

                                        {isPending ? (
                                            <>
                                                <textarea
                                                    className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 focus:bg-white dark:bg-zinc-950 dark:focus:bg-zinc-900 focus:ring-2 focus:ring-emerald-500/20 p-3 outline-none transition-all resize-none h-20 placeholder:text-zinc-400"
                                                    placeholder="Add optional notes or specify changes needed..."
                                                    value={currentVal}
                                                    onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                                    disabled={isUpdating === item.id}
                                                />
                                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                                    <button
                                                        onClick={() => handleApprovalDecision(item.id, 'APPROVED')}
                                                        disabled={isUpdating === item.id}
                                                        className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 dark:text-emerald-400 rounded-lg py-2 text-sm font-bold transition-colors disabled:opacity-50"
                                                    >
                                                        {isUpdating === item.id ? '...' : <><CheckCircle className="w-4 h-4" /> Approve</>}
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprovalDecision(item.id, 'REJECTED')}
                                                        disabled={isUpdating === item.id}
                                                        className="flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:bg-red-950 border border-red-200 dark:border-red-900 dark:text-red-400 rounded-lg py-2 text-sm font-bold transition-colors disabled:opacity-50"
                                                    >
                                                        {isUpdating === item.id ? '...' : <><XCircle className="w-4 h-4" /> Fix / Reject</>}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/50 h-full flex flex-col text-sm">
                                                <span className="text-xs font-bold uppercase text-zinc-400 mb-1">Manager Note:</span>
                                                <p className="text-zinc-700 dark:text-zinc-300 flex-1 italic">{item.comments || "No comments provided."}</p>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {(!mr.items || mr.items.length === 0) && (
                        <div className="p-8 text-center text-zinc-500 italic border border-zinc-200 dark:border-zinc-800 rounded-xl">
                            No materials requested.
                        </div>
                    )}
                </div>
            </div>

            <div className="p-8 sm:px-12 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-start gap-3 text-sm text-zinc-500">
                    <Info className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                    <p>
                        Review each material requested line by line. Approving an item signals procurement to proceed with quoting or issuing LPOs. Requesting changes immediately flags the item for the requester to review and amend. These decisions are recorded permanently.
                    </p>
                </div>
            </div>
        </div>
    );
}
