
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, Download, Calendar, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedTransition } from '@/components/ui/AnimatedTransition';
import { mockBookings, spaces } from '@/lib/data';
import { Booking } from '@/lib/types';
import { toast } from 'sonner';

const Confirmation = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [space, setSpace] = useState<any>(null);

  useEffect(() => {
    // In a real app, this would fetch the booking from an API
    const foundBooking = mockBookings.find(b => b.id === bookingId);
    
    if (foundBooking) {
      setBooking(foundBooking);
      
      // Find the associated space
      const foundSpace = spaces.find(s => s.id === foundBooking.spaceId);
      if (foundSpace) {
        setSpace(foundSpace);
      }
    } else {
      navigate('/booking');
      toast.error('Booking not found');
    }
  }, [bookingId, navigate]);

  const handleDownload = () => {
    toast.success('Booking details downloaded');
  };

  const handleAddToCalendar = () => {
    toast.success('Added to calendar');
  };

  const handleShare = () => {
    toast.success('Share link copied to clipboard');
  };

  if (!booking || !space) {
    return <div className="page-container">Loading...</div>;
  }

  return (
    <AnimatedTransition className="page-container">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold">Booking Confirmed!</h1>
        <p className="text-gray-600 mt-3">
          Your booking has been confirmed. We're looking forward to seeing you.
        </p>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <Card className="overflow-hidden">
          <div className="bg-primary px-6 py-8 text-white">
            <h2 className="text-xl font-semibold">Booking Details</h2>
            <p className="opacity-80 text-sm mt-1">Confirmation #{booking.id}</p>
          </div>
          
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Space Information</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="block text-gray-500">Space</span>
                    <span className="font-medium">{booking.spaceName}</span>
                  </div>
                  
                  <div>
                    <span className="block text-gray-500">Type</span>
                    <span className="font-medium capitalize">
                      {booking.spaceType.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-gray-500">Capacity</span>
                    <span className="font-medium">
                      {space.capacity} {space.capacity === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-gray-500">Price</span>
                    <span className="font-medium">${space.pricePerHour}/hour</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Booking Information</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="block text-gray-500">Date</span>
                    <span className="font-medium">
                      {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-gray-500">Time</span>
                    <span className="font-medium">
                      {booking.timeSlot.start} - {booking.timeSlot.end}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-gray-500">Status</span>
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium mt-1">
                      {booking.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleAddToCalendar}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Add to Calendar
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-8">
          <div className="space-x-4">
            <Button variant="link" asChild>
              <Link to="/my-bookings">View My Bookings</Link>
            </Button>
            <Button variant="link" asChild>
              <Link to="/booking">Book Another Space</Link>
            </Button>
          </div>
        </div>
      </div>
    </AnimatedTransition>
  );
};

export default Confirmation;
