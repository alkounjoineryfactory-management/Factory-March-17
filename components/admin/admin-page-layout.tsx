import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageLayoutProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    action?: ReactNode;
}

export function AdminPageLayout({ title, description, children, className, action }: AdminPageLayoutProps) {
    return (
        <div className={cn("p-6 md:p-10 space-y-8 animate-in fade-in max-w-[1400px] mx-auto w-full relative", className)}>
            {/* Ambient background glow for headers */}
            <div className="absolute top-0 left-1/4 w-1/2 h-48 bg-primary/5 rounded-full pointer-events-none -z-10"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-1.5">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60">{title}</h1>
                    {description && <p className="text-muted-foreground font-medium text-sm md:text-base max-w-2xl">{description}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="h-px w-full bg-gradient-to-r from-border/80 via-border/20 to-transparent" />
            <div className="pt-4 relative z-10">
                {children}
            </div>
        </div>
    );
}
