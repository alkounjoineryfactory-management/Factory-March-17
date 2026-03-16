"use client";

import { useEffect, useState } from "react";

interface FormattedDateProps {
    date: Date | string;
    mode?: "date-only" | "datetime";
}

export default function FormattedDate({ date, mode = "datetime" }: FormattedDateProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !date) return <span className="text-muted-foreground/50">Loading...</span>;

    const d = new Date(date);
    let formatted = "";

    if (mode === "date-only") {
        formatted = d.toLocaleDateString(undefined, {
            timeZone: "UTC",
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    } else {
        formatted = d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return <span>{formatted}</span>;
}
