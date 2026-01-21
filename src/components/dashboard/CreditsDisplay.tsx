import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CreditsDisplayProps {
  userId: string;
  refreshKey?: number;
}

export const CreditsDisplay = ({ userId, refreshKey = 0 }: CreditsDisplayProps) => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchBalance();
    }
  }, [userId, refreshKey]);

  const fetchBalance = async () => {
    try {
      const { data, error } = await supabase
        .from("haven_credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        return;
      }

      setBalance(data?.balance ?? 0);
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 rounded-xl text-sm font-medium text-muted-foreground">
        <span>-- ©</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 rounded-xl text-sm font-medium text-foreground cursor-default hover:bg-accent/20 transition-colors">
            <span>{balance} ©</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Haven Credits</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
