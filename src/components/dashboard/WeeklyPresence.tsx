import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Users } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { SchedulePlanModal } from "./SchedulePlanModal";
import { useToast } from "@/hooks/use-toast";

interface WeeklySchedule {
  id: string;
  user_id: string;
  day_of_week: number;
  time_windows: string[];
  show_name: boolean;
  week_start_date: string;
  profiles?: {
    full_name: string;
  };
}

const TIMEZONE = "America/Toronto";

export function WeeklyPresence({ userId }: { userId: string }) {
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Get current date in Toronto timezone
  const nowInToronto = toZonedTime(new Date(), TIMEZONE);
  const currentWeekStart = startOfWeek(nowInToronto, { weekStartsOn: 1 });
  const nextWeekStart = addWeeks(currentWeekStart, 1);
  
  const currentWeekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const nextWeekDays = Array.from({ length: 7 }, (_, i) => addDays(nextWeekStart, i));

  useEffect(() => {
    fetchSchedules();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("weekly-schedules-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekly_schedules",
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSchedules = async () => {
    try {
      const currentWeekStr = format(currentWeekStart, "yyyy-MM-dd");
      const nextWeekStr = format(nextWeekStart, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("weekly_schedules")
        .select("*")
        .in("week_start_date", [currentWeekStr, nextWeekStr]);

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

  const getOccupancyForDay = (dayIndex: number, weekStartDate: string) => {
    return schedules.filter((s) => s.day_of_week === dayIndex && s.week_start_date === weekStartDate);
  };

  const getColorForOccupancy = (count: number) => {
    if (count === 0) return "bg-background border-border";
    if (count <= 2) return "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800";
    return "bg-green-500 dark:bg-green-700 border-green-600 dark:border-green-900";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            This Week at Haven
          </h2>
          <p className="text-muted-foreground mt-1">
            See when members are in and share your schedule
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Users className="h-4 w-4" />
          Plan My Week at Haven
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-lg border bg-muted animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-lg border bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Current Week */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Current Week ({format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d")})
            </h3>
            <div className="grid grid-cols-7 gap-3">
              {currentWeekDays.map((day, index) => {
                const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");
                const daySchedules = getOccupancyForDay(index, weekStartStr);
                const occupancyCount = daySchedules.length;
                const colorClass = getColorForOccupancy(occupancyCount);
                const visibleMembers = daySchedules
                  .filter((s) => s.show_name && s.profiles)
                  .map((s) => ({
                    name: s.profiles!.full_name,
                    timeWindows: s.time_windows
                  }));

                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 transition-all ${colorClass}`}
                  >
                    <div className="font-medium text-sm">
                      {format(day, "EEE")}
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {format(day, "MMM d")}
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Users className="h-3 w-3" />
                      <span className="text-xs font-medium">{occupancyCount}</span>
                    </div>
                    {visibleMembers.length > 0 && (
                      <div className="text-xs space-y-1 mt-2">
                        {visibleMembers.slice(0, 2).map((member, i) => (
                          <div key={i} className="truncate opacity-75">
                            {member.name} {member.timeWindows.includes('morning') && '☀️'}
                            {member.timeWindows.includes('afternoon') && '🌤'}
                            {member.timeWindows.includes('evening') && '🌙'}
                          </div>
                        ))}
                        {visibleMembers.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{visibleMembers.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Week */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Next Week ({format(nextWeekStart, "MMM d")} - {format(addDays(nextWeekStart, 6), "MMM d")})
            </h3>
            <div className="grid grid-cols-7 gap-3">
              {nextWeekDays.map((day, index) => {
                const weekStartStr = format(nextWeekStart, "yyyy-MM-dd");
                const daySchedules = getOccupancyForDay(index, weekStartStr);
                const occupancyCount = daySchedules.length;
                const colorClass = getColorForOccupancy(occupancyCount);
                const visibleMembers = daySchedules
                  .filter((s) => s.show_name && s.profiles)
                  .map((s) => ({
                    name: s.profiles!.full_name,
                    timeWindows: s.time_windows
                  }));

                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 transition-all ${colorClass}`}
                  >
                    <div className="font-medium text-sm">
                      {format(day, "EEE")}
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {format(day, "MMM d")}
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Users className="h-3 w-3" />
                      <span className="text-xs font-medium">{occupancyCount}</span>
                    </div>
                    {visibleMembers.length > 0 && (
                      <div className="text-xs space-y-1 mt-2">
                        {visibleMembers.slice(0, 2).map((member, i) => (
                          <div key={i} className="truncate opacity-75">
                            {member.name} {member.timeWindows.includes('morning') && '☀️'}
                            {member.timeWindows.includes('afternoon') && '🌤'}
                            {member.timeWindows.includes('evening') && '🌙'}
                          </div>
                        ))}
                        {visibleMembers.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{visibleMembers.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-background border-border border" />
                <span className="text-muted-foreground">0 members</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800 border" />
                <span className="text-muted-foreground">1-2 members</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500 dark:bg-green-700 border-green-600 dark:border-green-900 border" />
                <span className="text-muted-foreground">3+ members</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Lighter days are better for productivity and focus. Darker days are better for networking and casual work.
            </p>
          </div>
        </>
      )}

      <SchedulePlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        currentWeekStart={currentWeekStart}
        nextWeekStart={nextWeekStart}
        onSaved={fetchSchedules}
      />
    </div>
  );
}
