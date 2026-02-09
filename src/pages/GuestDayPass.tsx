import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const timeSlots = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM'
];

export default function GuestDayPass() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [arrivalDate, setArrivalDate] = useState<Date>();
  const [arrivalTime, setArrivalTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
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

    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!arrivalDate || !arrivalTime || !guestName || !guestEmail || !guestPhone) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('guest_day_pass_requests')
        .insert({
          user_id: userId,
          user_name: userName,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          arrival_date: format(arrivalDate, 'yyyy-MM-dd'),
          arrival_time: arrivalTime,
        });

      if (insertError) throw insertError;

      // Send email notification
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'guest_day_pass',
          data: {
            user_name: userName,
            guest_name: guestName,
            guest_email: guestEmail,
            guest_phone: guestPhone,
            date: format(arrivalDate, 'PPP'),
            time: arrivalTime,
          }
        }
      });

      toast.success("Your guest day pass request has been submitted for approval.");

      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting guest day pass request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
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
        <Card className="haven-card border-0 mb-8 bg-accent/5">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl font-heading font-bold text-foreground">Day Pass Information</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              All members and guests can request day passes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                <span className="text-base">Monthly Members: 1 free guest pass per month</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                <span className="text-base">Annual Members: 2 free guest passes per month</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="haven-card border-0">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-heading font-bold text-foreground">Request Day Pass</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Submit a request for a guest to visit the workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="userName" className="text-sm font-semibold text-foreground">Member Name</Label>
                <Input
                  id="userName"
                  value={userName}
                  disabled
                  className="bg-muted h-12 rounded-xl border-2"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="guestName" className="text-sm font-semibold text-foreground">Guest's Full Name</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest's full name"
                  required
                  className="h-12 rounded-xl border-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="guestEmail" className="text-sm font-semibold text-foreground">Guest's Email</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="guest@example.com"
                  required
                  className="h-12 rounded-xl border-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="guestPhone" className="text-sm font-semibold text-foreground">Guest's Phone Number</Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                  className="h-12 rounded-xl border-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Arrival Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal rounded-xl border-2",
                        !arrivalDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {arrivalDate ? format(arrivalDate, "PPP") : "Select arrival date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl">
                    <Calendar
                      mode="single"
                      selected={arrivalDate}
                      onSelect={setArrivalDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <Label htmlFor="arrivalTime" className="text-sm font-semibold text-foreground">Arrival Time</Label>
                <Select value={arrivalTime} onValueChange={setArrivalTime}>
                  <SelectTrigger className="h-12 rounded-xl border-2">
                    <SelectValue placeholder="Select arrival time" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}