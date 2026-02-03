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
  teaser?: string;
  modalTitle?: string;
  modalDescription?: string;
  className?: string;
  /** When true, the underlying content is hidden for privacy (shows placeholder instead) */
  hideContent?: boolean;
  /** Custom placeholder content to show when hideContent is true */
  placeholder?: React.ReactNode;
}

export function LockedOverlay({ 
  children, 
  isLocked, 
  message = "Members only",
  teaser,
  modalTitle = "Members Only Feature",
  modalDescription = "This feature is available exclusively to Haven Members. As a Guest, you have access to the Feed, Credits, Profile, and Haven Updates.",
  className,
  hideContent = false,
  placeholder
}: LockedOverlayProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={cn("relative", className)}>
        {/* The underlying content - blurred or hidden for privacy */}
        <div className="pointer-events-none select-none">
          {hideContent ? (
            // Show placeholder content for privacy
            <div className="blur-[3px] opacity-40">
              {placeholder || children}
            </div>
          ) : (
            // Show actual content with reduced blur (~20% less than before)
            <div className="blur-[3px] opacity-40">
              {children}
            </div>
          )}
        </div>

        {/* Locked overlay */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[1px] cursor-pointer rounded-xl transition-colors hover:bg-background/60"
          onClick={() => setDialogOpen(true)}
        >
          <div className="flex flex-col items-center gap-3 p-6 max-w-sm text-center">
            <div className="p-3 rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{message}</p>
            {teaser && (
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {teaser}
              </p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-1">
              Tap to learn more
            </p>
          </div>
        </div>
      </div>

      {/* Info Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {modalTitle}
            </DialogTitle>
            <DialogDescription className="pt-3 text-sm leading-relaxed">
              {modalDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 border-t border-border mt-4">
            <p className="text-xs text-muted-foreground mb-4">
              Available to Haven Members
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
