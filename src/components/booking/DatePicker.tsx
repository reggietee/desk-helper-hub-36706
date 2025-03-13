
import { useState, useEffect } from "react";
import { format, addDays, isSameDay, startOfToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  className?: string;
}

export function DatePicker({ selectedDate, onDateSelect, className }: DatePickerProps) {
  const today = startOfToday();
  const [currentDate, setCurrentDate] = useState(today);
  const [visibleDates, setVisibleDates] = useState<Date[]>([]);

  // Generate 14 days starting from the current date
  useEffect(() => {
    const dates = Array.from({ length: 14 }, (_, i) => addDays(currentDate, i));
    setVisibleDates(dates);
  }, [currentDate]);

  const handlePrevious = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const handleNext = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select Date</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </Button>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 -mx-1 scrollbar-hide">
        <div className="flex space-x-2">
          {visibleDates.map((date) => {
            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
            const isToday = isSameDay(date, today);

            return (
              <button
                key={date.toString()}
                type="button"
                onClick={() => onDateSelect(date)}
                className={cn(
                  "flex flex-col items-center justify-center w-16 rounded-lg py-3 px-2 transition-all duration-200 focus:outline-none",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-gray-100",
                  isToday && !isSelected && "border border-primary/30"
                )}
              >
                <span className="text-xs font-medium">
                  {format(date, "EEE")}
                </span>
                <span
                  className={cn(
                    "text-2xl mt-1 font-semibold",
                    isSelected ? "text-white" : "text-gray-900"
                  )}
                >
                  {format(date, "d")}
                </span>
                <span
                  className={cn(
                    "text-xs mt-1",
                    isSelected ? "text-white" : "text-gray-500"
                  )}
                >
                  {format(date, "MMM")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
