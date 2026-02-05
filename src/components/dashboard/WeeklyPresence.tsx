import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Users, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { SchedulePlanModal } from "./SchedulePlanModal";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

// Mobile bottom sheet component for showing additional members
function MoreMembersSheet({
  members,
  count,
  renderTimeWindowEmojis
}: {
  members: { name: string; timeWindows: string[] }[];
  count: number;
  renderTimeWindowEmojis: (timeWindows: string[]) => JSX.Element;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-muted-foreground cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
        aria-label={`Show ${count} more members`}
      >
        +{count} more
      </button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Additional Members</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 py-4">
            {members.map((member, i) => (
              <div key={i} className="text-sm py-2 border-b border-border last:border-0">
                {member.name} {renderTimeWindowEmojis(member.timeWindows)}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function WeeklyPresence({ userId, onCreditsEarned }: { userId: string; onCreditsEarned?: () => void }) {
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentWeekOpen, setCurrentWeekOpen] = useState(true);
  const [nextWeekOpen, setNextWeekOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

      // Fetch profile names from secure get_member_directory function (only approved members)
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .rpc("get_member_directory")
          .in("id", userIds);

        // The function only returns approved members, so all returned IDs are valid
        const validUserIds = new Set((profiles as { id: string; full_name: string }[] | null)?.map(p => p.id) || []);
        const filteredData = data.filter(schedule => validUserIds.has(schedule.user_id));

        const schedulesWithProfiles = filteredData.map(schedule => ({
          ...schedule,
          profiles: (profiles as { id: string; full_name: string }[] | null)?.find(p => p.id === schedule.user_id)
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

  const getAccentColorForOccupancy = (count: number) => {
    if (count === 0) return "bg-border";
    if (count <= 2) return "bg-green-300 dark:bg-green-800";
    return "bg-green-600 dark:bg-green-500";
  };

  const renderTimeWindowEmojis = (timeWindows: string[]) => {
    return (
      <>
        {timeWindows.includes('morning') && '☀️'}
        {timeWindows.includes('afternoon') && '🌤'}
        {timeWindows.includes('evening') && '🌙'}
      </>
    );
  };

  // Desktop grid day card
  const renderDesktopDayCard = (day: Date, index: number, weekStartStr: string) => {
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
                {member.name} {renderTimeWindowEmojis(member.timeWindows)}
              </div>
            ))}
            {visibleMembers.length > 2 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="text-xs text-muted-foreground cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
                    aria-label={`Show ${visibleMembers.length - 2} more members`}
                  >
                    +{visibleMembers.length - 2} more
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-1">
                    {visibleMembers.slice(2).map((member, i) => (
                      <div key={i} className="text-sm">
                        {member.name} {renderTimeWindowEmojis(member.timeWindows)}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>
    );
  };

  // Mobile day row
  const renderMobileDayRow = (day: Date, index: number, weekStartStr: string) => {
    const daySchedules = getOccupancyForDay(index, weekStartStr);
    const occupancyCount = daySchedules.length;
    const colorClass = getColorForOccupancy(occupancyCount);
    const accentColor = getAccentColorForOccupancy(occupancyCount);
    const visibleMembers = daySchedules
      .filter((s) => s.show_name && s.profiles)
      .map((s) => ({
        name: s.profiles!.full_name,
        timeWindows: s.time_windows
      }));

    return (
      <div
        key={index}
        className={`rounded-xl border p-4 transition-all ${colorClass} flex gap-3`}
      >
        {/* Color accent bar */}
        <div className={`w-1.5 rounded-full ${accentColor} shrink-0`} />
        
        <div className="flex-1 min-w-0">
          {/* Day and date */}
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-base">
              {format(day, "EEE, MMM d")}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">
                {occupancyCount} {occupancyCount === 1 ? 'person' : 'people'}
              </span>
            </div>
          </div>
          
          {/* Visible members */}
          {visibleMembers.length > 0 && (
            <div className="space-y-1">
              {visibleMembers.slice(0, 3).map((member, i) => (
                <div key={i} className="text-sm text-muted-foreground truncate">
                  {member.name} {renderTimeWindowEmojis(member.timeWindows)}
                </div>
              ))}
              {visibleMembers.length > 3 && (
                <MoreMembersSheet
                  members={visibleMembers.slice(3)}
                  count={visibleMembers.length - 3}
                  renderTimeWindowEmojis={renderTimeWindowEmojis}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Mobile accordion week button
  const renderMobileWeekAccordion = (
    weekDays: Date[],
    weekStart: Date,
    label: string,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
  ) => {
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const weekEndStr = format(addDays(weekStart, 6), "MMM d");
    const weekStartFormatted = format(weekStart, "MMM d");
    
    // Calculate total occupancy for the week
    const totalOccupancy = weekDays.reduce((sum, _, index) => {
      return sum + getOccupancyForDay(index, weekStartStr).length;
    }, 0);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div>
              <div className="font-semibold text-base text-foreground">
                {label}
              </div>
              <div className="text-sm text-muted-foreground">
                {weekStartFormatted} – {weekEndStr}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {totalOccupancy} scheduled
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-3">
          {weekDays.map((day, index) => renderMobileDayRow(day, index, weekStartStr))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderLegend = () => (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-row items-center gap-4'} text-sm`}>
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
        💡 Days in white or light green are better for productivity and focus. Days in dark green are better for networking and casual work.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header - different layout on mobile */}
      {isMobile ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Who's In?
            </h2>
            <p className="text-muted-foreground mt-1">
              See who's in this week and share when you'll be at Haven
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="w-full gap-2" size="lg">
            <Users className="h-5 w-5" />
            Plan My Week at Haven
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Who's In?
            </h2>
            <p className="text-muted-foreground mt-1">
              See who's in this week and share when you'll be at Haven
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Users className="h-4 w-4" />
            Plan My Week at Haven
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {isMobile ? (
            <>
              <div className="h-16 rounded-xl bg-muted animate-pulse" />
              <div className="h-16 rounded-xl bg-muted animate-pulse" />
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <>
          {isMobile ? (
            /* Mobile: Accordion layout */
            <div className="space-y-3">
              {renderMobileWeekAccordion(
                currentWeekDays,
                currentWeekStart,
                "This Week",
                currentWeekOpen,
                setCurrentWeekOpen
              )}
              {renderMobileWeekAccordion(
                nextWeekDays,
                nextWeekStart,
                "Next Week",
                nextWeekOpen,
                setNextWeekOpen
              )}
            </div>
          ) : (
            /* Desktop: Grid layout */
            <>
              {/* Current Week */}
              <div className="space-y-3">
                <div className="grid grid-cols-7 gap-3">
                  {currentWeekDays.map((day, index) => 
                    renderDesktopDayCard(day, index, format(currentWeekStart, "yyyy-MM-dd"))
                  )}
                </div>
              </div>

              {/* Next Week */}
              <div className="space-y-3">
                <div className="grid grid-cols-7 gap-3">
                  {nextWeekDays.map((day, index) => 
                    renderDesktopDayCard(day, index, format(nextWeekStart, "yyyy-MM-dd"))
                  )}
                </div>
              </div>
            </>
          )}

          {renderLegend()}
        </>
      )}

      <SchedulePlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        currentWeekStart={currentWeekStart}
        nextWeekStart={nextWeekStart}
        onSaved={fetchSchedules}
        onCreditsEarned={onCreditsEarned}
      />
    </div>
  );
}
