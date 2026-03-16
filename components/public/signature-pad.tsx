"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Eraser, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
    onSave: (base64Signature: string) => Promise<void>;
    onCancel: () => void;
    title?: string;
}

export function SignaturePad({ onSave, onCancel, title = "Sign Here" }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Context formatting
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set up high-res canvas scaling for crisp lines
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        // Styling
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000";
    }, []);

    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        setIsEmpty(false);
    };

    const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.closePath();
        setIsDrawing(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
    };

    const handleSave = async () => {
        if (isEmpty) return;
        setIsSaving(true);
        try {
            const canvas = canvasRef.current;
            if (!canvas) return;
            // Extract the base64 webp for massive reduction in payload size
            const dataUrl = canvas.toDataURL("image/webp", 0.5);
            await onSave(dataUrl);
        } catch (error) {
            console.error("Failed to save signature from pad", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <h3 className="font-bold text-lg text-foreground mb-1">{title}</h3>

            <div className="relative w-full h-[250px] bg-white border-2 border-dashed border-border rounded-xl overflow-hidden shadow-inner group">
                {/* Visual guideline for the signature base */}
                <div className="absolute bottom-[25%] left-10 right-10 h-[2px] bg-muted-foreground/10 pointer-events-none rounded-full" />

                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none italic text-muted-foreground/50 font-medium">
                        Draw your signature here...
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    className={cn("w-full h-full cursor-crosshair touch-none", !isEmpty && "bg-transparent")}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    onPointerOut={stopDrawing}
                    style={{ touchAction: "none" }}
                />
            </div>

            <div className="flex justify-between items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={clearCanvas}
                    disabled={isEmpty || isSaving}
                    className="flex-1 border-muted text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                    <Eraser className="w-4 h-4 mr-2" /> Clear
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex-1"
                >
                    Cancel
                </Button>

                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isEmpty || isSaving}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                >
                    {isSaving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                        <><Check className="w-4 h-4 mr-2" /> Confirm Signature</>
                    )}
                </Button>
            </div>
        </div>
    );
}
