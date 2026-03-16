"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { loginEmployee } from "../actions";
import { getSystemSettings } from "@/app/actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Factory } from "lucide-react";

export default function KioskLoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        getSystemSettings().then(setSettings);
    }, []);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError("");
        const result = await loginEmployee(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-3xl"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-3xl"></div>
            </div>

            <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative z-10 backdrop-blur-sm">
                <CardHeader className="text-center pb-6">
                    <div className="mx-auto w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20 overflow-hidden">
                        {settings?.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <Factory className="w-10 h-10 text-indigo-400" />
                        )}
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-white">
                        {settings?.factoryName || "Factory Kiosk"}
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-base">Sign in to start your shift</CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-slate-300 font-medium ml-1">Username / ID</Label>
                            <Input
                                id="username"
                                name="username"
                                placeholder="Enter your ID"
                                required
                                className="h-14 bg-slate-950 border-slate-800 text-lg text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300 font-medium ml-1">PIN Code</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••"
                                required
                                className="h-14 bg-slate-950 border-slate-800 text-lg text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 tracking-widest"
                            />
                        </div>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 text-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                        >
                            {loading ? "Verifying..." : "Login"} <KeyRound className="ml-2 w-5 h-5" />
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <p className="mt-8 text-slate-600 text-sm font-medium">Factory Manager v1.0 · Bluejay OS © 2026</p>
        </div>
    );
}
