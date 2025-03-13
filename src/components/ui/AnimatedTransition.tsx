
import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AnimatedTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedTransition({ children, className }: AnimatedTransitionProps) {
  const location = useLocation();
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.style.opacity = '0';
      elementRef.current.style.transform = 'translateY(10px)';
      
      const timeout = setTimeout(() => {
        if (elementRef.current) {
          elementRef.current.style.opacity = '1';
          elementRef.current.style.transform = 'translateY(0)';
        }
      }, 50);
      
      return () => clearTimeout(timeout);
    }
  }, [location]);
  
  return (
    <div 
      ref={elementRef}
      className={cn(
        "transition-all duration-300 ease-out",
        className
      )}
    >
      {children}
    </div>
  );
}
