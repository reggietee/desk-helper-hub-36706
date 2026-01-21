import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Rocket } from 'lucide-react';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <Badge className="mx-auto mb-4 w-fit" variant="secondary">
              Coming Soon
            </Badge>
            <CardTitle className="text-3xl">Feature Under Development</CardTitle>
            <CardDescription className="text-lg mt-4">
              We're working hard to bring you this exciting new feature. Stay tuned for updates!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} size="lg">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
