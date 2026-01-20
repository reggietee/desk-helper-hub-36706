import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, History, Search } from "lucide-react";
import { format } from "date-fns";

interface Visit {
  id: string;
  user_id: string;
  checked_in_at: string;
  ip_address: string | null;
  profile?: {
    full_name: string;
    email: string | null;
  };
}

export const CheckInHistory = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    try {
      const { data, error } = await supabase
        .from("member_visits")
        .select("*")
        .order("checked_in_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch profiles for each visit
      const userIds = [...new Set(data?.map(v => v.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const visitsWithProfiles = data?.map(visit => ({
        ...visit,
        profile: profileMap.get(visit.user_id)
      })) || [];

      setVisits(visitsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching visits:", error);
      toast.error("Failed to load check-in history");
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = !searchTerm || 
      visit.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || 
      format(new Date(visit.checked_in_at), "yyyy-MM-dd") === dateFilter;

    return matchesSearch && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <CardTitle>Check-In History</CardTitle>
        </div>
        <CardDescription>
          View all confirmed member check-ins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="search" className="sr-only">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-filter" className="sr-only">Filter by date</Label>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        {/* Visit list */}
        {filteredVisits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {visits.length === 0 
              ? "No check-ins recorded yet"
              : "No check-ins match your filters"}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredVisits.map((visit) => (
              <div 
                key={visit.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{visit.profile?.full_name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{visit.profile?.email || "-"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {format(new Date(visit.checked_in_at), "MMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(visit.checked_in_at), "h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Showing {filteredVisits.length} of {visits.length} check-ins
        </p>
      </CardContent>
    </Card>
  );
};
