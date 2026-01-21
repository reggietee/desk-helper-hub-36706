import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const issueTypes = [
  'Request cleanup',
  'Issue with member',
  'Refill snacks',
  'Issue with coffee machine',
  'Other',
];

export default function SubmitIssue() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [issueType, setIssueType] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueType || !details) {
      toast.error('Please fill in all fields');
      return;
    }

    if (details.length > 1000) {
      toast.error('Details must be less than 1000 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('issues')
        .insert({
          user_id: userId,
          user_name: userName,
          issue_type: issueType,
          details: details.trim(),
          status: 'open',
        });

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'issue',
          data: {
            user_name: userName,
            issue_type: issueType,
            details: details,
          },
        },
      });

      toast.success('Issue submitted successfully! We will look into it.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <Card className="haven-card border-0">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-heading font-bold text-foreground">Submit an Issue</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Report an issue or request maintenance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Your Name</Label>
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-base font-medium">{userName}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="issue-type" className="text-sm font-semibold text-foreground">Issue Type</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger className="h-12 rounded-xl border-2">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {issueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="details" className="text-sm font-semibold text-foreground">Details</Label>
                <Textarea
                  id="details"
                  placeholder="Please describe the issue in detail..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={6}
                  maxLength={1000}
                  required
                  className="rounded-xl border-2 focus:ring-accent resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {details.length}/1000 characters
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading} size="lg">
                {loading ? 'Submitting...' : 'Submit Issue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
