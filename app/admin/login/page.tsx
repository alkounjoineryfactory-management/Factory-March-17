"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAdmin } from "@/app/actions";
import { useState } from "react";
import { Lock, User, ShieldCheck, Fingerprint } from "lucide-react";

export default function AdminLoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError("");
        const result = await loginAdmin(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#07070f] relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-48 -left-48 w-[550px] h-[550px] rounded-full bg-indigo-600/15 blur-[130px] animate-pulse" style={{ animationDuration: "7s" }} />
                <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full bg-violet-500/12 blur-[110px] animate-pulse" style={{ animationDuration: "9s", animationDelay: "3s" }} />
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.025]"
                    style={{ backgroundImage: "radial-gradient(circle, rgba(129,140,248,1) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-sm px-4">
                {/* Outer glow halo */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-indigo-500/15 to-violet-600/10 blur-2xl -z-10 scale-110" />

                <div className="relative rounded-3xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-2xl shadow-2xl shadow-black/70 overflow-hidden">
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                    <div className="px-8 pt-10 pb-8 space-y-7">

                        {/* Header */}
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-2xl bg-indigo-500/25 blur-xl scale-125" />
                                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/15 border border-indigo-500/25 flex items-center justify-center">
                                    <ShieldCheck className="w-7 h-7 text-indigo-400" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-white">Management Console</h1>
                                <p className="mt-1 text-xs text-white/35 font-medium">Authorised personnel only</p>
                            </div>
                            {/* Encrypted badge */}
                            <div className="flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Encrypted Connection</span>
                            </div>
                        </div>

                        {/* Form */}
                        <form action={handleSubmit} className="space-y-3">
                            {/* Username */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/35">Username</label>
                                <div className={`relative rounded-xl border transition-all duration-200 ${focused === "username" ? "border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_16px_rgba(99,102,241,0.12)]" : "border-white/[0.08] bg-white/[0.025]"}`}>
                                    <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-200 ${focused === "username" ? "text-indigo-400" : "text-white/20"}`} />
                                    <Input
                                        id="username"
                                        name="username"
                                        placeholder="Enter username"
                                        autoComplete="off"
                                        onFocus={() => setFocused("username")}
                                        onBlur={() => setFocused(null)}
                                        className="pl-10 h-11 bg-transparent border-0 text-white placeholder:text-white/20 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/35">Password</label>
                                <div className={`relative rounded-xl border transition-all duration-200 ${focused === "password" ? "border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_16px_rgba(99,102,241,0.12)]" : "border-white/[0.08] bg-white/[0.025]"}`}>
                                    <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-200 ${focused === "password" ? "text-indigo-400" : "text-white/20"}`} />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••••"
                                        onFocus={() => setFocused("password")}
                                        onBlur={() => setFocused(null)}
                                        className="pl-10 h-11 bg-transparent border-0 text-white placeholder:text-white/25 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center animate-in fade-in slide-in-from-top-2 duration-300">
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <div className="relative pt-1">
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 blur-md opacity-35" />
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="relative w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-indigo-500/25 border-0 transition-all duration-300 hover:shadow-indigo-500/40 hover:scale-[1.01] disabled:opacity-60 disabled:scale-100"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2 justify-center">
                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Authenticating…
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2 justify-center">
                                            <Fingerprint className="w-3.5 h-3.5" />
                                            Sign In
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="pb-5 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/12">
                            Bluejay OS © 2026 · All rights reserved
                        </p>
                    </div>

                    {/* Bottom accent line */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/35 to-transparent" />
                </div>
            </div>
        </div>
    );
}
