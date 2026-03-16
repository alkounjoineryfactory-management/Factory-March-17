"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button"; // Adjust path if needed
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export default function ScheduleDateNavigator() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Get current date from URL or default to Today
  const dateParam = searchParams.get("date");
  const currentDate = dateParam ? new Date(dateParam) : new Date();

  // 2. Function to change date
  const handleDateChange = (newDate: Date) => {
    const formatted = format(newDate, "yyyy-MM-dd");
    router.push(`/admin/schedule?date=${formatted}`);
  };

  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm mb-6 border">
      {/* Previous Day */}
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => handleDateChange(subDays(currentDate, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date Display & Picker */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-gray-500" />
        <span className="font-bold text-lg min-w-[200px] text-center">
          {format(currentDate, "EEEE, MMM d, yyyy")}
        </span>
        {/* Hidden Date Input triggered by click if you want, 
            or just a visible input: */}
        <input 
          type="date" 
          className="border rounded p-1 ml-2"
          value={format(currentDate, "yyyy-MM-dd")}
          onChange={(e) => handleDateChange(new Date(e.target.value))}
        />
      </div>

      {/* Next Day */}
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => handleDateChange(addDays(currentDate, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        onClick={() => handleDateChange(new Date())}
        className="ml-auto text-blue-600"
      >
        Jump to Today
      </Button>
    </div>
  );
}