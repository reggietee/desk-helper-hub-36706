import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";

interface VisitHistoryProps {
  userId: string;
  refreshKey?: number;
}

interface Visit {
  id: string;
  checked_in_at: string;
}

export const VisitHistory = ({ userId, refreshKey }: VisitHistoryProps) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchVisits();
    }
  }, [userId, refreshKey]);

  const fetchVisits = async () => {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from("member_visits")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get recent visits
      const { data, error } = await supabase
        .from("member_visits")
        .select("id, checked_in_at")
        .eq("user_id", userId)
        .order("checked_in_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error("Error fetching visits:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Visit History</CardTitle>
        </div>
        <CardDescription>
          Your on-site check-ins at Haven
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total counter */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <span className="text-sm font-medium">Total visits</span>
          <span className="text-2xl font-bold text-primary">{totalCount}</span>
        </div>

        {/* Recent visits */}
        {visits.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recent visits</p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {visits.map((visit) => (
                <div 
                  key={visit.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">
                    {format(new Date(visit.checked_in_at), "EEEE, MMMM d")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(visit.checked_in_at), "h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No visits recorded yet. Check in when you're at Haven!
          </p>
        )}
      </CardContent>
    </Card>
  );
};
