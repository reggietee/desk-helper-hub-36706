import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { X } from "lucide-react";

interface DaySchedule {
  dayIndex: number;
  dayName: string;
  selected: boolean;
  timeWindows: string[];
}

interface SchedulePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  weekStart: Date;
  onSaved: () => void;
}

const TIME_WINDOW_OPTIONS = [
  { value: 'morning', label: 'Morning', emoji: '☀️' },
  { value: 'afternoon', label: 'Afternoon', emoji: '🌤' },
  { value: 'evening', label: 'Evening', emoji: '🌙' },
];

export function SchedulePlanModal({
  isOpen,
  onClose,
  userId,
  weekStart,
  onSaved,
}: SchedulePlanModalProps) {
  const [days, setDays] = useState<DaySchedule[]>([
    { dayIndex: 0, dayName: "Monday", selected: false, timeWindows: [] },
    { dayIndex: 1, dayName: "Tuesday", selected: false, timeWindows: [] },
    { dayIndex: 2, dayName: "Wednesday", selected: false, timeWindows: [] },
    { dayIndex: 3, dayName: "Thursday", selected: false, timeWindows: [] },
    { dayIndex: 4, dayName: "Friday", selected: false, timeWindows: [] },
    { dayIndex: 5, dayName: "Saturday", selected: false, timeWindows: [] },
    { dayIndex: 6, dayName: "Sunday", selected: false, timeWindows: [] },
  ]);
  const [showName, setShowName] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadExistingSchedule();
    }
  }, [isOpen, weekStart]);

  const loadExistingSchedule = async () => {
    try {
      setLoading(true);
      const weekStartStr = format(weekStart, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("weekly_schedules")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start_date", weekStartStr);

      if (error) throw error;

      if (data && data.length > 0) {
        setShowName(data[0].show_name);
        const updatedDays = days.map((day) => {
          const existing = data.find((d) => d.day_of_week === day.dayIndex);
          if (existing) {
            return {
              ...day,
              selected: true,
              timeWindows: existing.time_windows || [],
            };
          }
          return day;
        });
        setDays(updatedDays);
      }
    } catch (error: any) {
      toast({
        title: "Error loading schedule",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayIndex === dayIndex
          ? { ...day, selected: !day.selected, timeWindows: day.selected ? [] : day.timeWindows }
          : day
      )
    );
  };

  const handleTimeWindowToggle = (dayIndex: number, timeWindow: string) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayIndex === dayIndex) {
          const hasWindow = day.timeWindows.includes(timeWindow);
          const newTimeWindows = hasWindow
            ? day.timeWindows.filter((tw) => tw !== timeWindow)
            : [...day.timeWindows, timeWindow];
          return {
            ...day,
            timeWindows: newTimeWindows,
            selected: newTimeWindows.length > 0,
          };
        }
        return day;
      })
    );
  };

  const handleRemoveDay = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayIndex === dayIndex
          ? { ...day, selected: false, timeWindows: [] }
          : day
      )
    );
  };

  const handleSave = async () => {
    // Validation: Check if any selected day has no time windows
    const invalidDays = days.filter((day) => day.selected && day.timeWindows.length === 0);
    if (invalidDays.length > 0) {
      setValidationError("Please select at least one time window for each day you plan to be in.");
      return;
    }

    setValidationError(null);

    try {
      setSaving(true);
      const weekStartStr = format(weekStart, "yyyy-MM-dd");

      // Delete existing schedules for this week
      const { error: deleteError } = await supabase
        .from("weekly_schedules")
        .delete()
        .eq("user_id", userId)
        .eq("week_start_date", weekStartStr);

      if (deleteError) throw deleteError;

      // Insert new schedules
      const selectedDays = days.filter((day) => day.selected && day.timeWindows.length > 0);
      if (selectedDays.length > 0) {
        const schedules = selectedDays.map((day) => ({
          user_id: userId,
          week_start_date: weekStartStr,
          day_of_week: day.dayIndex,
          time_windows: day.timeWindows,
          show_name: showName,
        }));

        const { error: insertError } = await supabase
          .from("weekly_schedules")
          .insert(schedules);

        if (insertError) throw insertError;
      }

      toast({
        title: "Schedule saved",
        description: "Your weekly schedule has been updated.",
      });

      onSaved();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error saving schedule",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan My Week at Haven</DialogTitle>
          <DialogDescription>
            Select the days and time windows when you'll be at Haven this week.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading your schedule...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Legend */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Time Windows:</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-base">☀️</span>
                  <span>Morning = 6am–12pm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🌤</span>
                  <span>Afternoon = 12pm–6pm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🌙</span>
                  <span>Evening = 6pm–9pm</span>
                </div>
              </div>
            </div>

            {/* Days Selection */}
            <div className="space-y-2">
              {days.map((day) => (
                <div
                  key={day.dayIndex}
                  className={`rounded-lg border p-3 transition-colors ${
                    day.selected ? "bg-primary/5 border-primary" : "bg-background"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`day-${day.dayIndex}`}
                      checked={day.selected}
                      onCheckedChange={() => handleDayToggle(day.dayIndex)}
                    />
                    <Label
                      htmlFor={`day-${day.dayIndex}`}
                      className="text-sm font-medium cursor-pointer min-w-[90px]"
                    >
                      {day.dayName}
                    </Label>

                    {/* Time Window Toggles */}
                    <div className="flex-1 flex items-center gap-4">
                      {TIME_WINDOW_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleTimeWindowToggle(day.dayIndex, option.value)}
                          disabled={!day.selected}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                            day.timeWindows.includes(option.value)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          } ${!day.selected ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <span className="text-base leading-none">{option.emoji}</span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>

                    {day.selected && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDay(day.dayIndex)}
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Show Name Option */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Checkbox
                id="show-name"
                checked={showName}
                onCheckedChange={(checked) => setShowName(checked as boolean)}
              />
              <Label htmlFor="show-name" className="text-sm cursor-pointer">
                Show my name on this week's calendar
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-3">
          {validationError && (
            <div className="w-full text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {validationError}
            </div>
          )}
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Schedule"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
