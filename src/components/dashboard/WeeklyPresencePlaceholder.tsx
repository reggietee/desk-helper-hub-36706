import { Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "America/Toronto";

/**
 * Privacy-safe placeholder for WeeklyPresence component.
 * Shows the same structure but with "Member" placeholders instead of actual names.
 */
export function WeeklyPresencePlaceholder() {
  // Get current date in Toronto timezone
  const nowInToronto = toZonedTime(new Date(), TIMEZONE);
  const currentWeekStart = startOfWeek(nowInToronto, { weekStartsOn: 1 });
  const nextWeekStart = addWeeks(currentWeekStart, 1);
  
  const currentWeekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const nextWeekDays = Array.from({ length: 7 }, (_, i) => addDays(nextWeekStart, i));

  // Mock data with placeholder names
  const mockOccupancy = [0, 2, 3, 2, 1, 0, 0]; // Example occupancy per day

  const getColorForOccupancy = (count: number) => {
    if (count === 0) return "bg-background border-border";
    if (count <= 2) return "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800";
    return "bg-green-500 dark:bg-green-700 border-green-600 dark:border-green-900";
  };

  const renderDayCard = (day: Date, index: number) => {
    const occupancyCount = mockOccupancy[index];
    const colorClass = getColorForOccupancy(occupancyCount);
    
    // Generate placeholder members
    const placeholderMembers = Array.from({ length: Math.min(occupancyCount, 2) }, () => "Member");

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
        {placeholderMembers.length > 0 && (
          <div className="text-xs space-y-1 mt-2">
            {placeholderMembers.map((_, i) => (
              <div key={i} className="truncate opacity-75">
                Member ☀️
              </div>
            ))}
            {occupancyCount > 2 && (
              <div className="text-xs text-muted-foreground">
                +{occupancyCount - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <Button className="gap-2" disabled>
          <Users className="h-4 w-4" />
          Plan My Week at Haven
        </Button>
      </div>

      {/* Current Week Grid */}
      <div className="grid grid-cols-7 gap-3">
        {currentWeekDays.map((day, index) => renderDayCard(day, index))}
      </div>

      {/* Next Week Grid */}
      <div className="grid grid-cols-7 gap-3">
        {nextWeekDays.map((day, index) => renderDayCard(day, index))}
      </div>

      {/* Legend */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex flex-row items-center gap-4 text-sm">
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
    </div>
  );
}
