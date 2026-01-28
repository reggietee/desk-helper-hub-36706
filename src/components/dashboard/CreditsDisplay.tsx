import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CreditsDisplayProps {
  userId: string;
  refreshKey?: number;
  onClick?: () => void;
  className?: string;
}

// Particle burst component
const ParticleBurst = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;
  
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const delay = Math.random() * 0.1;
    return { angle, delay, id: i };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-particle-burst motion-reduce:hidden"
          style={{
            '--particle-angle': `${particle.angle}deg`,
            animationDelay: `${particle.delay}s`,
          } as React.CSSProperties}
        />
      ))}
      {/* Sparkle accents */}
      {[0, 1, 2, 3].map((i) => (
        <span
          key={`sparkle-${i}`}
          className="absolute left-1/2 top-1/2 text-primary animate-sparkle motion-reduce:hidden"
          style={{
            '--sparkle-angle': `${45 + i * 90}deg`,
            animationDelay: `${0.05 + i * 0.05}s`,
            fontSize: '10px',
          } as React.CSSProperties}
        >
          ✦
        </span>
      ))}
    </div>
  );
};

// Floating badge component
const FloatingBadge = ({ amount, isVisible }: { amount: number; isVisible: boolean }) => {
  if (!isVisible || amount <= 0) return null;
  
  return (
    <span 
      className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold text-primary whitespace-nowrap animate-float-up motion-reduce:animate-fade-in"
    >
      +{amount} ©
    </span>
  );
};

export const CreditsDisplay = ({ userId, refreshKey = 0, onClick, className }: CreditsDisplayProps) => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const previousBalanceRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  const triggerAnimation = useCallback((amount: number) => {
    setEarnedAmount(amount);
    setIsAnimating(true);
    
    // Reset animation after it completes
    setTimeout(() => {
      setIsAnimating(false);
      setEarnedAmount(0);
    }, 1500);
  }, []);

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

      const newBalance = data?.balance ?? 0;
      
      // Check if this is an increase (not initial load)
      if (!isInitialLoadRef.current && previousBalanceRef.current !== null) {
        const increase = newBalance - previousBalanceRef.current;
        if (increase > 0) {
          triggerAnimation(increase);
        }
      }
      
      previousBalanceRef.current = newBalance;
      isInitialLoadRef.current = false;
      setBalance(newBalance);
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-1 px-3 py-1.5 bg-accent/10 rounded-xl text-sm font-medium text-muted-foreground", className)}>
        <span>-- ©</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button"
            onClick={onClick}
            className={cn("relative flex items-center gap-1 px-3 py-1.5 bg-accent/10 rounded-xl text-sm font-medium text-foreground cursor-pointer hover:bg-accent/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", className)}
          >
            {/* Particle burst effect */}
            <ParticleBurst isActive={isAnimating} />
            
            {/* Floating earned amount badge */}
            <FloatingBadge amount={earnedAmount} isVisible={isAnimating} />
            
            {/* Glow effect for reduced motion */}
            <span 
              className={cn(
                "absolute inset-0 rounded-xl transition-all duration-500 motion-reduce:transition-none pointer-events-none",
                isAnimating && "motion-reduce:ring-2 motion-reduce:ring-primary/50 motion-reduce:bg-primary/10"
              )}
            />
            
            {/* Credits number with pop animation */}
            <span 
              className={cn(
                "relative z-10 transition-transform",
                isAnimating && "animate-credits-pop motion-reduce:animate-none motion-reduce:text-primary motion-reduce:font-bold"
              )}
            >
              {balance} ©
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Haven Credits — Click to view history</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
