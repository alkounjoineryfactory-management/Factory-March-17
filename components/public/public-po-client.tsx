"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignaturePad } from "./signature-pad";
import { saveProductionOrderSignature } from "@/app/actions/signatures";
import { Badge } from "@/components/ui/badge";
import { FileText, Factory, User, FileImage, Briefcase, Info, PenTool } from "lucide-react";

// Types derived from Prisma
type ProductionOrder = any;

const SIGNATURE_ROLES = [
    { key: "production", label: "Production Department", field: "productionSignature" },
    { key: "qa", label: "QA / QC Department", field: "qaSignature" },
    { key: "factoryManager", label: "Factory Manager", field: "factoryManagerSignature" },
    { key: "projectsManager", label: "Projects Manager ( AMI )", field: "projectsManagerSignature" }
] as const;

export function PublicPOClient({ initialOrder }: { initialOrder: ProductionOrder }) {
    const [order, setOrder] = useState<ProductionOrder>(initialOrder);

    // Modal State
    const [selectedRole, setSelectedRole] = useState<{ key: string, label: string } | null>(null);

    const handleSaveSignature = async (base64Signature: string) => {
        if (!selectedRole || !order.id) return;

        try {
            await saveProductionOrderSignature(order.id, selectedRole.key, base64Signature);

            // Optimistically update the local cache
            const roleConf = SIGNATURE_ROLES.find(r => r.key === selectedRole.key);
            if (roleConf) {
                setOrder((prev: ProductionOrder) => ({
                    ...prev,
                    [roleConf.field]: base64Signature
                }));
            }
            setSelectedRole(null);
        } catch (error) {
            console.error("Failed to save", error);
            alert("Error saving signature. Please try again.");
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 mb-10 ring-1 ring-zinc-900/5 dark:ring-white/10">
            {/* Header / Letterhead */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-8 sm:px-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Factory className="w-8 h-8 text-indigo-400" />
                            <h1 className="text-3xl font-black tracking-tight">PRODUCTION ORDER</h1>
                        </div>
                        <p className="text-zinc-400 font-medium tracking-wide">Digital Authorization Required</p>
                    </div>
                    <div className="text-left sm:text-right bg-black/20 p-4 sm:p-5 rounded-xl backdrop-blur-sm border border-white/10 w-full sm:w-auto mt-4 sm:mt-0">
                        <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">PO Number</p>
                        <p className="text-2xl font-black font-mono tracking-wider text-indigo-400">{order.productionOrderNumber}</p>
                        <p className="text-sm text-zinc-300 mt-2">{format(new Date(order.date), "MMMM dd, yyyy")}</p>
                    </div>
                </div>
            </div>

            {/* Project Details */}
            <div className="p-8 sm:px-12 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Project Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-zinc-500 mb-1">Project Name</p>
                                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{order.project.name}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                                <div>
                                    <p className="text-sm text-zinc-500 mb-1">Project Number</p>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{order.project.projectNumber || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-500 mb-1">Client</p>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{order.project.client || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Associated Documents
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {order.autocadDrawingUrl && (
                                <a href={order.autocadDrawingUrl} target="_blank" rel="noreferrer">
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 py-1.5 px-3">
                                        <FileImage className="w-3 h-3 mr-1.5" /> AutoCAD Dwg
                                    </Badge>
                                </a>
                            )}
                            {order.pdfDrawingUrl && (
                                <a href={order.pdfDrawingUrl} target="_blank" rel="noreferrer">
                                    <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 py-1.5 px-3">
                                        <FileText className="w-3 h-3 mr-1.5" /> PDF Dwg
                                    </Badge>
                                </a>
                            )}
                            {order.cuttingListUrl && (
                                <a href={order.cuttingListUrl} target="_blank" rel="noreferrer">
                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 py-1.5 px-3">
                                        <FileText className="w-3 h-3 mr-1.5" /> Cutting List
                                    </Badge>
                                </a>
                            )}
                            {order.materialListUrl && (
                                <a href={order.materialListUrl} target="_blank" rel="noreferrer">
                                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 py-1.5 px-3">
                                        <FileText className="w-3 h-3 mr-1.5" /> Material List
                                    </Badge>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="p-8 sm:px-12 bg-white dark:bg-zinc-900">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    Production Items
                </h3>
                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 mt-4 rounded-sm shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#f8f9fa] dark:bg-zinc-800 text-[#495057] dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wide border-r border-zinc-200 dark:border-zinc-700 w-12 text-center">SL</th>
                                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wide border-r border-zinc-200 dark:border-zinc-700 w-24">Item Code</th>
                                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wide border-r border-zinc-200 dark:border-zinc-700 w-24">BOQ Ref</th>
                                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wide border-r border-zinc-200 dark:border-zinc-700 w-full">Description</th>
                                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wide border-r border-zinc-200 dark:border-zinc-700 w-16 text-center">Qty</th>
                                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wide border-r border-zinc-200 dark:border-zinc-700 w-16 text-center">Unit</th>
                                <th className="px-3 py-3 font-bold text-[10px] sm:text-xs uppercase tracking-wide text-center leading-tight border-r border-zinc-200 dark:border-zinc-700 w-14">Carp<br />Lab(hr)</th>
                                <th className="px-3 py-3 font-bold text-[10px] sm:text-xs uppercase tracking-wide text-center leading-tight border-r border-zinc-200 dark:border-zinc-700 w-16">Carp<br />Mat(QR)</th>
                                <th className="px-3 py-3 font-bold text-[10px] sm:text-xs uppercase tracking-wide text-center leading-tight border-r border-zinc-200 dark:border-zinc-700 w-14">Pol<br />Lab(hr)</th>
                                <th className="px-3 py-3 font-bold text-[10px] sm:text-xs uppercase tracking-wide text-center leading-tight border-r border-zinc-200 dark:border-zinc-700 w-16">Pol<br />Mat(QR)</th>
                                <th className="px-3 py-3 font-bold text-[10px] sm:text-xs uppercase tracking-wide text-center leading-tight w-16">Inst(hr)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {order.items?.map((item: any, idx: number) => (
                                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-4 py-3 text-zinc-500 text-center border-r border-zinc-200 dark:border-zinc-700">{item.slNo || (idx + 1)}</td>
                                    <td className="px-4 py-3 font-mono text-zinc-800 dark:text-zinc-200 text-xs border-r border-zinc-200 dark:border-zinc-700">{item.itemCode || "-"}</td>
                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-xs border-r border-zinc-200 dark:border-zinc-700">{item.boqRef || "-"}</td>
                                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-normal min-w-[300px] border-r border-zinc-200 dark:border-zinc-700">{item.itemDescription}</td>
                                    <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100 text-center border-r border-zinc-200 dark:border-zinc-700">{item.qty}</td>
                                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-center border-r border-zinc-200 dark:border-zinc-700">{item.unit}</td>

                                    <td className="px-3 py-3 text-center text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700">{Number(item.carpentryLabourHrs || 0)}</td>
                                    <td className="px-3 py-3 text-center text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700">{Number(item.carpentryMaterialAmount || 0).toFixed(2)}</td>
                                    <td className="px-3 py-3 text-center text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700">{Number(item.polishLabourHrs || 0)}</td>
                                    <td className="px-3 py-3 text-center text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700">{Number(item.polishMaterialAmount || 0).toFixed(2)}</td>
                                    <td className="px-3 py-3 text-center text-zinc-500 dark:text-zinc-400">{Number(item.installationTransportAmount || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                            {(!order.items || order.items.length === 0) && (
                                <tr>
                                    <td colSpan={11} className="px-6 py-8 text-center text-zinc-500 italic">No items listed.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Digital Signatures Section */}
            <div className="p-8 sm:px-12 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-8">
                    <PenTool className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white">Required Authorizations</h3>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {SIGNATURE_ROLES.map((role) => {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        const signatureData = order[role.field];
                        return (
                            <div key={role.key} className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <div className="bg-zinc-100 dark:bg-zinc-800/50 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                                    <p className="font-bold text-sm text-center text-zinc-700 dark:text-zinc-300">{role.label}</p>
                                </div>
                                <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[140px] relative group">
                                    {signatureData ? (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={signatureData} alt={`${role.label} Signature`} className="max-w-full max-h-[100px] object-contain drop-shadow-sm" />
                                            {/* Allow resigning subtly on hover */}
                                            <button
                                                onClick={() => setSelectedRole(role)}
                                                className="absolute inset-0 bg-white/80 dark:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-sm font-bold text-zinc-900 dark:text-white backdrop-blur-sm"
                                            >
                                                <PenTool className="w-4 h-4" /> Re-sign
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedRole(role)}
                                            className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all border-2 border-dashed border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900">
                                                <PenTool className="w-5 h-5 text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                                            </div>
                                            <span className="font-medium text-sm">Click to Sign</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 flex items-start gap-3 text-sm text-zinc-500 bg-zinc-100/50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <Info className="w-5 h-5 flex-shrink-0 text-indigo-400" />
                    <p>
                        By affixing your digital signature above, you are authorizing the production department to proceed with the manufacturing of the items listed in this document according to the provided specifications and associated drawings. These signatures are securely stored via AES encryption alongside the metadata of this order.
                    </p>
                </div>
            </div>

            {/* Signature Pad Dialog */}
            <Dialog open={!!selectedRole} onOpenChange={(open) => !open && setSelectedRole(null)}>
                <DialogContent className="sm:max-w-md border-0 shadow-2xl p-6 rounded-2xl">
                    {selectedRole && (
                        <SignaturePad
                            title={`Authorize as ${selectedRole.label}`}
                            onSave={handleSaveSignature}
                            onCancel={() => setSelectedRole(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
