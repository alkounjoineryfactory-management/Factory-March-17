import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Factory Kiosk",
    description: "Worker Task Management",
};

export default function KioskLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 antialiased selection:bg-indigo-500/30 font-sans">
            {children}
        </div>
    );
}
