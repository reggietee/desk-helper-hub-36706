import { useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LockedOverlayProps {
  children: React.ReactNode;
  isLocked: boolean;
  message?: string;
  className?: string;
}

export function LockedOverlay({ 
  children, 
  isLocked, 
  message = "Members only",
  className 
}: LockedOverlayProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={cn("relative", className)}>
        {/* The underlying content - blurred */}
        <div className="pointer-events-none select-none">
          <div className="blur-sm opacity-50">
            {children}
          </div>
        </div>

        {/* Locked overlay */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] cursor-pointer rounded-xl transition-colors hover:bg-background/70"
          onClick={() => setDialogOpen(true)}
        >
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="p-3 rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{message}</p>
          </div>
        </div>
      </div>

      {/* Info Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Members Only Feature
            </DialogTitle>
            <DialogDescription className="pt-2">
              This feature is available exclusively to Haven Members. 
              As a Guest, you have access to the Feed, Credits, Profile, and Haven Updates.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
