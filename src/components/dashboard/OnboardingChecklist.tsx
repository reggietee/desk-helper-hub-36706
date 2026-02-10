import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface OnboardingChecklistProps {
  userId: string;
  onCreditsEarned?: () => void;
  onOpenProfile?: () => void;
  onOpenWeekPlan?: () => void;
}

interface OnboardingProgress {
  profile_completed_at: string | null;
  week_planned_at: string | null;
  checked_in_at: string | null;
  feed_posted_at: string | null;
  sprint_joined_at: string | null;
  bonus_awarded_at: string | null;
}

const STEPS = [
  { key: "profile_completed_at", label: "Complete your profile", action: "profile" },
  { key: "week_planned_at", label: "Plan your week", action: "weekplan" },
  { key: "checked_in_at", label: "Check in at Haven", action: null },
  { key: "feed_posted_at", label: "Say hello in the Feed", action: "feed" },
  { key: "sprint_joined_at", label: "Join a Work Sprint", action: "sprint" },
] as const;

export function OnboardingChecklist({ userId, onCreditsEarned, onOpenProfile, onOpenWeekPlan }: OnboardingChecklistProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("onboarding-progress", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) {
        console.error("[Onboarding] Error:", response.error);
        setHidden(true);
        return;
      }

      const { progress: prog, bonusJustAwarded, bonusAwarded } = response.data;

      if (bonusAwarded && !bonusJustAwarded) {
        // Already completed previously - hide checklist
        setHidden(true);
        return;
      }

      if (bonusJustAwarded) {
        // Just completed! Show celebration
        setProgress(prog);
        setCelebrating(true);
        onCreditsEarned?.();

        // Fire confetti
        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ["hsl(var(--primary))", "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1"];

        const frame = () => {
          confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors,
          });
          confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors,
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();

        // Hide after celebration
        setTimeout(() => {
          setCelebrating(false);
          setHidden(true);
        }, 4000);
        return;
      }

      setProgress(prog);
    } catch (err) {
      console.error("[Onboarding] Error:", err);
      setHidden(true);
    } finally {
      setLoading(false);
    }
  }, [userId, onCreditsEarned]);

  useEffect(() => {
    fetchProgress();

    // Re-check progress periodically when window regains focus
    const handleFocus = () => fetchProgress();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchProgress]);

  // Also re-check after visibility changes (tab switch back)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchProgress();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchProgress]);

  if (loading || hidden || !progress) return null;

  const completedCount = STEPS.filter(s => progress[s.key as keyof OnboardingProgress]).length;
  const progressPercent = (completedCount / STEPS.length) * 100;

  const handleAction = (action: string | null) => {
    if (!action) return;
    switch (action) {
      case "profile":
        onOpenProfile?.();
        break;
      case "weekplan":
        onOpenWeekPlan?.();
        break;
      case "feed":
        // Scroll to feed section
        document.querySelector('[data-section="feed"]')?.scrollIntoView({ behavior: "smooth" });
        break;
      case "sprint":
        document.querySelector('[data-section="sprints"]')?.scrollIntoView({ behavior: "smooth" });
        break;
    }
  };

  // Celebration overlay
  if (celebrating) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        <div className="bg-card/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-border animate-in zoom-in-95 duration-300 text-center pointer-events-auto">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
            Onboarding Complete!
          </h2>
          <p className="text-3xl font-bold text-primary mb-2">+150 ©</p>
          <p className="text-muted-foreground">Welcome to Haven! 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="haven-card border border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Get Started</span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">{completedCount}/{STEPS.length}</span>
        </div>

        <Progress value={progressPercent} className="h-1.5 mb-3" />

        <div className="space-y-1.5">
          {STEPS.map((step) => {
            const done = !!progress[step.key as keyof OnboardingProgress];
            return (
              <button
                key={step.key}
                onClick={() => !done && handleAction(step.action)}
                disabled={done || !step.action}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm transition-colors",
                  done
                    ? "text-muted-foreground"
                    : step.action
                    ? "text-foreground hover:bg-muted/50 cursor-pointer"
                    : "text-foreground"
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                )}
                <span className={cn(done && "line-through")}>{step.label}</span>
                {!done && step.action && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground mt-3 text-center">
          Complete all steps to earn <span className="font-semibold text-primary">+150 ©</span>
        </p>
      </CardContent>
    </Card>
  );
}
