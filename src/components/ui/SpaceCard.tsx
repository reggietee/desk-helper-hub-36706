
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Space } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SpaceCardProps {
  space: Space;
}

export function SpaceCard({ space }: SpaceCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();
  
  const handleBook = () => {
    navigate(`/booking/${space.id}`);
  };
  
  return (
    <div className="group overflow-hidden rounded-xl card-shadow bg-white transition-all duration-300 hover:shadow-lg">
      <div className="relative aspect-video overflow-hidden">
        <div 
          className={cn(
            "absolute inset-0 bg-gray-200 transition-opacity duration-300",
            isLoaded ? "opacity-0" : "opacity-100"
          )}
        />
        <img
          src={space.image}
          alt={space.name}
          className={cn(
            "h-full w-full object-cover transition-all duration-700",
            isLoaded ? "scale-100 opacity-100" : "scale-105 opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
        />
        <div className="absolute bottom-0 left-0 right-0 p-3 pt-20 bg-gradient-to-t from-black/50 to-transparent">
          <span className="px-2 py-1 text-xs font-medium text-white rounded-full bg-primary/90">
            {space.type === 'hot-desk' ? 'Hot Desk' : space.type === 'meeting-room' ? 'Meeting Room' : 'Call Room'}
          </span>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-semibold">{space.name}</h3>
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{space.description}</p>
        
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{space.capacity} {space.capacity === 1 ? 'person' : 'people'}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>${space.pricePerHour}/hour</span>
          </div>
        </div>
        
        <div className="mt-5 pt-4 border-t border-gray-100">
          <Button 
            className="w-full" 
            onClick={handleBook}
          >
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
}
