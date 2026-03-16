"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSystemSettings, updateSystemSettings } from "@/app/actions";

const DAYS = [
    { key: "workHoursMonday", label: "Monday" },
    { key: "workHoursTuesday", label: "Tuesday" },
    { key: "workHoursWednesday", label: "Wednesday" },
    { key: "workHoursThursday", label: "Thursday" },
    { key: "workHoursFriday", label: "Friday" },
    { key: "workHoursSaturday", label: "Saturday" },
    { key: "workHoursSunday", label: "Sunday" },
];

export default function WorkingHoursTab() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [hours, setHours] = useState<Record<string, string>>({
        workHoursMonday: "8",
        workHoursTuesday: "8",
        workHoursWednesday: "8",
        workHoursThursday: "8",
        workHoursFriday: "8",
        workHoursSaturday: "8",
        workHoursSunday: "0",
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await getSystemSettings();
                if (settings) {
                    setHours({
                        workHoursMonday: settings.workHoursMonday?.toString() ?? "8",
                        workHoursTuesday: settings.workHoursTuesday?.toString() ?? "8",
                        workHoursWednesday: settings.workHoursWednesday?.toString() ?? "8",
                        workHoursThursday: settings.workHoursThursday?.toString() ?? "8",
                        workHoursFriday: settings.workHoursFriday?.toString() ?? "8",
                        workHoursSaturday: settings.workHoursSaturday?.toString() ?? "8",
                        workHoursSunday: settings.workHoursSunday?.toString() ?? "0",
                    });
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleChange = (key: string, value: string) => {
        setHours(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            // Re-fetch existing settings to pass required fields for upsert
            const currentSettings = await getSystemSettings();
            
            const formData = new FormData();
            formData.append("factoryName", currentSettings?.factoryName || "Factory Manager");
            if (currentSettings?.logoUrl) formData.append("logoUrl", currentSettings.logoUrl);
            if (currentSettings?.resourceLink) formData.append("resourceLink", currentSettings.resourceLink);
            if (currentSettings?.themeMode) formData.append("themeMode", currentSettings.themeMode);
            if (currentSettings?.primaryColor) formData.append("primaryColor", currentSettings.primaryColor);
            formData.append("kioskJobStartEndEnabled", currentSettings?.kioskJobStartEndEnabled ? "true" : "false");

            // Append new working hours
            Object.entries(hours).forEach(([key, value]) => {
                formData.append(key, value);
            });

            await updateSystemSettings(formData);
            alert("Working hours saved successfully!");
        } catch (error: any) {
            console.error("Save error:", error);
            alert(error.message || "Failed to save settings");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                        <Clock className="w-5 h-5" />
                    </div>
                    Standard Working Hours
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                    Define the default normal working hours for each day of the week. This will be used to calculate daily capacity, expected attendance, and overtime tracking.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {DAYS.map((day) => (
                        <div key={day.key} className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{day.label}</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min="0"
                                    max="24"
                                    step="0.5"
                                    required
                                    value={hours[day.key]}
                                    onChange={(e) => handleChange(day.key, e.target.value)}
                                    className="pl-4 pr-12 h-12 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium text-lg"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                                    Hrs
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-black/5 dark:border-white/5 flex justify-end">
                    <Button 
                        type="submit" 
                        disabled={submitting} 
                        className="h-12 rounded-xl px-8 font-bold uppercase tracking-wider text-xs bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02] flex items-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Hours
                    </Button>
                </div>
            </form>
        </div>
    );
}
