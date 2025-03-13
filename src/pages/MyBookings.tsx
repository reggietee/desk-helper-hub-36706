
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, Building, ChevronRight, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatedTransition } from '@/components/ui/AnimatedTransition';
import { mockBookings } from '@/lib/data';
import { Booking } from '@/lib/types';
import { cn } from '@/lib/utils';

const MyBookings = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Filter and sort bookings
  const upcomingBookings = mockBookings
    .filter(booking => booking.status === 'confirmed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const pastBookings = mockBookings
    .filter(booking => booking.status === 'completed' || booking.status === 'cancelled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Search functionality
  const filteredUpcoming = upcomingBookings.filter(booking => 
    booking.spaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.spaceType.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredPast = pastBookings.filter(booking => 
    booking.spaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.spaceType.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <AnimatedTransition className="page-container">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-gray-600 mt-2">Manage your upcoming and past bookings</p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bookings..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button variant="outline" className="sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        
        <Tabs 
          defaultValue="upcoming" 
          className="mt-8"
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="mt-6">
            {filteredUpcoming.length > 0 ? (
              <div className="space-y-4">
                {filteredUpcoming.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <EmptyState 
                message={
                  searchQuery 
                    ? "No matches found for your search" 
                    : "You don't have any upcoming bookings"
                }
                buttonText="Book a Space"
                buttonLink="/booking"
              />
            )}
          </TabsContent>
          
          <TabsContent value="past" className="mt-6">
            {filteredPast.length > 0 ? (
              <div className="space-y-4">
                {filteredPast.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <EmptyState 
                message={
                  searchQuery 
                    ? "No matches found for your search" 
                    : "You don't have any past bookings"
                }
                hideButton={activeTab === 'past' && !searchQuery}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedTransition>
  );
};

interface BookingCardProps {
  booking: Booking;
}

function BookingCard({ booking }: BookingCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{booking.spaceName}</h3>
            <p className="text-sm text-gray-500 capitalize mt-1">
              {booking.spaceType.replace('-', ' ')}
            </p>
          </div>
          
          <StatusBadge status={booking.status} />
        </div>
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            {format(new Date(booking.date), 'EEE, MMM d, yyyy')}
          </div>
          
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2 text-gray-400" />
            {booking.timeSlot.start} - {booking.timeSlot.end}
          </div>
          
          <div className="flex items-center text-gray-600">
            <Building className="h-4 w-4 mr-2 text-gray-400" />
            CoWork Main Office
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <div className="text-sm">
            <span className="text-gray-500">Booked on:</span>{' '}
            <span>{format(new Date(booking.createdAt), 'MMM d, yyyy')}</span>
          </div>
          
          <Link
            to={`/confirmation/${booking.id}`}
            className="text-sm font-medium text-primary flex items-center"
          >
            View details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span 
      className={cn(
        "inline-block px-2 py-1 rounded-full text-xs font-medium",
        status === 'confirmed' && "bg-green-100 text-green-800",
        status === 'cancelled' && "bg-red-100 text-red-800",
        status === 'completed' && "bg-gray-100 text-gray-800"
      )}
    >
      {status}
    </span>
  );
}

interface EmptyStateProps {
  message: string;
  buttonText?: string;
  buttonLink?: string;
  hideButton?: boolean;
}

function EmptyState({ message, buttonText = "Book Now", buttonLink = "/booking", hideButton = false }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <Calendar className="h-16 w-16 mx-auto text-gray-300" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">{message}</h3>
      
      {!hideButton && (
        <div className="mt-6">
          <Button asChild>
            <Link to={buttonLink}>{buttonText}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default MyBookings;
