import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Coins, TrendingUp, Calendar } from "lucide-react";

interface CreditEntry {
  id: string;
  amount: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

interface CreditsHistoryProps {
  userId: string;
  refreshKey?: number;
}

export const CreditsHistory = ({ userId, refreshKey = 0 }: CreditsHistoryProps) => {
  const [entries, setEntries] = useState<CreditEntry[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchCreditsData();
    }
  }, [userId, refreshKey]);

  const fetchCreditsData = async () => {
    setLoading(true);
    try {
      // Fetch current balance
      const { data: creditsData } = await supabase
        .from("haven_credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      setBalance(creditsData?.balance ?? 0);

      // Fetch ledger entries
      const { data: ledgerData, error } = await supabase
        .from("haven_credits_ledger")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching credit history:", error);
        return;
      }

      setEntries(ledgerData || []);
    } catch (error) {
      console.error("Error fetching credits data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getReasonIcon = (reason: string) => {
    if (reason.toLowerCase().includes("streak")) {
      return <TrendingUp className="h-4 w-4 text-amber-500" />;
    }
    if (reason === "weekly_planning") {
      return <Calendar className="h-4 w-4 text-blue-500" />;
    }
    if (reason === "onboarding_bonus") {
      return <Coins className="h-4 w-4 text-amber-500" />;
    }
    return <Calendar className="h-4 w-4 text-primary" />;
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "daily_checkin":
        return "Daily check-in";
      case "weekly_streak_bonus":
        return "5-day streak bonus";
      case "weekly_planning":
        return "Weekly planning";
      case "onboarding_bonus":
        return "Onboarding bonus";
      default:
        return reason;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading credits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Summary */}
      <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-xl">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-bold text-foreground">{balance} ©</p>
        </div>
      </div>

      {/* Credits Ledger */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Credit History</h4>
        
        {entries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No credits earned yet</p>
            <p className="text-xs mt-1">Check in at Haven to start earning!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getReasonIcon(entry.reason)}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {getReasonLabel(entry.reason)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    +{entry.amount} ©
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Balance: {entry.balance_after} ©
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
