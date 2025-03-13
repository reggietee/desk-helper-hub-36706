
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TimeSlot } from "@/lib/types";
import { getAvailableTimeSlots } from "@/lib/data";
import { format } from "date-fns";

interface TimePickerProps {
  selectedDate: Date | null;
  spaceId: string;
  selectedTimeSlot: TimeSlot | null;
  onTimeSelect: (timeSlot: TimeSlot) => void;
  className?: string;
}

export function TimePicker({
  selectedDate,
  spaceId,
  selectedTimeSlot,
  onTimeSelect,
  className,
}: TimePickerProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const availableSlots = getAvailableTimeSlots(formattedDate, spaceId);
      setTimeSlots(availableSlots);
    }
  }, [selectedDate, spaceId]);

  if (!selectedDate) {
    return (
      <div className={cn("w-full space-y-4", className)}>
        <h3 className="text-lg font-medium">Select Time</h3>
        <p className="text-sm text-gray-500">Please select a date first</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      <h3 className="text-lg font-medium">Select Time</h3>
      
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {timeSlots.map((slot) => (
          <button
            key={`${slot.start}-${slot.end}`}
            disabled={!slot.available}
            onClick={() => slot.available && onTimeSelect(slot)}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg py-3 px-2 border transition-all duration-200 focus:outline-none",
              !slot.available && "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60",
              slot.available && !selectedTimeSlot && "hover:bg-gray-100 hover:border-gray-300",
              selectedTimeSlot?.start === slot.start
                ? "bg-primary border-primary text-white"
                : slot.available
                ? "bg-white border-gray-200"
                : ""
            )}
          >
            <span className="text-sm font-medium">{slot.start}</span>
            <span className="text-xs mt-1 text-center">
              {!slot.available ? "Unavailable" : "Available"}
            </span>
          </button>
        ))}
      </div>
      
      {timeSlots.length === 0 && (
        <p className="text-sm text-gray-500">
          No time slots available for the selected date
        </p>
      )}
    </div>
  );
}
