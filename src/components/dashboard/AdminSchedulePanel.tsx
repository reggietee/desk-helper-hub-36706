import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WeeklySchedule {
  id: string;
  user_id: string;
  day_of_week: number;
  time_windows: string[];
  week_start_date: string;
  profiles?: {
    full_name: string;
  };
}

const TIMEZONE = "America/Toronto";
const TIME_WINDOW_LABELS = {
  morning: '☀️ Morning',
  afternoon: '🌤 Afternoon',
  evening: '🌙 Evening',
};

export function AdminSchedulePanel() {
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentViewWeek, setCurrentViewWeek] = useState<Date>(() => {
    const nowInToronto = toZonedTime(new Date(), TIMEZONE);
    return startOfWeek(nowInToronto, { weekStartsOn: 1 });
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedules();
  }, [currentViewWeek]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const weekStartStr = format(currentViewWeek, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("weekly_schedules")
        .select("*")
        .eq("week_start_date", weekStartStr)
        .order("day_of_week", { ascending: true });

      if (error) throw error;

      // Fetch profile names separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const schedulesWithProfiles = data.map(schedule => ({
          ...schedule,
          profiles: profiles?.find(p => p.id === schedule.user_id)
        }));

        setSchedules(schedulesWithProfiles as WeeklySchedule[]);
      } else {
        setSchedules([]);
      }
    } catch (error: any) {
      toast({
        title: "Error loading schedules",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    setCurrentViewWeek(subWeeks(currentViewWeek, 1));
  };

  const goToNextWeek = () => {
    setCurrentViewWeek(addWeeks(currentViewWeek, 1));
  };

  const goToCurrentWeek = () => {
    const nowInToronto = toZonedTime(new Date(), TIMEZONE);
    setCurrentViewWeek(startOfWeek(nowInToronto, { weekStartsOn: 1 }));
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentViewWeek, i));
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const getSchedulesForDay = (dayIndex: number) => {
    return schedules.filter(s => s.day_of_week === dayIndex);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Schedule History</h1>
              <p className="text-muted-foreground mt-1">View all member schedules (Admin Only)</p>
            </div>
            <Button variant="outline" onClick={goToCurrentWeek}>
              Current Week
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Week of {format(currentViewWeek, "MMMM d, yyyy")}
                </CardTitle>
                <CardDescription>
                  {format(currentViewWeek, "MMM d")} - {format(addDays(currentViewWeek, 6), "MMM d, yyyy")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading schedules...
              </div>
            ) : (
              <div className="space-y-6">
                {weekDays.map((day, index) => {
                  const daySchedules = getSchedulesForDay(index);
                  
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="font-semibold text-lg">
                          {dayNames[index]}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(day, "MMMM d, yyyy")}
                        </div>
                        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{daySchedules.length} {daySchedules.length === 1 ? 'member' : 'members'}</span>
                        </div>
                      </div>

                      {daySchedules.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded">
                          No members scheduled
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {daySchedules.map((schedule) => (
                            <div key={schedule.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                              <div className="font-medium">
                                {schedule.profiles?.full_name || 'Unknown Member'}
                              </div>
                              <div className="flex gap-2">
                                {schedule.time_windows.map((window) => (
                                  <span key={window} className="text-sm px-2 py-1 bg-primary/10 text-primary rounded">
                                    {TIME_WINDOW_LABELS[window as keyof typeof TIME_WINDOW_LABELS] || window}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}