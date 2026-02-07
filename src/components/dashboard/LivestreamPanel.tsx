import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Video, ExternalLink, Clock, Play, AlertTriangle, ChevronDown, Settings } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInMinutes, format } from 'date-fns';
import DOMPurify from 'dompurify';
import { useUserRole } from '@/hooks/useUserRole';

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
  /** Current user ID for admin detection */
  userId?: string;
}

export function LivestreamPanel({ mode = 'full', onLivestreamChange, userId }: LivestreamPanelProps) {
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [loading, setLoading] = useState(true);
  const [embedError, setEmbedError] = useState(false);
  const { isAdmin } = useUserRole(userId || null);

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

  // Check if we have a valid embed source
  const hasValidEmbed = !!(sanitizedEmbed || livestream?.player_url);
  const embedType = sanitizedEmbed ? 'html' : livestream?.player_url ? 'url' : 'none';

  // Get player URL host for diagnostics
  const playerUrlHost = useMemo(() => {
    if (!livestream?.player_url) return null;
    try {
      return new URL(livestream.player_url).host;
    } catch {
      return 'invalid-url';
    }
  }, [livestream?.player_url]);

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

  // Error/Warning UI for missing embed
  const renderEmbedError = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-xl p-6">
      <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
      <p className="text-foreground font-medium text-center mb-2">
        {isAdmin ? 'Stream embed not configured' : 'Stream will be available soon'}
      </p>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {isAdmin 
          ? 'Add a player embed HTML or player URL in the admin panel to display the stream.'
          : 'The stream is being set up. Please check back shortly.'}
      </p>
      
      {/* Admin diagnostics */}
      {isAdmin && (
        <Collapsible className="mt-4 w-full max-w-sm">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
              <Settings className="h-4 w-4" />
              Diagnostics
              <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
            <p><span className="font-medium">ID:</span> {livestream.id}</p>
            <p><span className="font-medium">Status:</span> {livestream.status}</p>
            <p><span className="font-medium">Embed type:</span> {embedType}</p>
            {playerUrlHost && <p><span className="font-medium">Player host:</span> {playerUrlHost}</p>}
            <p><span className="font-medium">Has embed HTML:</span> {livestream.player_embed_html ? 'Yes' : 'No'}</p>
            <p><span className="font-medium">Has player URL:</span> {livestream.player_url ? 'Yes' : 'No'}</p>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  // Player render error handler
  const renderPlayerError = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-xl p-6">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <p className="text-foreground font-medium text-center mb-2">
        Stream player couldn't load
      </p>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        There was an issue loading the stream. Please try refreshing the page.
      </p>
      
      {/* Admin diagnostics */}
      {isAdmin && (
        <Collapsible className="mt-4 w-full max-w-sm">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
              <Settings className="h-4 w-4" />
              Diagnostics
              <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
            <p><span className="font-medium">ID:</span> {livestream.id}</p>
            <p><span className="font-medium">Status:</span> {livestream.status}</p>
            <p><span className="font-medium">Embed type:</span> {embedType}</p>
            {playerUrlHost && <p><span className="font-medium">Player host:</span> {playerUrlHost}</p>}
            <p><span className="font-medium">Embed HTML length:</span> {livestream.player_embed_html?.length || 0}</p>
            {livestream.player_url && <p><span className="font-medium">Player URL:</span> {livestream.player_url}</p>}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  // Full panel mode
  return (
    <Card className="haven-card border-0 overflow-hidden">
      {/* Compact header - minimal chrome to maximize player area */}
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
            <Video className="h-4 w-4 text-destructive" />
            {livestream.title}
          </CardTitle>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
        {livestream.description && (
          <p className="text-xs text-muted-foreground mt-1">{livestream.description}</p>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Countdown for scheduled streams */}
        {countdown && livestream.status === 'scheduled' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-4 flex-shrink-0">
            <Clock className="h-4 w-4" />
            <span>{countdown}</span>
          </div>
        )}

        {/* Video player embed - LIVE status */}
        {livestream.status === 'live' && (
          <>
            {!hasValidEmbed ? (
              renderEmbedError()
            ) : embedError ? (
              renderPlayerError()
            ) : (
              <div className="flex-1 w-full rounded-xl overflow-hidden bg-black">
                {/* True 16:9 aspect ratio container */}
                <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                  {sanitizedEmbed ? (
                    <div 
                      className="absolute inset-0 w-full h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                      dangerouslySetInnerHTML={{ __html: sanitizedEmbed }}
                      onError={() => setEmbedError(true)}
                    />
                  ) : livestream.player_url ? (
                    <iframe
                      src={livestream.player_url}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onError={() => setEmbedError(true)}
                    />
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}

        {/* Scheduled - show placeholder with 16:9 aspect ratio */}
        {livestream.status === 'scheduled' && (
          <div className="w-full rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50" style={{ aspectRatio: '16 / 9' }}>
            <div className="w-full h-full flex flex-col items-center justify-center">
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
          </div>
        )}

        {/* Replay link if stream ended */}
        {livestream.status === 'ended' && livestream.replay_url && (
          <Button
            variant="outline"
            className="gap-2 flex-shrink-0 mt-auto"
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
            className="gap-2 w-full flex-shrink-0 mt-4"
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
