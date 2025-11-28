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
import { format, addDays } from "date-fns";
import { X } from "lucide-react";

interface DaySchedule {
  dayIndex: number;
  dayName: string;
  date: Date;
  weekStart: Date;
  selected: boolean;
  timeWindows: string[];
}

interface SchedulePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentWeekStart: Date;
  nextWeekStart: Date;
  onSaved: () => void;
}

const TIME_WINDOW_OPTIONS = [
  { value: 'morning', label: 'Morning', emoji: '☀️' },
  { value: 'afternoon', label: 'Afternoon', emoji: '🌤' },
  { value: 'evening', label: 'Evening', emoji: '🌙' },
];

interface CalendarEvent {
  date: string;
  timeWindows: string[];
  action: 'create' | 'update' | 'cancel';
}

export function SchedulePlanModal({
  isOpen,
  onClose,
  userId,
  currentWeekStart,
  nextWeekStart,
  onSaved,
}: SchedulePlanModalProps) {
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [showName, setShowName] = useState(true);
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [existingCalendarEvents, setExistingCalendarEvents] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  // Fetch user email from auth session on mount
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUserEmail();
  }, [userId]);

  // Initialize 14 days (current week + next week)
  useEffect(() => {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const allDays: DaySchedule[] = [];
    
    // Current week
    for (let i = 0; i < 7; i++) {
      allDays.push({
        dayIndex: i,
        dayName: dayNames[i],
        date: addDays(currentWeekStart, i),
        weekStart: currentWeekStart,
        selected: false,
        timeWindows: [],
      });
    }
    
    // Next week
    for (let i = 0; i < 7; i++) {
      allDays.push({
        dayIndex: i,
        dayName: dayNames[i],
        date: addDays(nextWeekStart, i),
        weekStart: nextWeekStart,
        selected: false,
        timeWindows: [],
      });
    }
    
    setDays(allDays);
  }, [currentWeekStart, nextWeekStart]);

  useEffect(() => {
    if (isOpen && days.length > 0) {
      loadExistingSchedule();
      loadExistingCalendarEvents();
    }
  }, [isOpen, days.length]);

  const loadExistingCalendarEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('schedule_date, time_windows')
        .eq('user_id', userId);

      if (error) throw error;

      const eventsMap: Record<string, string[]> = {};
      data?.forEach(event => {
        eventsMap[event.schedule_date] = event.time_windows || [];
      });
      setExistingCalendarEvents(eventsMap);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  };

  const loadExistingSchedule = async () => {
    try {
      setLoading(true);
      const currentWeekStr = format(currentWeekStart, "yyyy-MM-dd");
      const nextWeekStr = format(nextWeekStart, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("weekly_schedules")
        .select("*")
        .eq("user_id", userId)
        .in("week_start_date", [currentWeekStr, nextWeekStr]);

      if (error) throw error;

      if (data && data.length > 0) {
        setShowName(data[0].show_name);
        const updatedDays = days.map((day) => {
          const weekStartStr = format(day.weekStart, "yyyy-MM-dd");
          const existing = data.find((d) => 
            d.day_of_week === day.dayIndex && d.week_start_date === weekStartStr
          );
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

  const handleDayToggle = (index: number) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === index
          ? { ...day, selected: !day.selected, timeWindows: day.selected ? [] : day.timeWindows }
          : day
      )
    );
  };

  const handleTimeWindowToggle = (index: number, timeWindow: string) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i === index) {
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

  const handleRemoveDay = (index: number) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === index
          ? { ...day, selected: false, timeWindows: [] }
          : day
      )
    );
  };

  const sendCalendarInvites = async (calendarEvents: CalendarEvent[]) => {
    if (!userEmail || !userId || calendarEvents.length === 0) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session for calendar invites');
        return;
      }

      const response = await supabase.functions.invoke('send-calendar-invite', {
        body: {
          userEmail,
          userId,
          events: calendarEvents,
        },
      });

      if (response.error) {
        console.error('Calendar invite error:', response.error);
        toast({
          title: "Calendar invites",
          description: "Schedule saved, but there was an issue sending calendar invites.",
          variant: "destructive",
        });
      } else {
        console.log('Calendar invites sent successfully:', response.data);
      }
    } catch (error) {
      console.error('Error sending calendar invites:', error);
    }
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
      const currentWeekStr = format(currentWeekStart, "yyyy-MM-dd");
      const nextWeekStr = format(nextWeekStart, "yyyy-MM-dd");

      // Delete existing schedules for both weeks
      const { error: deleteError } = await supabase
        .from("weekly_schedules")
        .delete()
        .eq("user_id", userId)
        .in("week_start_date", [currentWeekStr, nextWeekStr]);

      if (deleteError) throw deleteError;

      // Insert new schedules
      const selectedDays = days.filter((day) => day.selected && day.timeWindows.length > 0);
      if (selectedDays.length > 0) {
        const schedules = selectedDays.map((day) => ({
          user_id: userId,
          week_start_date: format(day.weekStart, "yyyy-MM-dd"),
          day_of_week: day.dayIndex,
          time_windows: day.timeWindows,
          show_name: showName,
        }));

        const { error: insertError } = await supabase
          .from("weekly_schedules")
          .insert(schedules);

        if (insertError) throw insertError;
      }

      // Handle calendar invites if checkbox is checked
      let calendarInvitesSent = false;
      if (addToCalendar) {
        if (!userEmail) {
          toast({
            title: "Email not found",
            description: "Unable to find your email address. Calendar invites could not be sent.",
            variant: "destructive",
          });
        } else {
          const calendarEvents: CalendarEvent[] = [];
          
          // Build a map of new schedule dates and time windows
          const newScheduleMap: Record<string, string[]> = {};
          selectedDays.forEach(day => {
            const dateStr = format(day.date, 'yyyy-MM-dd');
            newScheduleMap[dateStr] = day.timeWindows;
          });

          // Determine which events to create, update, or cancel
          // Check all days in current and next week
          days.forEach(day => {
            const dateStr = format(day.date, 'yyyy-MM-dd');
            const existingTimeWindows = existingCalendarEvents[dateStr];
            const newTimeWindows = newScheduleMap[dateStr];

            if (newTimeWindows && newTimeWindows.length > 0) {
              if (existingTimeWindows) {
                // Check if time windows changed
                const changed = JSON.stringify(existingTimeWindows.sort()) !== JSON.stringify(newTimeWindows.sort());
                if (changed) {
                  calendarEvents.push({
                    date: dateStr,
                    timeWindows: newTimeWindows,
                    action: 'update',
                  });
                }
              } else {
                // New event
                calendarEvents.push({
                  date: dateStr,
                  timeWindows: newTimeWindows,
                  action: 'create',
                });
              }
            } else if (existingTimeWindows) {
              // Day was removed, send cancellation
              calendarEvents.push({
                date: dateStr,
                timeWindows: existingTimeWindows,
                action: 'cancel',
              });
            }
          });

          if (calendarEvents.length > 0) {
            await sendCalendarInvites(calendarEvents);
            calendarInvitesSent = true;
          }
        }
      }

      toast({
        title: "Schedule saved",
        description: calendarInvitesSent ? "Your weekly schedule has been updated and calendar invites sent." : "Your weekly schedule has been updated.",
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
            Select the days and time windows when you'll be at Haven for the current and next week.
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
            <div className="space-y-4">
              {/* Current Week */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Current Week
                </h3>
                <div className="space-y-2">
                  {days.slice(0, 7).map((day, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-3 transition-colors ${
                        day.selected ? "bg-primary/5 border-primary" : "bg-background"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`day-${index}`}
                          checked={day.selected}
                          onCheckedChange={() => handleDayToggle(index)}
                        />
                        <Label
                          htmlFor={`day-${index}`}
                          className="text-sm font-medium cursor-pointer min-w-[130px]"
                        >
                          {day.dayName}, {format(day.date, "MMM d")}
                        </Label>

                        {/* Time Window Toggles */}
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          {TIME_WINDOW_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleTimeWindowToggle(index, option.value)}
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
                            onClick={() => handleRemoveDay(index)}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Week */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Next Week
                </h3>
                <div className="space-y-2">
                  {days.slice(7, 14).map((day, index) => {
                    const actualIndex = index + 7;
                    return (
                      <div
                        key={actualIndex}
                        className={`rounded-lg border p-3 transition-colors ${
                          day.selected ? "bg-primary/5 border-primary" : "bg-background"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`day-${actualIndex}`}
                            checked={day.selected}
                            onCheckedChange={() => handleDayToggle(actualIndex)}
                          />
                          <Label
                            htmlFor={`day-${actualIndex}`}
                            className="text-sm font-medium cursor-pointer min-w-[130px]"
                          >
                            {day.dayName}, {format(day.date, "MMM d")}
                          </Label>

                          {/* Time Window Toggles */}
                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                            {TIME_WINDOW_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleTimeWindowToggle(actualIndex, option.value)}
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
                              onClick={() => handleRemoveDay(actualIndex)}
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="show-name"
                  checked={showName}
                  onCheckedChange={(checked) => setShowName(checked as boolean)}
                />
                <Label htmlFor="show-name" className="text-sm cursor-pointer">
                  Show my name on this week's calendar
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="add-to-calendar"
                  checked={addToCalendar}
                  onCheckedChange={(checked) => setAddToCalendar(checked as boolean)}
                />
                <Label htmlFor="add-to-calendar" className="text-sm cursor-pointer">
                  Add these days to my calendar
                </Label>
              </div>
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
