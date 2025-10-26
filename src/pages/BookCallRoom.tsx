import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addHours, isBefore } from 'date-fns';
import { CalendarIcon, ArrowLeft, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BookCallRoom() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
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
    
    if (!date || !time) {
      toast.error('Please select a date and time');
      return;
    }

    // Validate 3-hour advance booking
    const minBookingTime = addHours(new Date(), 3);
    if (isBefore(date, minBookingTime)) {
      toast.error('Bookings must be made at least 3 hours in advance');
      return;
    }

    setLoading(true);

    try {
      // Check daily booking limit (max 2 per day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: existingBookings, error: checkError } = await supabase
        .from('call_room_bookings')
        .select('id')
        .eq('user_id', userId)
        .gte('booking_time', startOfDay.toISOString())
        .lte('booking_time', endOfDay.toISOString());

      if (checkError) throw checkError;

      if (existingBookings && existingBookings.length >= 2) {
        toast.error('You can only book the call room twice per day');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('call_room_bookings')
        .insert({
          user_id: userId,
          user_name: userName,
          booking_time: date.toISOString(),
        });

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'call_room',
          data: {
            user_name: userName,
            date: format(date, 'PPP'),
            time: time,
          },
        },
      });

      toast.success('Call room booked successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to book call room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Book Call Room</CardTitle>
            <CardDescription>
              Reserve the call room for private calls (1 hour max, up to 2 bookings per day)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Bookings must be made at least 3 hours in advance. Maximum 2 bookings per day.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{userName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Booking Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Booking Time</Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                {loading ? 'Booking...' : 'Book Call Room'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
