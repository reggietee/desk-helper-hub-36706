import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";

interface DaySchedule {
  dayIndex: number;
  dayName: string;
  selected: boolean;
  startTime: string;
  endTime: string;
}

interface SchedulePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  weekStart: Date;
  onSaved: () => void;
}

export function SchedulePlanModal({
  isOpen,
  onClose,
  userId,
  weekStart,
  onSaved,
}: SchedulePlanModalProps) {
  const [showName, setShowName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const [days, setDays] = useState<DaySchedule[]>(
    dayNames.map((name, index) => ({
      dayIndex: index,
      dayName: name,
      selected: false,
      startTime: "09:00",
      endTime: "17:00",
    }))
  );

  useEffect(() => {
    if (isOpen) {
      loadExistingSchedule();
    }
  }, [isOpen, userId]);

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
        
        setDays((prevDays) =>
          prevDays.map((day) => {
            const existingSchedule = data.find(
              (s) => s.day_of_week === day.dayIndex
            );
            if (existingSchedule) {
              return {
                ...day,
                selected: true,
                startTime: existingSchedule.start_time,
                endTime: existingSchedule.end_time,
              };
            }
            return day;
          })
        );
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
        day.dayIndex === dayIndex ? { ...day, selected: !day.selected } : day
      )
    );
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayIndex === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const weekStartStr = format(weekStart, "yyyy-MM-dd");

      // Delete all existing schedules for this week
      const { error: deleteError } = await supabase
        .from("weekly_schedules")
        .delete()
        .eq("user_id", userId)
        .eq("week_start_date", weekStartStr);

      if (deleteError) throw deleteError;

      // Insert new schedules for selected days
      const selectedDays = days.filter((day) => day.selected);
      
      if (selectedDays.length > 0) {
        const schedules = selectedDays.map((day) => ({
          user_id: userId,
          week_start_date: weekStartStr,
          day_of_week: day.dayIndex,
          start_time: day.startTime,
          end_time: day.endTime,
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

  const handleRemoveDay = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayIndex === dayIndex ? { ...day, selected: false } : day
      )
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan My Week at Haven</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {days.map((day) => (
                <div
                  key={day.dayIndex}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Checkbox
                    id={`day-${day.dayIndex}`}
                    checked={day.selected}
                    onCheckedChange={() => handleDayToggle(day.dayIndex)}
                  />
                  <Label
                    htmlFor={`day-${day.dayIndex}`}
                    className="flex-1 font-medium cursor-pointer"
                  >
                    {day.dayName}
                  </Label>

                  {day.selected && (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={day.startTime}
                          onChange={(e) =>
                            handleTimeChange(day.dayIndex, "startTime", e.target.value)
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={day.endTime}
                          onChange={(e) =>
                            handleTimeChange(day.dayIndex, "endTime", e.target.value)
                          }
                          className="w-32"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDay(day.dayIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="show-name"
                checked={showName}
                onCheckedChange={(checked) => setShowName(checked === true)}
              />
              <Label htmlFor="show-name" className="cursor-pointer">
                Show my name on this week's calendar
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
