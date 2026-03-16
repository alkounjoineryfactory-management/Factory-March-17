"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationBarProps {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    /** Total items count – used to show "X – Y of Z" label */
    totalItems?: number;
    pageSize?: number;
}

export function PaginationBar({
    page,
    totalPages,
    onPrev,
    onNext,
    totalItems,
    pageSize = 10,
}: PaginationBarProps) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems ?? page * pageSize);

    return (
        <div className="flex items-center justify-between px-2 pt-4 pb-1 border-t border-black/5 dark:border-white/5 mt-2">
            <span className="text-xs text-muted-foreground font-medium">
                {totalItems !== undefined
                    ? `Showing ${from}–${to} of ${totalItems}`
                    : `Page ${page} of ${totalPages}`}
            </span>
            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-black/10 dark:border-white/10 disabled:opacity-40"
                    onClick={onPrev}
                    disabled={page <= 1}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold text-muted-foreground px-1 tabular-nums">
                    {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-black/10 dark:border-white/10 disabled:opacity-40"
                    onClick={onNext}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
