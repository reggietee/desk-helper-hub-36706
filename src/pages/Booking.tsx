
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronDown, FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpaceCard } from '@/components/ui/SpaceCard';
import { AnimatedTransition } from '@/components/ui/AnimatedTransition';
import { spaces } from '@/lib/data';
import { SpaceType } from '@/lib/types';
import { cn } from '@/lib/utils';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type') as SpaceType | null;
  const [activeType, setActiveType] = useState<SpaceType | 'all'>(typeParam || 'all');
  const [filteredSpaces, setFilteredSpaces] = useState(spaces);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Filter spaces based on selected type
  useEffect(() => {
    if (activeType === 'all') {
      setFilteredSpaces(spaces);
    } else {
      setFilteredSpaces(spaces.filter(space => space.type === activeType));
    }
  }, [activeType]);
  
  // Set active type based on URL parameter
  useEffect(() => {
    if (typeParam) {
      setActiveType(typeParam);
    }
  }, [typeParam]);
  
  return (
    <AnimatedTransition className="page-container pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book a Space</h1>
          <p className="mt-4 text-xl text-gray-500">
            Find and reserve the perfect workspace for your needs
          </p>
        </div>
        
        {/* Filters - Mobile */}
        <div className="mt-8 md:hidden">
          <Button
            variant="outline"
            className="w-full flex items-center justify-between"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <span className="flex items-center">
              <FilterIcon className="h-4 w-4 mr-2" />
              Filter Spaces
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isFilterOpen ? "transform rotate-180" : ""
            )} />
          </Button>
          
          {isFilterOpen && (
            <div className="mt-3 bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <FilterButton
                type="all"
                activeType={activeType}
                setActiveType={setActiveType}
                label="All Spaces"
              />
              <FilterButton
                type="hot-desk"
                activeType={activeType}
                setActiveType={setActiveType}
                label="Hot Desks"
              />
              <FilterButton
                type="meeting-room"
                activeType={activeType}
                setActiveType={setActiveType}
                label="Meeting Rooms"
              />
              <FilterButton
                type="call-room"
                activeType={activeType}
                setActiveType={setActiveType}
                label="Call Rooms"
              />
            </div>
          )}
        </div>
        
        {/* Filters - Desktop */}
        <div className="hidden md:flex mt-8 justify-center space-x-4">
          <FilterButton
            type="all"
            activeType={activeType}
            setActiveType={setActiveType}
            label="All Spaces"
          />
          <FilterButton
            type="hot-desk"
            activeType={activeType}
            setActiveType={setActiveType}
            label="Hot Desks"
          />
          <FilterButton
            type="meeting-room"
            activeType={activeType}
            setActiveType={setActiveType}
            label="Meeting Rooms"
          />
          <FilterButton
            type="call-room"
            activeType={activeType}
            setActiveType={setActiveType}
            label="Call Rooms"
          />
        </div>
        
        {/* Spaces Grid */}
        <div className="mt-12 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSpaces.length > 0 ? (
            filteredSpaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">No spaces available</h3>
              <p className="mt-2 text-gray-500">
                Try changing your filter criteria or check back later.
              </p>
            </div>
          )}
        </div>
      </div>
    </AnimatedTransition>
  );
};

interface FilterButtonProps {
  type: SpaceType | 'all';
  activeType: SpaceType | 'all';
  setActiveType: (type: SpaceType | 'all') => void;
  label: string;
}

function FilterButton({ type, activeType, setActiveType, label }: FilterButtonProps) {
  return (
    <Button
      variant={activeType === type ? "default" : "outline"}
      className={cn(
        "transition-all",
        activeType === type ? "shadow-sm" : "",
        type === 'all' ? "md:min-w-[120px]" : "",
      )}
      onClick={() => setActiveType(type)}
    >
      {label}
    </Button>
  );
}

export default Booking;
