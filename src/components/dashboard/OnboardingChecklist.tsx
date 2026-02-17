import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  User,
  CalendarDays,
  MapPin,
  MessageCircle,
  Zap,
} from "lucide-react";
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
  { key: "profile_completed_at", label: "Complete profile", action: "profile", icon: User },
  { key: "week_planned_at", label: "Plan your week", action: "weekplan", icon: CalendarDays },
  { key: "checked_in_at", label: "Check in at Haven", action: null, icon: MapPin },
  { key: "feed_posted_at", label: "Say hello in the Feed", action: "feed", icon: MessageCircle },
  { key: "sprint_joined_at", label: "Join a Work Sprint", action: "sprint", icon: Zap },
] as const;

function getStatusMessage(completed: number, total: number) {
  if (completed === total) return null;
  if (completed === total - 1) return "One more step to claim your reward ✨";
  return `Complete all steps to unlock +100 ©`;
}

export function OnboardingChecklist({ userId, onCreditsEarned, onOpenProfile, onOpenWeekPlan }: OnboardingChecklistProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchInFlightRef = useRef(false);

  const fetchProgress = useCallback(async () => {
    // Prevent concurrent calls (race condition that caused multiple awards)
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { fetchInFlightRef.current = false; return; }

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
        setHidden(true);
        return;
      }

      if (bonusJustAwarded) {
        setProgress(prog);
        setCelebrating(true);
        onCreditsEarned?.();

        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ["hsl(var(--primary))", "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1"];
        const frame = () => {
          confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
          confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();

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
      fetchInFlightRef.current = false;
    }
  }, [userId, onCreditsEarned]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Entrance animation (once per session)
  useEffect(() => {
    if (!loading && !hidden && progress && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [loading, hidden, progress, hasAnimated]);

  if (loading || hidden || !progress) return null;

  const completedCount = STEPS.filter(s => progress[s.key as keyof OnboardingProgress]).length;
  const progressPercent = (completedCount / STEPS.length) * 100;
  const statusMessage = getStatusMessage(completedCount, STEPS.length);

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
        document.querySelector('[data-section="feed"]')?.scrollIntoView({ behavior: "smooth" });
        break;
      case "sprint":
        document.querySelector('[data-section="sprints"]')?.scrollIntoView({ behavior: "smooth" });
        break;
    }
  };

  if (celebrating) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        <div className="bg-card/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-border animate-in zoom-in-95 duration-300 text-center pointer-events-auto">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
            Onboarding Complete!
          </h2>
          <p className="text-3xl font-bold text-primary mb-2">+100 ©</p>
          <p className="text-muted-foreground">Welcome to Haven! 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "quest-card relative overflow-hidden rounded-2xl border border-accent/30 p-4 transition-all duration-500",
        "bg-card shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.15)]",
        "dark:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.1)] dark:border-accent/20",
        hasAnimated ? "animate-quest-enter" : "opacity-0 translate-y-3"
      )}
    >
      {/* Subtle accent gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.04] via-transparent to-primary/[0.03] pointer-events-none rounded-2xl" />

      {/* Header row */}
      <div className="relative flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {/* Quest badge pill */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 dark:bg-primary/15 border border-primary/20">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              New Member Quest
            </span>
          </div>
        </div>

        {/* Reward capsule */}
        <div className="quest-reward-capsule group flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-accent-foreground cursor-default">
          <span className="text-[11px] font-bold">+100 ©</span>
          <span className="text-[10px] font-semibold opacity-80">Reward</span>
          <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      {/* Progress bar area */}
      <div className="relative flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <Progress value={progressPercent} className="h-2 quest-progress" />
          {/* Shimmer overlay on incomplete bar */}
          {progressPercent < 100 && (
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
              <div className="quest-shimmer absolute inset-0" />
            </div>
          )}
        </div>
        <span className="text-xs font-semibold text-foreground whitespace-nowrap tabular-nums">
          {completedCount}/{STEPS.length}
        </span>
      </div>

      {/* Checklist grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
        {STEPS.map((step) => {
          const done = !!progress[step.key as keyof OnboardingProgress];
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              onClick={() => !done && handleAction(step.action)}
              disabled={done || !step.action}
              className={cn(
                "group flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[13px] transition-all duration-200",
                done
                  ? "text-muted-foreground"
                  : step.action
                  ? "text-foreground hover:bg-accent/10 dark:hover:bg-accent/15 cursor-pointer"
                  : "text-foreground"
              )}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <div className="relative flex-shrink-0">
                  <Circle className="h-4 w-4 text-border" />
                  <Icon className="h-2 w-2 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              )}
              <span className={cn("truncate", done && "line-through decoration-muted-foreground/40 decoration-1")}>
                {step.label}
              </span>
              {!done && step.action && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/50 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}
      </div>

      {/* Status message */}
      {statusMessage && (
        <p className="relative text-[11px] text-muted-foreground mt-2 text-center font-medium">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
