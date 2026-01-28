import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import DOMPurify from 'dompurify';

interface HavenUpdate {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  learn_more_url: string | null;
}

interface HavenUpdatesProps {
  onVisibilityChange?: (hasUpdate: boolean) => void;
}

export function HavenUpdates({ onVisibilityChange }: HavenUpdatesProps) {
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

  // Notify parent about visibility changes
  useEffect(() => {
    if (!loading) {
      onVisibilityChange?.(!!update);
    }
  }, [loading, update, onVisibilityChange]);

  // Sanitize HTML content for safe rendering
  const sanitizedDescription = useMemo(() => {
    if (!update?.description) return '';
    
    // Check if content looks like HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(update.description);
    
    if (isHtml) {
      // Sanitize HTML content
      return DOMPurify.sanitize(update.description, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
    } else {
      // Plain text - convert newlines to <br> for backward compatibility
      return update.description
        .split('\n')
        .map(line => DOMPurify.sanitize(line))
        .join('<br>');
    }
  }, [update?.description]);

  // Don't render anything if no active update
  if (loading || !update) {
    return null;
  }

  return (
    <Card className="haven-card border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
          Haven Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
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
          <div 
            className="prose prose-sm max-w-none text-muted-foreground leading-relaxed
              prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
              prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0
              prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80
              prose-strong:text-foreground prose-em:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
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
