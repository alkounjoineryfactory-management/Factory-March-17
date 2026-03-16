"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintButton() {
    return (
        <Button onClick={() => window.print()} className="gap-2 shadow-sm">
            <Printer className="w-4 h-4" /> Print / Save as PDF
        </Button>
    );
}
