import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  allow_guests: boolean;
}

interface UseLivestreamWithGuestResult {
  livestream: Livestream | null;
  loading: boolean;
  shouldReplaceDashboard: boolean;
  hasActiveLivestream: boolean;
  shouldShowWatchNow: boolean;
  canGuestWatch: boolean;
  refetch: () => Promise<void>;
}

export function useLivestreamWithGuest(isGuest: boolean): UseLivestreamWithGuestResult {
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveLivestream = useCallback(async () => {
    try {
      // For guests, try the guest-specific function first
      if (isGuest) {
        const { data, error } = await supabase.rpc('get_active_livestream_for_guests');
        
        if (error) {
          console.error('Error fetching livestream for guest:', error);
          setLivestream(null);
        } else if (data && data.length > 0) {
          setLivestream(data[0] as Livestream);
        } else {
          setLivestream(null);
        }
      } else {
        // For members/admins, use the regular function
        const { data, error } = await supabase.rpc('get_active_livestream');
        
        if (error) {
          console.error('Error fetching livestream:', error);
          setLivestream(null);
        } else if (data && data.length > 0) {
          setLivestream(data[0] as Livestream);
        } else {
          setLivestream(null);
        }
      }
    } catch (err) {
      console.error('Error in useLivestreamWithGuest:', err);
      setLivestream(null);
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    fetchActiveLivestream();

    // Poll every 30 seconds to catch status changes
    const interval = setInterval(fetchActiveLivestream, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveLivestream]);

  const hasActiveLivestream = 
    livestream !== null && 
    (livestream.status === 'scheduled' || livestream.status === 'live');

  const shouldReplaceDashboard = 
    hasActiveLivestream && 
    livestream?.replace_haven_updates === true;

  // Show "Watch Now" button when:
  // 1. There's an active livestream
  // 2. replace_haven_updates is FALSE (not embedded in dashboard)
  // 3. User has permission (member/admin, or guest if allow_guests is true)
  const shouldShowWatchNow = 
    hasActiveLivestream && 
    !livestream?.replace_haven_updates;

  const canGuestWatch = 
    hasActiveLivestream && 
    livestream?.allow_guests === true;

  return {
    livestream,
    loading,
    shouldReplaceDashboard,
    hasActiveLivestream,
    shouldShowWatchNow,
    canGuestWatch,
    refetch: fetchActiveLivestream,
  };
}
