import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const items = [
  { value: 'TV', label: 'TV (2 hours)' },
  { value: 'Whiteboard', label: 'Whiteboard (2 hours)' },
  { value: 'Book from library', label: 'Book from library (5 days)' },
];

export default function SignProductOut() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
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
    
    if (!selectedItem || !date || !time) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('product_signouts')
        .insert({
          user_id: userId,
          user_name: userName,
          item_type: selectedItem,
          checkout_time: date.toISOString(),
        });

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'product_signout',
          data: {
            user_name: userName,
            item_type: selectedItem,
            date: format(date, 'PPP'),
            time: time,
          },
        },
      });

      toast.success('Your equipment checkout request has been submitted for approval.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out product');
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
            <CardTitle className="text-3xl font-heading font-bold text-foreground">Equipment Checkout</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Request to borrow shared equipment for your workspace
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
                <Label htmlFor="item" className="text-sm font-semibold text-foreground">Select Item</Label>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="h-12 rounded-xl border-2">
                    <SelectValue placeholder="Choose an item" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Checkout Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-12 justify-start text-left font-normal rounded-xl border-2',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="pointer-events-auto rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <Label htmlFor="time" className="text-sm font-semibold text-foreground">Checkout Time</Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger className="h-12 rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {`${hour}:00`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
