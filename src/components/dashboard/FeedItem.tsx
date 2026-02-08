import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';

interface FeedItemProps {
  item: {
    id: string;
    type: 'chat' | 'activity';
    author_id: string | null;
    body: string;
    credits_amount: number | null;
    action_name: string | null;
    created_at: string;
    author?: {
      full_name: string;
      role: string | null;
    } | null;
  };
  currentUserId: string;
  isGuestViewer?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  daily_checkin: 'Daily check-in',
  weekly_streak_bonus: '5-day streak bonus',
  weekly_planning: 'Weekly planning',
  admin_adjustment: 'Admin adjustment',
};

export function FeedItem({ item, currentUserId, isGuestViewer = false }: FeedItemProps) {
  const isOwnMessage = item.author_id === currentUserId;
  const isActivity = item.type === 'activity';
  const isAuthorGuest = item.author?.role === 'guest';
  
  const timestamp = useMemo(() => {
    const date = new Date(item.created_at);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return format(date, 'h:mm a');
    } else if (isYesterday) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  }, [item.created_at]);

  const authorName = useMemo(() => {
    // For activity items: guests see "Member" (anonymized), members/admin see real name
    if (isActivity && isGuestViewer) {
      return 'Member';
    }
    // For chat items: everyone sees the real name
    if (item.author?.full_name) return item.author.full_name;
    return 'Member';
  }, [item.author?.full_name, isActivity, isGuestViewer]);

  const sanitizedBody = useMemo(() => {
    const isHtml = /<[a-z][\s\S]*>/i.test(item.body);
    
    if (isHtml) {
      return DOMPurify.sanitize(item.body, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
    } else {
      return item.body
        .split('\n')
        .map(line => DOMPurify.sanitize(line))
        .join('<br>');
    }
  }, [item.body]);

  // Role-based styling - guests get grey, members/admins get accent/green
  // For activity items shown to guest viewers, use neutral styling (anonymized)
  const nameColorClass = (isActivity && isGuestViewer) 
    ? 'text-muted-foreground'
    : isAuthorGuest 
      ? 'text-muted-foreground' 
      : 'text-accent';

  if (isActivity) {
    // Parse action_name - handle week-specific format like "weekly_planning:2026-01-27"
    const baseActionName = item.action_name?.split(':')[0] || item.action_name;
    const actionLabel = baseActionName ? ACTION_LABELS[baseActionName] || baseActionName : 'Credits';
    
    // For guest viewers, use neutral styling for anonymized activity posts
    const activityColorClass = (isGuestViewer || isAuthorGuest) ? 'text-muted-foreground' : 'text-accent';
    
    return (
      <div className="flex justify-center py-1.5">
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-2.5 py-1 rounded-full bg-accent/10 text-[11px] text-muted-foreground">
          <Activity className={cn("h-3 w-3 flex-shrink-0", activityColorClass)} />
          <span className={cn("font-medium", nameColorClass)}>{authorName}</span>
          <span>earned</span>
          <span className={cn("font-semibold whitespace-nowrap", activityColorClass)}>+{item.credits_amount} ©</span>
          <span>—</span>
          <span>{actionLabel}</span>
        </div>
      </div>
    );
  }

  // Chat message styling - inspired by reference
  return (
    <div className={cn(
      "flex flex-col gap-0.5",
      isOwnMessage ? "items-end" : "items-start"
    )}>
      {/* Sender name + timestamp header */}
      <div className={cn(
        "flex items-center gap-1.5 px-1 mb-0.5",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}>
        <span className={cn("text-[11px] font-medium", nameColorClass)}>
          {authorName}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {isOwnMessage ? timestamp : `· ${timestamp}`}
        </span>
      </div>
      
      {/* Message bubble */}
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3 py-1.5",
        isOwnMessage 
          ? "bg-primary text-primary-foreground rounded-br-sm" 
          : isAuthorGuest
            ? "bg-muted/50 rounded-bl-sm"
            : "bg-muted rounded-bl-sm"
      )}>
        <div 
          className={cn(
            "text-[13px] leading-relaxed break-words",
            isOwnMessage ? "[&_a]:text-primary-foreground [&_a]:underline" : "[&_a]:text-primary [&_a]:underline"
          )}
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
      </div>
    </div>
  );
}
