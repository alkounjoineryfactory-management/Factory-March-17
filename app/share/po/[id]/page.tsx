import { getPublicProductionOrder } from "@/app/actions/signatures";
import { notFound } from "next/navigation";
import { PublicPOClient } from "@/components/public/public-po-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PublicProductionOrderPage({ params }: PageProps) {
    const { id } = await params;

    if (!id) {
        notFound();
    }

    try {
        const order = await getPublicProductionOrder(id);

        if (!order) {
            notFound();
        }

        // We pass the fetched order data down to a client component 
        // because the signature pad requires React state and interaction.
        return (
            <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950/50 py-4 sm:py-12 px-0 sm:px-6 lg:px-8 selection:bg-indigo-500/30 font-sans">
                <main className="max-w-5xl mx-auto">
                    <PublicPOClient initialOrder={order} />
                </main>
            </div>
        );

    } catch (error) {
        console.error("Error loading public PO:", error);
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Access Denied</h1>
                    <p className="text-gray-500 font-medium">This document link is invalid, expired, or has been removed.</p>
                </div>
            </div>
        );
    }
}
