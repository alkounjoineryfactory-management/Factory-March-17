"use client";

import { useState, useEffect } from "react";
import { Loader2, Banknote, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSystemSettings, getSystemSettings } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function OTRateTab() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rate, setRate] = useState("0");

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getSystemSettings();
                setRate(settings.otRatePerHour.toString());
            } catch (error) {
                console.error("Failed to load settings:", error);
                toast.error("Failed to load OT rate settings");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Re-fetch existing to prevent nullifying other settings
            const currentSettings = await getSystemSettings();
            const formData = new FormData();
            
            // Re-append existing to satisfy upsert
            formData.append("factoryName", currentSettings.factoryName || "Factory Manager");
            if (currentSettings.logoUrl) formData.append("logoUrl", currentSettings.logoUrl);
            if (currentSettings.resourceLink) formData.append("resourceLink", currentSettings.resourceLink);
            if (currentSettings.themeMode) formData.append("themeMode", currentSettings.themeMode);
            if (currentSettings.primaryColor) formData.append("primaryColor", currentSettings.primaryColor);
            formData.append("kioskJobStartEndEnabled", currentSettings.kioskJobStartEndEnabled.toString());
            
            // Append OT Rate
            formData.append("otRatePerHour", rate);
            
            await updateSystemSettings(formData);
            toast.success("Overtime rate updated successfully");
            router.refresh();
        } catch (error: any) {
            console.error("Failed to update OT rate:", error);
            toast.error(error.message || "Failed to update OT rate");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <Settings2 className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Overtime (OT) Rate</h2>
                    <p className="text-sm text-muted-foreground">
                        Set the global financial multiplier for every hour of Overtime an employee accumulates. This calculates the estimated OT liability in the HR Dashboard.
                    </p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col gap-6">
                
                <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-500" /> Hourly Overtime Payout Rate
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground font-semibold">
                            QR
                        </div>
                        <Input 
                            type="number"
                            min="0"
                            step="0.1"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="pl-10 font-medium font-mono text-lg bg-background/50"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This monetary rate will be applied to every hour exceeding the standard daily quota. Leave at 0 if you do not pay monetary overtime bonuses.
                    </p>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                            </>
                        ) : (
                            "Update Rate"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
