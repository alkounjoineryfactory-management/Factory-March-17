import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import PrintButton from "./print-button";
import ShareSignatureButton from "./share-button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ProductionOrderViewPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;

    // Fetch order with its items and project
    const rawOrder = await prisma.productionOrder.findUnique({
        where: { id: resolvedParams.id },
        include: {
            project: true,
            items: {
                orderBy: { id: 'desc' } // Changed to desc for opposite order
            }
        }
    });

    const order = rawOrder as any;

    if (!order) {
        redirect("/admin/production-orders");
    }

    // Fetch system settings for header
    const systemSettings = await prisma.systemSettings.findFirst() || {
        factoryName: "Factory Manager",
        logoUrl: null
    };

    return (
        <div className="max-w-5xl mx-auto pb-12 print:pb-0">
            {/* Action Bar (Hidden on Print) */}
            <div className="flex items-center justify-between mb-6 print:hidden">
                <Link href={`/admin/production-orders/${order.projectId}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Production Orders
                </Link>
                <div className="flex items-center gap-3">
                    <ShareSignatureButton orderId={order.id} />
                    <PrintButton />
                </div>
            </div>

            {/* Printable Document Container */}
            <div className="bg-white text-black p-10 print:p-0 min-h-[800px] border border-border shadow-sm print:border-none print:shadow-none font-sans">

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <div className="flex items-center gap-4">
                        {systemSettings.logoUrl && (
                            <Image
                                src={systemSettings.logoUrl}
                                alt="Logo"
                                width={60}
                                height={60}
                                className="object-contain"
                            />
                        )}
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight uppercase">{systemSettings.factoryName}</h1>
                            <p className="text-sm text-gray-500">Official Production Document</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-black uppercase text-gray-800 tracking-wider">Production Order</h2>
                        <div className="mt-2 text-sm font-medium">
                            <span className="text-gray-500">PO Number:</span> <span className="text-black ml-2 font-mono bg-gray-100 px-2 py-1 rounded">{order.productionOrderNumber}</span>
                        </div>
                        <div className="mt-1 text-sm font-medium">
                            <span className="text-gray-500">Date:</span> <span className="text-black ml-2">{format(new Date(order.date), "dd MMM yyyy")}</span>
                        </div>
                    </div>
                </div>

                {/* Project Info */}
                <div className="mb-8 grid grid-cols-2 gap-8 text-sm">
                    <div>
                        <h3 className="font-bold text-gray-500 uppercase mb-2 text-xs tracking-wider">Project Details</h3>
                        <p className="font-semibold text-lg">{order.project.name}</p>
                        <p className="text-gray-600 mt-1">Client: {order.project.client || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="font-bold text-gray-500 uppercase mb-2 text-xs tracking-wider">Timeline</h3>
                        <p className="font-medium text-gray-800">Deadline: {order.project.deadline ? format(new Date(order.project.deadline), "dd MMM yyyy") : 'Not set'}</p>
                        <p className="text-gray-600 mt-1">Status: {order.project.status.replace("_", " ")}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <h3 className="font-bold text-gray-500 uppercase mb-4 text-xs tracking-wider border-b border-gray-200 pb-2">Line Items ({order.items.length})</h3>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-xs">
                            <tr>
                                <th className="px-3 py-2 border border-gray-300 w-12 text-center">Sl</th>
                                <th className="px-3 py-2 border border-gray-300 w-24">Item Code</th>
                                <th className="px-3 py-2 border border-gray-300 w-24">BOQ Ref</th>
                                <th className="px-3 py-2 border border-gray-300">Description</th>
                                <th className="px-3 py-2 border border-gray-300 w-16 text-right">Qty</th>
                                <th className="px-3 py-2 border border-gray-300 w-16 text-right">Unit</th>
                                <th className="px-3 py-2 border border-gray-300 w-12 text-right text-[10px] leading-tight text-center">Carp<br />Lab(hr)</th>
                                <th className="px-3 py-2 border border-gray-300 w-14 text-right text-[10px] leading-tight text-center">Carp<br />Mat(QR)</th>
                                <th className="px-3 py-2 border border-gray-300 w-12 text-right text-[10px] leading-tight text-center">Pol<br />Lab(hr)</th>
                                <th className="px-3 py-2 border border-gray-300 w-14 text-right text-[10px] leading-tight text-center">Pol<br />Mat(QR)</th>
                                <th className="px-3 py-2 border border-gray-300 w-16 text-right text-[10px] leading-tight text-center">Inst(hr)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-3 py-6 text-center text-gray-500 border border-gray-300 italic">No items found in this order.</td>
                                </tr>
                            ) : (
                                order.items.map((item: any, index: number) => (
                                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 print:hover:bg-transparent">
                                        <td className="px-3 py-3 border border-gray-300 text-center text-gray-600">{item.slNo || index + 1}</td>
                                        <td className="px-3 py-3 border border-gray-300 font-mono text-xs">{item.itemCode || '-'}</td>
                                        <td className="px-3 py-3 border border-gray-300 text-xs">{item.boqRef || '-'}</td>
                                        <td className="px-3 py-3 border border-gray-300 text-gray-800 font-medium">{item.itemDescription}</td>
                                        <td className="px-3 py-3 border border-gray-300 text-right font-semibold">{item.qty}</td>
                                        <td className="px-3 py-3 border border-gray-300 text-right text-gray-500">{item.unit}</td>
                                        <td className="px-3 py-3 border border-gray-300 text-right text-gray-600 text-xs">
                                            {Number(item.carpentryLabourHrs || 0)}
                                        </td>
                                        <td className="px-3 py-3 border border-gray-300 text-right text-gray-600 text-xs">
                                            {Number(item.carpentryMaterialAmount || 0).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 border border-gray-300 text-right text-gray-600 text-xs">
                                            {Number(item.polishLabourHrs || 0)}
                                        </td>
                                        <td className="px-3 py-3 border border-gray-300 text-right text-gray-600 text-xs">
                                            {Number(item.polishMaterialAmount || 0).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 border border-gray-300 text-right text-gray-600 text-xs">
                                            {Number(item.installationTransportAmount || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Digital Signatures Grid */}
                <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-300">
                    <h4 className="font-bold text-gray-700 uppercase mb-6 text-sm flex items-center gap-2 text-center w-full justify-center">
                        <span className="bg-gray-100 px-4 py-1 rounded-full text-xs">OFFICIAL DIGITAL AUTHORIZATIONS</span>
                    </h4>

                    <div className="grid grid-cols-4 gap-6 px-4">
                        {/* Box 1: Production */}
                        <div className="flex flex-col items-center">
                            <div className="w-full min-h-[100px] border-b border-gray-400 flex flex-col items-center justify-end pb-2 relative">
                                {order.productionSignature ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={order.productionSignature} className="max-h-[80px] object-contain w-full mb-1" alt="Production Sign" />
                                ) : (
                                    <span className="text-gray-300 italic text-xs mb-4">Awaiting Signature</span>
                                )}
                            </div>
                            <p className="font-bold text-gray-800 text-xs mt-3 uppercase">Production Dept.</p>
                        </div>

                        {/* Box 2: QA/QC */}
                        <div className="flex flex-col items-center">
                            <div className="w-full min-h-[100px] border-b border-gray-400 flex flex-col items-center justify-end pb-2 relative">
                                {order.qaSignature ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={order.qaSignature} className="max-h-[80px] object-contain w-full mb-1" alt="QA Sign" />
                                ) : (
                                    <span className="text-gray-300 italic text-xs mb-4">Awaiting Signature</span>
                                )}
                            </div>
                            <p className="font-bold text-gray-800 text-xs mt-3 uppercase">QA/QC Dept.</p>
                        </div>

                        {/* Box 3: Factory Manager */}
                        <div className="flex flex-col items-center">
                            <div className="w-full min-h-[100px] border-b border-gray-400 flex flex-col items-center justify-end pb-2 relative">
                                {order.factoryManagerSignature ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={order.factoryManagerSignature} className="max-h-[80px] object-contain w-full mb-1" alt="Factory Manager Sign" />
                                ) : (
                                    <span className="text-gray-300 italic text-xs mb-4">Awaiting Signature</span>
                                )}
                            </div>
                            <p className="font-bold text-gray-800 text-xs mt-3 uppercase">Factory Manager</p>
                        </div>

                        {/* Box 4: Projects Manager */}
                        <div className="flex flex-col items-center">
                            <div className="w-full min-h-[100px] border-b border-gray-400 flex flex-col items-center justify-end pb-2 relative">
                                {order.projectsManagerSignature ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={order.projectsManagerSignature} className="max-h-[80px] object-contain w-full mb-1" alt="Projects Manager Sign" />
                                ) : (
                                    <span className="text-gray-300 italic text-xs mb-4">Awaiting Signature</span>
                                )}
                            </div>
                            <p className="font-bold text-gray-800 text-xs mt-3 uppercase">Projects Mgr (AMI)</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
