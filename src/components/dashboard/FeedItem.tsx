import { useMemo } from 'react';
import { Activity, User } from 'lucide-react';
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
    } | null;
  };
  currentUserId: string;
  isCompact?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  daily_checkin: 'Daily check-in',
  weekly_streak_bonus: '5-day streak bonus',
  weekly_planning: 'Weekly planning',
  admin_adjustment: 'Admin adjustment',
};

export function FeedItem({ item, currentUserId, isCompact = false }: FeedItemProps) {
  const isOwnMessage = item.author_id === currentUserId;
  const isActivity = item.type === 'activity';
  
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
    if (isActivity) return 'System';
    if (item.author?.full_name) return item.author.full_name;
    return 'Member';
  }, [isActivity, item.author?.full_name]);

  const sanitizedBody = useMemo(() => {
    // Check if content looks like HTML
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

  if (isActivity) {
    // Activity post styling - centered, subtle
    const actionLabel = item.action_name ? ACTION_LABELS[item.action_name] || item.action_name : 'Credits';
    
    return (
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-xs text-muted-foreground">
          <Activity className="h-3 w-3 text-accent" />
          <span className="font-medium text-foreground">{authorName}</span>
          <span>earned</span>
          <span className="font-semibold text-accent">+{item.credits_amount} ©</span>
          <span>—</span>
          <span>{actionLabel}</span>
        </div>
      </div>
    );
  }

  // Chat message styling
  return (
    <div className={cn(
      "flex gap-2",
      isOwnMessage ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3 py-2",
        isOwnMessage 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted rounded-bl-md"
      )}>
        {!isOwnMessage && (
          <div className="flex items-center gap-1.5 mb-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className={cn(
              "text-xs font-medium",
              isCompact ? "text-[10px]" : "text-xs"
            )}>
              {authorName}
            </span>
          </div>
        )}
        <div 
          className={cn(
            "prose prose-sm max-w-none break-words",
            isOwnMessage ? "prose-invert" : "",
            isCompact ? "text-sm" : "text-sm"
          )}
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
        <div className={cn(
          "text-right mt-1",
          isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span className={cn(
            isCompact ? "text-[9px]" : "text-[10px]"
          )}>
            {timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}
