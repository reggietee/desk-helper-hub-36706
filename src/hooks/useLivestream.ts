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
}

interface UseLivestreamResult {
  livestream: Livestream | null;
  loading: boolean;
  shouldReplaceDashboard: boolean;
  hasActiveLivestream: boolean;
  refetch: () => Promise<void>;
}

export function useLivestream(): UseLivestreamResult {
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveLivestream = useCallback(async () => {
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
      console.error('Error in useLivestream:', err);
      setLivestream(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveLivestream();

    // Poll every 30 seconds to catch status changes
    const interval = setInterval(fetchActiveLivestream, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveLivestream]);

  const shouldReplaceDashboard = 
    livestream !== null && 
    livestream.replace_haven_updates && 
    (livestream.status === 'scheduled' || livestream.status === 'live');

  const hasActiveLivestream = 
    livestream !== null && 
    (livestream.status === 'scheduled' || livestream.status === 'live');

  return {
    livestream,
    loading,
    shouldReplaceDashboard,
    hasActiveLivestream,
    refetch: fetchActiveLivestream,
  };
}
