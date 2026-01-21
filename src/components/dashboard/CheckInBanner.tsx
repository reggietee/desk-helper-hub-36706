import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MapPin, CheckCircle } from "lucide-react";

interface CheckInBannerProps {
  userId: string;
  onCheckIn?: () => void;
}

export const CheckInBanner = ({ userId, onCheckIn }: CheckInBannerProps) => {
  const [showBanner, setShowBanner] = useState(false);
  const [checking, setChecking] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [creditsEarned, setCreditsEarned] = useState<number>(0);

  useEffect(() => {
    checkIpMatch();
  }, []);

  const checkIpMatch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("check-ip", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        console.error("Error checking IP:", response.error);
        setShowBanner(false);
        return;
      }

      const { matches } = response.data;
      setShowBanner(matches === true);
    } catch (error) {
      console.error("Error checking IP:", error);
      setShowBanner(false);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to check in");
        return;
      }

      const response = await supabase.functions.invoke("check-in", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Check-in failed");
      }

      if (!response.data.success) {
        toast.error(response.data.error || "Check-in failed");
        return;
      }

      setCheckedIn(true);
      
      // Show credits earned
      const credits = response.data.credits;
      if (credits && credits.awarded > 0) {
        setCreditsEarned(credits.awarded);
        const streakMessage = credits.streakBonus ? " (includes 5-day streak bonus!)" : "";
        toast.success(`Checked in ✅ +${credits.awarded} ©`, {
          description: `Welcome to Haven!${streakMessage}`
        });
      } else {
        toast.success("Checked in ✅", {
          description: "Welcome to Haven!"
        });
      }
      
      onCheckIn?.();

      // Hide banner after 3 seconds
      setTimeout(() => {
        setShowBanner(false);
      }, 3000);
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error(error.message || "Failed to check in");
    } finally {
      setCheckingIn(false);
    }
  };

  // Don't render anything while checking or if banner shouldn't show
  if (checking || !showBanner) {
    return null;
  }

  return (
    <div className="w-full bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">
                {checkedIn ? "You're checked in!" : "You're at Haven"}
              </p>
              {!checkedIn && (
                <p className="text-sm opacity-90">
                  Tap to record your visit
                </p>
              )}
            </div>
          </div>
          
          {!checkedIn ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="rounded-xl font-medium"
            >
              {checkingIn ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Check in
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Checked in ✅{creditsEarned > 0 && ` +${creditsEarned} ©`}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
