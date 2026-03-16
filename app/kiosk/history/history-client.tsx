"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";

export default function HistoryClient({ selectedDateStr }: { selectedDateStr?: string }) {
    const router = useRouter();
    const [date, setDate] = useState<Date | undefined>(() => {
        if (!selectedDateStr) return undefined;
        const [year, month, day] = selectedDateStr.split("-").map(Number);
        return new Date(year, month - 1, day);
    });

    useEffect(() => {
        if (date) {
            const newDateStr = format(date, "yyyy-MM-dd");
            const currentDateStr = selectedDateStr || "";

            if (newDateStr !== currentDateStr) {
                router.push(`/kiosk/history?date=${newDateStr}`);
            }
        } else if (date === undefined && selectedDateStr) {
             // If they clear the date, go back to all history
             router.push(`/kiosk/history`);
        }
    }, [date, router, selectedDateStr]);

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm gap-4 mb-6">
            <div className="text-sm font-medium text-slate-400">
                {date ? (
                    <span>Showing history for <strong className="text-indigo-400">{format(date, "PPP")}</strong></span>
                ) : (
                    <span>Showing <strong>All History</strong></span>
                )}
            </div>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={`w-full sm:w-[260px] h-11 justify-start text-left font-normal bg-slate-950 border-slate-700 hover:bg-slate-800 hover:text-slate-200 ${!date ? "text-muted-foreground" : "text-slate-200"}`}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-indigo-400" />
                        {date ? format(date, "PPP") : <span>Filter by specific date...</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-950 border-slate-800" align="end">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="bg-slate-950 text-slate-200"
                    />
                    {date && (
                        <div className="p-2 border-t border-slate-800">
                             <Button 
                                variant="ghost" 
                                className="w-full text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/20"
                                onClick={() => setDate(undefined)}
                            >
                                Clear Date Filter
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}
