import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/app/actions";
import Link from "next/link";
import { Factory, ShieldCheck, Cpu, ChevronRight, Dot } from "lucide-react";

export default async function Home() {
  const cookieStore = await cookies();
  const adminId = cookieStore.get("adminId")?.value;
  const employeeId = cookieStore.get("employeeId")?.value;

  if (adminId) redirect("/admin");
  if (employeeId) redirect("/kiosk");

  const settings = await getSystemSettings();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#060610]">
      {/* ── Animated Background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#060610] to-[#04040e]" />
        {/* Orb top-left: indigo */}
        <div className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full bg-indigo-600/15 blur-[140px] animate-pulse" style={{ animationDuration: "7s" }} />
        {/* Orb bottom-right: violet */}
        <div className="absolute -bottom-60 -right-60 w-[700px] h-[700px] rounded-full bg-violet-600/12 blur-[140px] animate-pulse" style={{ animationDuration: "9s", animationDelay: "3s" }} />
        {/* Orb centre top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full bg-indigo-400/8 blur-[80px]" />
        {/* Ultra-fine dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(129,140,248,1) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
      </div>

      {/* ── Horizontal scan line (ambient) ── */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/25 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center">

        {/* ── OS badge ── */}
        <div className="mb-10 flex items-center gap-2 py-1.5 px-4 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.9)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Bluejay OS · Factory Management System</span>
        </div>

        {/* ── Branding ── */}
        <div className="mb-16 flex flex-col items-center text-center">
          {/* Logo container with glow */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-3xl bg-indigo-500/30 blur-2xl scale-110" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent border border-indigo-500/30 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-indigo-500/20">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
              ) : (
                <Factory className="w-12 h-12 text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.6)]" />
              )}
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40 leading-none mb-4">
            {settings?.factoryName || "Factory Manager"}
          </h1>
          <p className="text-base text-white/30 font-medium max-w-sm leading-relaxed">
            Premium operations platform. Select your portal to continue.
          </p>
        </div>

        {/* ── Portal Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">

          {/* Admin Portal */}
          <Link href="/admin/login" className="group">
            <div className="relative h-full rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
              {/* Glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10 scale-105" />
              {/* Card */}
              <div className="relative h-full rounded-2xl border border-white/[0.07] group-hover:border-indigo-500/30 bg-white/[0.03] group-hover:bg-indigo-500/[0.06] backdrop-blur-xl transition-all duration-500 shadow-xl shadow-black/40 overflow-hidden p-7 flex flex-col gap-5">
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/0 group-hover:via-indigo-500/60 to-transparent transition-all duration-500" />

                <div className="flex items-start justify-between">
                  {/* Icon */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl bg-indigo-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/10 border border-indigo-500/20 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-black text-indigo-400/60 group-hover:text-indigo-400 transition-colors">
                    <div className="w-1 h-1 rounded-full bg-indigo-400/60 group-hover:bg-indigo-400 group-hover:animate-pulse" />
                    Secure
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-lg font-black text-white tracking-tight mb-1.5">Management Portal</h2>
                  <p className="text-xs text-white/35 leading-relaxed font-medium">
                    Administrators, managers, and supervisors. Full system access.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  <span>Enter Portal</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>

          {/* Kiosk Portal */}
          <Link href="/kiosk/login" className="group">
            <div className="relative h-full rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10 scale-105" />
              <div className="relative h-full rounded-2xl border border-white/[0.07] group-hover:border-emerald-500/30 bg-white/[0.03] group-hover:bg-emerald-500/[0.05] backdrop-blur-xl transition-all duration-500 shadow-xl shadow-black/40 overflow-hidden p-7 flex flex-col gap-5">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 group-hover:via-emerald-500/50 to-transparent transition-all duration-500" />

                <div className="flex items-start justify-between">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 border border-emerald-500/20 flex items-center justify-center">
                      <Cpu className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-black text-emerald-400/60 group-hover:text-emerald-400 transition-colors">
                    <div className="w-1 h-1 rounded-full bg-emerald-400/60 group-hover:bg-emerald-400 group-hover:animate-pulse" />
                    Active
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-lg font-black text-white tracking-tight mb-1.5">Worker Kiosk</h2>
                  <p className="text-xs text-white/35 leading-relaxed font-medium">
                    Factory workers, machine operators, and floor staff.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  <span>Enter Kiosk</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Footer ── */}
        <div className="mt-14 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/15">
          <span>Bluejay OS</span>
          <span className="w-1 h-1 rounded-full bg-white/15" />
          <span>© 2026</span>
          <span className="w-1 h-1 rounded-full bg-white/15" />
          <span>All rights reserved</span>
        </div>
      </div>
    </div>
  );
}
