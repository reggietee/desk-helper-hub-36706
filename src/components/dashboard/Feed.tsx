import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedInput } from './FeedInput';
import { FeedItem } from './FeedItem';

interface FeedItemData {
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
}

interface FeedProps {
  userId: string;
  userName: string;
}

const PAGE_SIZE = 20;

// Helper to fetch author names for feed items
async function fetchAuthorNames(items: { author_id: string | null }[]): Promise<Record<string, string>> {
  const authorIds = [...new Set(items.filter(d => d.author_id).map(d => d.author_id as string))];
  let authorMap: Record<string, string> = {};
  
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', authorIds);
    
    if (profiles) {
      authorMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p.full_name }), {} as Record<string, string>);
    }
  }
  
  return authorMap;
}

export function Feed({ userId, userName }: FeedProps) {
  const [items, setItems] = useState<FeedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial feed items
  const fetchInitialItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feed_items')
        .select('id, type, author_id, body, credits_amount, action_name, created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        console.error('[Feed] Error fetching items:', error);
        return;
      }

      // Fetch author names
      const authorMap = await fetchAuthorNames(data || []);

      // Map authors to items and reverse for chronological display
      const itemsWithAuthors = (data || []).map(item => ({
        ...item,
        type: item.type as 'chat' | 'activity',
        author: item.author_id ? { full_name: authorMap[item.author_id] || 'Member' } : null
      })).reverse();

      setItems(itemsWithAuthors);
      
      if (itemsWithAuthors.length > 0) {
        setOldestCursor(itemsWithAuthors[0].created_at);
      }
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch older items when scrolling up
  const fetchOlderItems = useCallback(async () => {
    if (!oldestCursor || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('feed_items')
        .select('id, type, author_id, body, credits_amount, action_name, created_at')
        .lt('created_at', oldestCursor)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        console.error('[Feed] Error fetching older items:', error);
        return;
      }

      if (data && data.length > 0) {
        // Fetch author names
        const authorMap = await fetchAuthorNames(data);

        // Map and reverse to maintain chronological order
        const olderItems = data.map(item => ({
          ...item,
          type: item.type as 'chat' | 'activity',
          author: item.author_id ? { full_name: authorMap[item.author_id] || 'Member' } : null
        })).reverse();

        setItems(prev => [...olderItems, ...prev]);
        setOldestCursor(olderItems[0].created_at);
        setHasMore(data.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [oldestCursor, loadingMore, hasMore]);

  // Handle scroll for infinite scroll up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Check if near the top (scrolled up)
    if (target.scrollTop < 100 && hasMore && !loadingMore) {
      fetchOlderItems();
    }
  }, [hasMore, loadingMore, fetchOlderItems]);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchInitialItems();

    const channel = supabase
      .channel('feed_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_items',
        },
        async (payload) => {
          // Fetch the complete item with author data
          const { data, error } = await supabase
            .from('feed_items')
            .select('id, type, author_id, body, credits_amount, action_name, created_at')
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            // Fetch author name if needed
            let author = null;
            if (data.author_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', data.author_id)
                .single();
              if (profile) {
                author = { full_name: profile.full_name };
              }
            }

            const newItem: FeedItemData = {
              ...data,
              type: data.type as 'chat' | 'activity',
              author
            };

            setItems(prev => [...prev, newItem]);
            // Scroll to bottom on new message
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialItems]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loading]);

  // Handle new message submission
  const handleSubmit = async (body: string) => {
    const { error } = await supabase.from('feed_items').insert({
      type: 'chat',
      author_id: userId,
      body: body.trim(),
    });

    if (error) {
      console.error('[Feed] Error posting message:', error);
      throw error;
    }
  };

  return (
    <Card className="haven-card border-0 flex flex-col h-full overflow-hidden">
      {/* Header - fixed height, never shrinks */}
      <CardHeader className="px-4 py-3 flex-shrink-0 border-b border-border/50">
        <CardTitle className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Feed
        </CardTitle>
      </CardHeader>
      
      {/* Content area - flex child that fills remaining space, min-h-0 is CRITICAL to allow shrinking */}
      <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden p-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Message list - ONLY scrollable region, min-h-0 allows flex shrinking */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1"
            >
              {/* Load more indicator */}
              {loadingMore && (
                <div className="flex justify-center py-1">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {hasMore && !loadingMore && items.length > 0 && (
                <div className="flex justify-center py-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchOlderItems}
                    className="text-xs text-muted-foreground h-7"
                  >
                    Load older messages
                  </Button>
                </div>
              )}

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <MessageSquare className="h-6 w-6 mb-2 opacity-50" />
                  <p className="text-xs">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                items.map((item) => (
                  <FeedItem 
                    key={item.id} 
                    item={item} 
                    currentUserId={userId}
                  />
                ))
              )}
            </div>

            {/* Composer - fixed at bottom, never shrinks */}
            <div className="flex-shrink-0 px-3 py-2 border-t border-border/50">
              <FeedInput onSubmit={handleSubmit} userName={userName} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
