import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface HavenUpdate {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  learn_more_url: string | null;
}

export function HavenUpdates() {
  const [update, setUpdate] = useState<HavenUpdate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpdate = async () => {
      const { data, error } = await supabase
        .from('haven_updates')
        .select('id, title, description, image_url, learn_more_url')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setUpdate(data);
      }
      setLoading(false);
    };

    fetchUpdate();
  }, []);

  // Don't render anything if no active update
  if (loading || !update) {
    return null;
  }

  return (
    <Card className="haven-card border-0 mb-8 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
          Haven Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {update.image_url && (
          <div className="w-full rounded-xl overflow-hidden">
            <img
              src={update.image_url}
              alt={update.title}
              className="w-full h-48 md:h-64 object-cover"
            />
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{update.title}</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {update.description}
          </p>
        </div>
        {update.learn_more_url && (
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={() => window.open(update.learn_more_url!, '_blank')}
          >
            Learn More
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
