import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function BookPrivateOffice() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('half');
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
    
    if (!date || !startTime) {
      toast.error('Please select a date and start time');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('private_office_bookings')
        .insert({
          user_id: userId,
          user_name: userName,
          booking_date: format(date, 'yyyy-MM-dd'),
          payment_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'private_office',
          data: {
            user_name: userName,
            date: format(date, 'PPP'),
            start_time: startTime,
            duration: duration === 'half' ? 'Half Day (4 hours)' : 'Full Day (8 hours)',
          },
        },
      });

      toast.success('Your private office booking request has been submitted for approval.');
      
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
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
            <CardTitle className="text-3xl font-heading font-bold text-foreground">Book Private Office</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Reserve the private office for a full day
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
                <Label className="text-sm font-semibold text-foreground">Booking Date</Label>
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
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <Label htmlFor="time" className="text-sm font-semibold text-foreground">Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
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

              <div className="space-y-4">
                <Label className="text-sm font-semibold text-foreground">Duration</Label>
                <RadioGroup value={duration} onValueChange={setDuration} className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 rounded-xl border-2 border-border hover:border-accent transition-colors cursor-pointer">
                    <RadioGroupItem value="half" id="half" className="text-accent" />
                    <Label htmlFor="half" className="font-medium cursor-pointer flex-1">
                      Half Day (4 hours)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-xl border-2 border-border hover:border-accent transition-colors cursor-pointer">
                    <RadioGroupItem value="full" id="full" className="text-accent" />
                    <Label htmlFor="full" className="font-medium cursor-pointer flex-1">
                      Full Day (8 hours)
                    </Label>
                  </div>
                </RadioGroup>
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
