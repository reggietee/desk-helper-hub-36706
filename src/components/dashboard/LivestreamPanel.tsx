import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, ExternalLink, Clock, Play } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInMinutes } from 'date-fns';
import DOMPurify from 'dompurify';

interface Livestream {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  status: 'draft' | 'scheduled' | 'live' | 'ended';
  player_embed_html: string | null;
  player_url: string | null;
  replace_haven_updates: boolean;
  replay_url: string | null;
}

interface LivestreamPanelProps {
  /** Full panel mode (replaces Haven Updates) */
  mode?: 'full' | 'compact';
  /** Callback when livestream availability changes */
  onLivestreamChange?: (livestream: Livestream | null) => void;
}

export function LivestreamPanel({ mode = 'full', onLivestreamChange }: LivestreamPanelProps) {
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveLivestream();
  }, []);

  useEffect(() => {
    onLivestreamChange?.(livestream);
  }, [livestream, onLivestreamChange]);

  const fetchActiveLivestream = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_livestream');
      
      if (error) {
        console.error('Error fetching livestream:', error);
        setLivestream(null);
      } else if (data && data.length > 0) {
        setLivestream(data[0] as Livestream);
      } else {
        setLivestream(null);
      }
    } catch (err) {
      console.error('Error in fetchActiveLivestream:', err);
      setLivestream(null);
    } finally {
      setLoading(false);
    }
  };

  // Sanitize embed HTML
  const sanitizedEmbed = useMemo(() => {
    if (!livestream?.player_embed_html) return null;
    
    return DOMPurify.sanitize(livestream.player_embed_html, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height'],
    });
  }, [livestream?.player_embed_html]);

  // Calculate countdown for scheduled streams
  const countdown = useMemo(() => {
    if (!livestream?.starts_at || livestream.status !== 'scheduled') return null;
    
    const startDate = new Date(livestream.starts_at);
    if (isPast(startDate)) return 'Starting soon...';
    
    const minutes = differenceInMinutes(startDate, new Date());
    if (minutes < 60) return `Starts in ${minutes} minutes`;
    
    return `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`;
  }, [livestream?.starts_at, livestream?.status]);

  if (loading) {
    return null;
  }

  if (!livestream) {
    return null;
  }

  const statusBadge = {
    scheduled: { className: 'bg-amber-500/10 text-amber-600 border-amber-200', label: 'Scheduled' },
    live: { className: 'bg-red-500/10 text-red-600 border-red-200 animate-pulse', label: '● LIVE' },
    ended: { className: 'bg-muted text-muted-foreground', label: 'Ended' },
    draft: { className: 'bg-muted text-muted-foreground', label: 'Draft' },
  }[livestream.status];

  // Compact mode - just a button to watch
  if (mode === 'compact') {
    return (
      <Button
        variant="default"
        size="sm"
        className="gap-2 bg-red-600 hover:bg-red-700"
        onClick={() => window.open('/live', '_blank')}
      >
        <Video className="h-4 w-4" />
        {livestream.status === 'live' ? 'Watch Live' : 'View Stream'}
      </Button>
    );
  }

  // Full panel mode
  return (
    <Card className="haven-card border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            {livestream.title}
          </CardTitle>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
        {livestream.description && (
          <p className="text-sm text-muted-foreground mt-2">{livestream.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {/* Countdown for scheduled streams */}
        {countdown && livestream.status === 'scheduled' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Clock className="h-4 w-4" />
            <span>{countdown}</span>
          </div>
        )}

        {/* Video player embed */}
        {livestream.status === 'live' && (sanitizedEmbed || livestream.player_url) && (
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
            {sanitizedEmbed ? (
              <div 
                className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                dangerouslySetInnerHTML={{ __html: sanitizedEmbed }} 
              />
            ) : livestream.player_url ? (
              <iframe
                src={livestream.player_url}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : null}
          </div>
        )}

        {/* Scheduled - show placeholder */}
        {livestream.status === 'scheduled' && (
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center">
            <Play className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">Stream will appear here when live</p>
            {livestream.starts_at && (
              <p className="text-sm text-muted-foreground/70 mt-2">
                {new Date(livestream.starts_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        )}

        {/* Replay link if stream ended */}
        {livestream.status === 'ended' && livestream.replay_url && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open(livestream.replay_url!, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Watch Replay
          </Button>
        )}

        {/* Open in new window button (for non-replace mode) */}
        {!livestream.replace_haven_updates && (
          <Button
            variant="secondary"
            className="gap-2 w-full"
            onClick={() => window.open('/live', '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Open in Full Screen
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
