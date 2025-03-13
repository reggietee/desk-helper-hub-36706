
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/booking/DatePicker';
import { TimePicker } from '@/components/booking/TimePicker';
import { AnimatedTransition } from '@/components/ui/AnimatedTransition';
import { spaces, addBooking } from '@/lib/data';
import { Space, TimeSlot } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BookingDetails = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    // Find the space with the matching ID
    const foundSpace = spaces.find(s => s.id === spaceId);
    if (foundSpace) {
      setSpace(foundSpace);
    } else {
      // Redirect to the main booking page if the space is not found
      navigate('/booking');
      toast.error('Space not found');
    }
  }, [spaceId, navigate]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value);
    if (e.target.value && !validateEmail(e.target.value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleBooking = async () => {
    if (!space || !selectedDate || !selectedTimeSlot) {
      toast.error('Please select both date and time');
      return;
    }

    if (space.type === 'hot-desk' && !userEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (emailError) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const booking = addBooking({
        spaceId: space.id,
        spaceName: space.name,
        spaceType: space.type,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timeSlot: {
          start: selectedTimeSlot.start,
          end: selectedTimeSlot.end
        },
        userEmail: userEmail || undefined
      });
      
      // For hot-desk, send to Stripe payment
      if (space.type === 'hot-desk') {
        // Send email with booking details to admin
        const emailDetails = {
          to: 'reggie@storymode.co',
          subject: 'New Hot Desk Booking',
          body: `
            New booking details:
            - Space: ${booking.spaceName} (${booking.spaceType})
            - Date: ${format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
            - Time: ${booking.timeSlot.start} - ${booking.timeSlot.end}
            - User Email: ${userEmail}
            - Booking ID: ${booking.id}
          `
        };
        
        await sendEmail(emailDetails);
        
        // Redirect to Stripe
        window.location.href = 'https://buy.stripe.com/8wM16kexfaO74Eg144';
      } else {
        // For other space types, navigate to confirmation page
        navigate(`/confirmation/${booking.id}`);
        toast.success('Booking created successfully');
      }
    } catch (error) {
      toast.error('Failed to create booking');
      console.error(error);
    }
  };

  if (!space) {
    return <div className="page-container">Loading...</div>;
  }

  return (
    <AnimatedTransition className="page-container">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 text-gray-600 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Space Info */}
          <div>
            <div className="relative aspect-video rounded-xl overflow-hidden mb-6 card-shadow">
              <div 
                className={cn(
                  "absolute inset-0 bg-gray-200 transition-opacity duration-300",
                  isImageLoaded ? "opacity-0" : "opacity-100"
                )}
              />
              <img
                src={space.image}
                alt={space.name}
                className={cn(
                  "h-full w-full object-cover transition-all duration-700",
                  isImageLoaded ? "scale-100 opacity-100" : "scale-105 opacity-0"
                )}
                onLoad={() => setIsImageLoaded(true)}
              />
            </div>

            <h1 className="text-3xl font-bold">{space.name}</h1>
            <p className="text-sm inline-block px-2 py-1 bg-gray-100 rounded-full mt-2">
              {space.type === 'hot-desk' ? 'Hot Desk' : space.type === 'meeting-room' ? 'Meeting Room' : 'Call Room'}
            </p>

            <p className="mt-4 text-gray-600">{space.description}</p>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{space.capacity} {space.capacity === 1 ? 'person' : 'people'}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>${space.pricePerHour}/hour</span>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Amenities</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                {space.amenities.map((amenity, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-primary rounded-full mr-2" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:pl-8">
            <Card className="mb-8">
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Book {space.name}</h2>

                <DatePicker
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  className="mb-8"
                />

                <TimePicker
                  selectedDate={selectedDate}
                  spaceId={space.id}
                  selectedTimeSlot={selectedTimeSlot}
                  onTimeSelect={setSelectedTimeSlot}
                />
                
                {space.type === 'hot-desk' && (
                  <div className="mt-6">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={userEmail}
                      onChange={handleEmailChange}
                      className={emailError ? "border-red-300" : ""}
                    />
                    {emailError && (
                      <p className="text-red-500 text-sm mt-1">{emailError}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Summary</h3>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Space</span>
                    <span className="font-medium">{space.name}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">
                      {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium">
                      {selectedTimeSlot ? `${selectedTimeSlot.start} - ${selectedTimeSlot.end}` : '-'}
                    </span>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Price</span>
                      <span className="font-semibold">
                        ${selectedTimeSlot ? space.pricePerHour : 0}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full mt-6"
                  onClick={handleBooking}
                  disabled={!selectedDate || !selectedTimeSlot || (space.type === 'hot-desk' && (!userEmail || !!emailError))}
                >
                  {space.type === 'hot-desk' ? 'Proceed to Payment' : 'Complete Booking'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AnimatedTransition>
  );
};

export default BookingDetails;
