import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number | null;
  userId: string;
  name: string;
  balance: number;
  isCurrentUser: boolean;
}

interface LeaderboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refreshKey?: number;
}

export const LeaderboardModal = ({ open, onOpenChange, refreshKey = 0 }: LeaderboardModalProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchLeaderboard();
    }
  }, [open, refreshKey]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("get-leaderboard", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error fetching leaderboard:", error);
        return;
      }

      setLeaderboard(data.leaderboard || []);
      setCurrentUserEntry(data.currentUserEntry || null);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number | null) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankDisplay = (rank: number | null) => {
    if (rank === null) return "—";
    return `#${rank}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Haven Credits Leaderboard
          </DialogTitle>
          <DialogDescription>
            Top members by Haven Credits
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : leaderboard.length === 0 && !currentUserEntry ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No members on the leaderboard yet.</p>
            <p className="text-sm mt-1">Check in to start earning credits!</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 pb-4">
              {/* Main leaderboard entries */}
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    entry.isCurrentUser
                      ? "bg-primary/10 border-2 border-primary/30"
                      : "bg-accent/5 hover:bg-accent/10"
                  )}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-10">
                    {getRankIcon(entry.rank) || (
                      <span className="text-sm font-medium text-muted-foreground">
                        {getRankDisplay(entry.rank)}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      entry.isCurrentUser ? "font-semibold text-foreground" : "text-foreground"
                    )}>
                      {entry.name}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-xs text-primary font-medium">(You)</span>
                      )}
                    </p>
                  </div>

                  {/* Balance */}
                  <div className={cn(
                    "text-sm font-medium tabular-nums",
                    entry.isCurrentUser ? "text-primary" : "text-foreground"
                  )}>
                    {entry.balance} ©
                  </div>
                </div>
              ))}

              {/* Current user entry if not in main list (0 balance) */}
              {currentUserEntry && (
                <>
                  {leaderboard.length > 0 && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 border-t border-dashed border-border" />
                      <span className="text-xs text-muted-foreground">Your position</span>
                      <div className="flex-1 border-t border-dashed border-border" />
                    </div>
                  )}
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border-2 border-primary/30"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-10">
                      <span className="text-sm font-medium text-muted-foreground">—</span>
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {currentUserEntry.name}
                        <span className="ml-2 text-xs text-primary font-medium">(You)</span>
                      </p>
                    </div>

                    {/* Balance */}
                    <div className="text-sm font-medium tabular-nums text-primary">
                      {currentUserEntry.balance} ©
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
