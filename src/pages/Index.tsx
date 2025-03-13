
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, SquareUser, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpaceCard } from '@/components/ui/SpaceCard';
import { AnimatedTransition } from '@/components/ui/AnimatedTransition';
import { spaces } from '@/lib/data';
import { cn } from '@/lib/utils';

const Index = () => {
  const navigate = useNavigate();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  return (
    <AnimatedTransition>
      {/* Hero Section */}
      <section className="relative h-[90vh] overflow-hidden">
        <div 
          className={cn(
            "absolute inset-0 bg-gray-100 transition-opacity duration-500",
            isImageLoaded ? "opacity-0" : "opacity-100"
          )}
        />
        <img 
          src="https://images.unsplash.com/photo-1600508774634-4e11d34730e2?q=80&w=2070&auto=format&fit=crop" 
          alt="Modern coworking space" 
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center transition-all duration-1000",
            isImageLoaded ? "scale-100 opacity-100" : "scale-105 opacity-0"
          )}
          onLoad={() => setIsImageLoaded(true)}
        />
        
        <div className="absolute inset-0 bg-black/30" />
        
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
              <span className="block">Book your perfect</span>
              <span className="block text-primary mt-1">workspace.</span>
            </h1>
            
            <p className="mt-6 text-xl text-white/90 max-w-lg">
              Find and book flexible workspace for individuals and teams.
              Hot desks, meeting rooms, and call booths.
            </p>
            
            <div className="mt-10">
              <Button
                size="lg"
                onClick={() => navigate('/booking')}
                className="text-md font-medium px-8 py-6"
              >
                Reserve a Space
              </Button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </section>
      
      {/* Spaces Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Our Spaces
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Choose from our range of flexible workspace options
            </p>
          </div>
          
          <div className="mt-12 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Why Choose Our Coworking Space
            </h2>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            <FeatureCard 
              icon={<SquareUser className="h-8 w-8 text-primary" />}
              title="Hot Desking"
              description="Flexible workspace in our open-plan area. Perfect for individual work."
            />
            
            <FeatureCard 
              icon={<Calendar className="h-8 w-8 text-primary" />}
              title="Meeting Rooms"
              description="Professional meeting rooms with video conferencing equipment for team meetings."
            />
            
            <FeatureCard 
              icon={<Phone className="h-8 w-8 text-primary" />}
              title="Call Rooms"
              description="Private, sound-insulated space for calls and virtual meetings."
            />
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-12 sm:px-12 sm:py-16 lg:flex lg:items-center lg:py-20 lg:pl-16 lg:pr-10">
              <div className="lg:w-0 lg:flex-1">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Ready to book your workspace?
                </h2>
                <p className="mt-4 max-w-3xl text-lg text-blue-100">
                  Find and reserve your perfect workspace now. No long-term commitments required.
                </p>
              </div>
              <div className="mt-12 sm:w-full sm:max-w-md lg:mt-0 lg:ml-8 lg:flex-1">
                <div className="sm:flex">
                  <div className="mt-4 sm:mt-0 sm:ml-3">
                    <Button 
                      className="w-full bg-white text-primary hover:bg-blue-50"
                      onClick={() => navigate('/booking')}
                      size="lg"
                    >
                      Reserve Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AnimatedTransition>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-4 text-base text-gray-500">{description}</p>
    </div>
  );
}

export default Index;
