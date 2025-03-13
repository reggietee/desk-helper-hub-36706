
import { Space, Booking, TimeSlot } from './types';

export const spaces: Space[] = [
  {
    id: 'hot-desk-1',
    name: 'Hot Desk',
    type: 'hot-desk',
    description: 'Flexible workspace in our open-plan area. Perfect for individual work.',
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=1000&auto=format&fit=crop',
    capacity: 1,
    pricePerHour: 5,
    amenities: ['High-speed WiFi', 'Power outlets', 'Standing desk option', 'Natural lighting']
  },
  {
    id: 'meeting-room-1',
    name: 'Boardroom',
    type: 'meeting-room',
    description: 'Professional meeting room with video conferencing equipment for team meetings.',
    image: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?q=80&w=1000&auto=format&fit=crop',
    capacity: 8,
    pricePerHour: 25,
    amenities: ['4K display', 'Video conferencing', 'Whiteboard', 'Water service']
  },
  {
    id: 'call-room-1',
    name: 'Phone Booth',
    type: 'call-room',
    description: 'Private, sound-insulated space for calls and virtual meetings.',
    image: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?q=80&w=1000&auto=format&fit=crop',
    capacity: 1,
    pricePerHour: 10,
    amenities: ['Sound insulation', 'Video call setup', 'Power outlets', 'Adjustable lighting']
  }
];

export const timeSlots: TimeSlot[] = [
  { start: '09:00', end: '10:00', available: true },
  { start: '10:00', end: '11:00', available: true },
  { start: '11:00', end: '12:00', available: true },
  { start: '12:00', end: '13:00', available: true },
  { start: '13:00', end: '14:00', available: true },
  { start: '14:00', end: '15:00', available: true },
  { start: '15:00', end: '16:00', available: true },
  { start: '16:00', end: '17:00', available: true },
  { start: '17:00', end: '18:00', available: true }
];

export const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    spaceId: 'meeting-room-1',
    spaceName: 'Boardroom',
    spaceType: 'meeting-room',
    date: '2023-06-15',
    timeSlot: {
      start: '10:00',
      end: '12:00'
    },
    createdAt: '2023-06-10T14:30:00Z',
    status: 'confirmed'
  },
  {
    id: 'booking-2',
    spaceId: 'hot-desk-1',
    spaceName: 'Hot Desk',
    spaceType: 'hot-desk',
    date: '2023-06-16',
    timeSlot: {
      start: '09:00',
      end: '17:00'
    },
    createdAt: '2023-06-12T09:15:00Z',
    status: 'confirmed'
  }
];

// Function to generate available time slots for a specific date
export const getAvailableTimeSlots = (date: string, spaceId: string): TimeSlot[] => {
  const bookingsOnDate = mockBookings.filter(
    booking => booking.date === date && booking.spaceId === spaceId && booking.status === 'confirmed'
  );
  
  return timeSlots.map(slot => {
    const isBooked = bookingsOnDate.some(
      booking => 
        booking.timeSlot.start <= slot.start && 
        booking.timeSlot.end > slot.start
    );
    
    return {
      ...slot,
      available: !isBooked
    };
  });
};

export const addBooking = (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>): Booking => {
  const newBooking: Booking = {
    ...booking,
    id: `booking-${mockBookings.length + 1}`,
    createdAt: new Date().toISOString(),
    status: 'confirmed'
  };
  
  // In a real app, we would save this to a database
  // mockBookings.push(newBooking);
  
  return newBooking;
};
