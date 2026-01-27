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
    } | null;
  };
  currentUserId: string;
}

const ACTION_LABELS: Record<string, string> = {
  daily_checkin: 'Daily check-in',
  weekly_streak_bonus: '5-day streak bonus',
  weekly_planning: 'Weekly planning',
  admin_adjustment: 'Admin adjustment',
};

export function FeedItem({ item, currentUserId }: FeedItemProps) {
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
    const actionLabel = item.action_name ? ACTION_LABELS[item.action_name] || item.action_name : 'Credits';
    
    return (
      <div className="flex justify-center py-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-[11px] text-muted-foreground">
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

  // Chat message styling - inspired by reference
  return (
    <div className={cn(
      "flex flex-col gap-0.5",
      isOwnMessage ? "items-end" : "items-start"
    )}>
      {/* Sender name + timestamp header (only for other users' messages) */}
      {!isOwnMessage && (
        <div className="flex items-center gap-1.5 px-1 mb-0.5">
          <span className="text-[11px] font-medium text-foreground">
            {authorName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            · {timestamp}
          </span>
        </div>
      )}
      
      {/* Message bubble */}
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3 py-1.5",
        isOwnMessage 
          ? "bg-primary text-primary-foreground rounded-br-sm" 
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
      
      {/* Timestamp for own messages (below bubble, right-aligned) */}
      {isOwnMessage && (
        <span className="text-[10px] text-muted-foreground px-1 mt-0.5">
          {timestamp}
        </span>
      )}
    </div>
  );
}
