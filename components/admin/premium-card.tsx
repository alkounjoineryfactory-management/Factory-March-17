import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PremiumCardProps {
    title?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
    contentClassName?: string;
    action?: ReactNode;
    icon?: React.ElementType;
}
export function PremiumCard({ title, description, children, footer, className, contentClassName, action, icon: Icon }: PremiumCardProps) {
    return (
        <Card className={cn("rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden bg-card/60 backdrop-blur-xl transition-all duration-300", className)}>
            {(title || description || action || Icon) && (
                <CardHeader className="bg-background/40 backdrop-blur-md border-b border-black/5 dark:border-white/5 pb-4 flex flex-row items-center justify-between gap-4 space-y-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>
                    <div className="flex items-center gap-3 relative z-10 w-full">
                        {Icon && (
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                                <Icon className="w-5 h-5 shrink-0" />
                            </div>
                        )}
                        <div className="space-y-1.5 flex-1 relative z-10">
                            {title && <CardTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{title}</CardTitle>}
                            {description && <CardDescription className="text-sm font-medium">{description}</CardDescription>}
                        </div>
                    </div>
                    {action && <div className="shrink-0 relative z-10">{action}</div>}
                </CardHeader>
            )}
            <CardContent className={cn("pt-6", contentClassName)}>
                {children}
            </CardContent>
            {footer && (
                <CardFooter className="bg-background/40 backdrop-blur-md border-t border-black/5 dark:border-white/5 p-5">
                    {footer}
                </CardFooter>
            )}
        </Card>
    );
}
