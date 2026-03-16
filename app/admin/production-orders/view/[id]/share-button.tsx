"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";

export default function ShareSignatureButton({ orderId }: { orderId: string }) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        // Construct the public URL based on the current window location
        const baseUrl = window.location.origin;
        const publicUrl = `${baseUrl}/share/po/${orderId}`;

        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            console.error("Failed to copy link: ", err);
            // Fallback for older browsers
            prompt("Copy this secure link to share for signatures:", publicUrl);
        }
    };

    return (
        <Button
            variant="outline"
            className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 shadow-sm"
            onClick={handleShare}
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Link Copied!</span>
                </>
            ) : (
                <>
                    <Share2 className="w-4 h-4" />
                    Share for Signature
                </>
            )}
        </Button>
    );
}
