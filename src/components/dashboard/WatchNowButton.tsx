import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Radio, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchNowButtonProps {
  status: 'scheduled' | 'live';
  className?: string;
}

export function WatchNowButton({ status, className }: WatchNowButtonProps) {
  const navigate = useNavigate();
  const isLive = status === 'live';

  return (
    <Button
      onClick={() => navigate('/live')}
      className={cn(
        "relative gap-2 font-semibold rounded-xl transition-all duration-300",
        "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
        "shadow-lg hover:shadow-xl hover:shadow-destructive/25",
        "px-4 py-2 text-sm",
        // Glow effect on hover
        "hover:ring-2 hover:ring-destructive/50 hover:ring-offset-2 hover:ring-offset-background",
        className
      )}
    >
      {isLive ? (
        <>
          {/* Pulsing live dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <Video className="h-4 w-4" />
          <span>Watch Now</span>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">LIVE</span>
        </>
      ) : (
        <>
          <Radio className="h-4 w-4" />
          <span>Watch Now</span>
        </>
      )}
    </Button>
  );
}
