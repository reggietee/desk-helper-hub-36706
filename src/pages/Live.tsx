import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Video, Clock, Play, Lock } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInMinutes } from 'date-fns';
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

export default function Live() {
  const navigate = useNavigate();
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { isGuest, loading: roleLoading } = useUserRole(userId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (userId && !roleLoading) {
      fetchActiveLivestream();
    }
  }, [userId, roleLoading]);

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
      console.error('Error:', err);
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

  // Calculate countdown
  const countdown = useMemo(() => {
    if (!livestream?.starts_at || livestream.status !== 'scheduled') return null;
    
    const startDate = new Date(livestream.starts_at);
    if (isPast(startDate)) return 'Starting soon...';
    
    const minutes = differenceInMinutes(startDate, new Date());
    if (minutes < 60) return `Starts in ${minutes} minutes`;
    
    return `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`;
  }, [livestream?.starts_at, livestream?.status]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Guest restriction
  if (isGuest) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-6 py-12">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Members Only</h1>
            <p className="text-muted-foreground mb-6">
              This livestream is available exclusively to Haven Members.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // No active livestream
  if (!livestream) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-6 py-12">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-4">No Active Livestream</h1>
            <p className="text-muted-foreground mb-6">
              There's no livestream scheduled or live right now. Check back later!
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const statusBadge = {
    scheduled: { className: 'bg-amber-500/10 text-amber-600 border-amber-200', label: 'Scheduled' },
    live: { className: 'bg-red-500/10 text-red-600 border-red-200 animate-pulse', label: '● LIVE' },
    ended: { className: 'bg-muted text-muted-foreground', label: 'Ended' },
    draft: { className: 'bg-muted text-muted-foreground', label: 'Draft' },
  }[livestream.status];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Title and description */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Video className="h-8 w-8 text-red-500" />
              {livestream.title}
            </h1>
            {livestream.description && (
              <p className="text-muted-foreground mt-2 text-lg">{livestream.description}</p>
            )}
          </div>

          {/* Countdown for scheduled */}
          {countdown && livestream.status === 'scheduled' && (
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-lg p-4">
              <Clock className="h-5 w-5" />
              <span className="text-lg">{countdown}</span>
            </div>
          )}

          {/* Video player */}
          {livestream.status === 'live' && (sanitizedEmbed || livestream.player_url) && (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl">
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

          {/* Scheduled placeholder */}
          {livestream.status === 'scheduled' && (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center shadow-lg">
              <Play className="h-24 w-24 text-muted-foreground/50 mb-6" />
              <p className="text-xl text-muted-foreground font-medium">Stream will appear here when live</p>
              {livestream.starts_at && (
                <p className="text-muted-foreground/70 mt-3">
                  {new Date(livestream.starts_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          )}

          {/* Replay link */}
          {livestream.replay_url && (
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => window.open(livestream.replay_url!, '_blank')}
            >
              Watch Replay
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
