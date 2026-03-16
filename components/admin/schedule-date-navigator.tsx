"use client";

import { useRouter } from "next/navigation";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Ensure you have shadcn calendar
import { cn } from "@/lib/utils";

export default function ScheduleDateNavigator({ currentDate }: { currentDate: string }) {
  const router = useRouter();

  // Parse the string back to a Date object safely
  const dateObj = parseISO(currentDate);

  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) return;
    // Format to YYYY-MM-DD to avoid timezone issues
    const formatted = format(newDate, "yyyy-MM-dd");
    router.push(`/admin/schedule?date=${formatted}`);
  };

  return (
    <div className="flex items-center gap-2 bg-card text-card-foreground p-2 rounded-md border border-border shadow-sm">
      {/* Previous Day Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleDateChange(subDays(dateObj, 1))}
        title="Previous Day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date Picker (Popover) */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !currentDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateObj ? format(dateObj, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateObj}
            onSelect={handleDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Next Day Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleDateChange(addDays(dateObj, 1))}
        title="Next Day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Jump to Today */}
      <Button
        variant="ghost"
        size="sm"
        className="text-blue-600 ml-2"
        onClick={() => handleDateChange(new Date())}
      >
        Today
      </Button>
    </div>
  );
}