
export type SpaceType = 'hot-desk' | 'meeting-room' | 'call-room';

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  description: string;
  image: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface Booking {
  id: string;
  spaceId: string;
  spaceName: string;
  spaceType: SpaceType;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  createdAt: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}
