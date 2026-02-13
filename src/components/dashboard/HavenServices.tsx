import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Phone,
  Users,
  AlertCircle,
  UserPlus,
  Gift,
  Tag,
  Handshake,
  Lock,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ServiceCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  comingSoon?: boolean;
  /** Whether guests can access this service */
  guestAccessible?: boolean;
  /** Description shown when locked for guests */
  lockedTeaser?: string;
  /** Modal description shown when guest clicks locked card */
  lockedModalDescription?: string;
}

const services: ServiceCard[] = [
  {
    id: 'day-pass',
    title: 'Day Pass',
    description: 'Request a day pass for your guest',
    icon: <UserPlus className="h-6 w-6" />,
    path: '/guest-day-pass',
    guestAccessible: true,
  },
  {
    id: 'boardroom',
    title: 'Boardroom',
    description: 'Reserve the meeting room for team sessions',
    icon: <Users className="h-6 w-6" />,
    path: '/book-meeting-room',
    guestAccessible: true,
  },
  {
    id: 'call-room',
    title: 'Call Room',
    description: 'Reserve the call room for private 1:1 calls and focused conversations.',
    icon: <Phone className="h-6 w-6" />,
    path: '/book-call-room',
    guestAccessible: false,
    lockedTeaser: 'Reserve the call room for private 1:1 calls and focused conversations.',
    lockedModalDescription: 'Call Room booking is for members who need a quiet space for client calls or focused conversations. It helps reduce noise in the main coworking area and keeps availability fair. Member access ensures bookings follow the space guidelines.',
  },
  {
    id: 'equipment-checkout',
    title: 'Equipment Checkout',
    description: 'Borrow shared gear like the TV, whiteboard, and library books.',
    icon: <Package className="h-6 w-6" />,
    path: '/equipment-checkout',
    guestAccessible: false,
    lockedTeaser: 'Borrow shared gear like the TV, whiteboard, and library books.',
    lockedModalDescription: 'Equipment Checkout lets members borrow shared items from Haven for short-term use, like the TV and whiteboard, plus books from our library. This helps keep gear organized and available for everyone. Member access keeps borrowing tracked and ensures items are returned on time.',
  },
  {
    id: 'submit-issue',
    title: 'Submit an Issue',
    description: 'Report issues or request maintenance',
    icon: <AlertCircle className="h-6 w-6" />,
    path: '/submit-issue',
    guestAccessible: true,
  },
  {
    id: 'special-offers',
    title: 'Special Offers',
    description: 'Unlock member-only deals from Haven and our local partners.',
    icon: <Tag className="h-6 w-6" />,
    path: '/special-offers',
    guestAccessible: false,
    lockedTeaser: 'Unlock member-only deals from Haven and our local partners.',
    lockedModalDescription: 'Special Offers gives members access to exclusive discounts and perks from Haven partners. These offers are part of the membership value and rotate over time. Member access ensures partner perks are used appropriately.',
  },
  {
    id: 'refer-friend',
    title: 'Refer a Friend',
    description: 'Invite great people and earn perks when they join Haven.',
    icon: <Gift className="h-6 w-6" />,
    path: '/coming-soon?feature=refer',
    comingSoon: true,
    guestAccessible: false,
    lockedTeaser: 'Invite great people and earn perks when they join Haven.',
    lockedModalDescription: 'Refer a Friend lets members invite people who would be a strong fit for the community. It keeps growth intentional and rewards members for bringing in great new faces. Member access helps prevent spam and keeps referrals high-quality.',
  },
  {
    id: 'barter-network',
    title: 'Barter Network',
    description: 'Trade skills and services with other members in the community.',
    icon: <Handshake className="h-6 w-6" />,
    path: '/coming-soon?feature=barter',
    comingSoon: true,
    guestAccessible: false,
    lockedTeaser: 'Trade skills and services with other members in the community.',
    lockedModalDescription: 'The Barter Network is a member-to-member exchange where people trade skills, services, and small business help. It\'s built on trust and recurring community participation. Member access ensures the network stays safe, reliable, and high-signal.',
  },
];

interface HavenServicesProps {
  isGuest: boolean;
}

export function HavenServices({ isGuest }: HavenServicesProps) {
  const navigate = useNavigate();
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [selectedLockedService, setSelectedLockedService] = useState<ServiceCard | null>(null);
  const [guestDayPassOpen, setGuestDayPassOpen] = useState(false);
  const [guestBoardroomOpen, setGuestBoardroomOpen] = useState(false);

  const handleCardClick = (service: ServiceCard) => {
    // If guest and service is not guest-accessible, show modal
    if (isGuest && !service.guestAccessible) {
      setSelectedLockedService(service);
      setLockedModalOpen(true);
      return;
    }

    // Guest clicking Day Pass → show purchase modal
    if (isGuest && service.id === 'day-pass') {
      setGuestDayPassOpen(true);
      return;
    }

    // Guest clicking Boardroom → show purchase modal
    if (isGuest && service.id === 'boardroom') {
      setGuestBoardroomOpen(true);
      return;
    }
    
    // Otherwise navigate to the service
    navigate(service.path);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          Haven Services
        </h2>
        <p className="text-muted-foreground mt-1">
          All the infrastructure, support, and perks that make Haven a plug-and-play work environment.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {services.map((service) => {
          const isLocked = isGuest && !service.guestAccessible;
          
          return (
            <Card
              key={service.id}
              className={`haven-card border-0 group relative ${
                isLocked 
                  ? 'cursor-pointer border-2 border-dashed border-muted-foreground/25' 
                  : 'cursor-pointer'
              }`}
              onClick={() => handleCardClick(service)}
            >
              {/* Coming Soon badge */}
              {service.comingSoon && !isLocked && (
                <Badge 
                  className="absolute top-6 right-6 bg-accent/20 text-primary border-0" 
                  variant="secondary"
                >
                  Coming Soon
                </Badge>
              )}
              
              {/* Locked badge for guests */}
              {isLocked && (
                <Badge 
                  className="absolute top-6 right-6 bg-muted text-muted-foreground border-0 flex items-center gap-1" 
                  variant="secondary"
                >
                  <Lock className="h-3 w-3" />
                  Members only
                </Badge>
              )}

              <CardHeader className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl transition-colors ${
                    isLocked 
                      ? 'bg-muted text-muted-foreground' 
                      : 'bg-accent/10 group-hover:bg-accent/20'
                  }`}>
                    {service.icon}
                  </div>
                  <CardTitle className={`text-xl font-heading font-bold ${
                    isLocked ? 'text-muted-foreground' : 'text-foreground'
                  }`}>
                    {service.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className={`text-base leading-relaxed ${
                  isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'
                }`}>
                  {isLocked ? service.lockedTeaser : service.description}
                </CardDescription>
                
                {/* Subtle hint for locked cards */}
                {isLocked && (
                  <p className="text-xs text-muted-foreground/50 mt-3">
                    Tap to learn more
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Locked Service Info Modal */}
      <Dialog open={lockedModalOpen} onOpenChange={setLockedModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {selectedLockedService?.title}
            </DialogTitle>
            <DialogDescription className="pt-3 text-sm leading-relaxed">
              {selectedLockedService?.lockedModalDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 border-t border-border mt-4">
            <p className="text-xs text-muted-foreground mb-4">
              Available to Haven Members
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setLockedModalOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Day Pass Purchase Modal */}
      <Dialog open={guestDayPassOpen} onOpenChange={setGuestDayPassOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Day Pass
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-3 space-y-3 text-sm leading-relaxed">
                <p className="font-semibold text-foreground">Day Pass: $30 + HST</p>
                <p>Access: Monday–Friday, 9am–6pm</p>
                <p>After payment, you'll be redirected to our form + community guidelines to choose your arrival date/time.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 border-t border-border mt-4 space-y-3">
            <Button
              className="w-full"
              onClick={() => window.open('https://buy.stripe.com/28E5kD7R57TA4Fq3Rr0Ny0p', '_blank')}
            >
              Buy Day Pass
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
            <p className="text-xs text-muted-foreground text-center">Secure checkout via Stripe</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Boardroom Purchase Modal */}
      <Dialog open={guestBoardroomOpen} onOpenChange={setGuestBoardroomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Boardroom
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-3 space-y-3 text-sm leading-relaxed">
                <p className="font-semibold text-foreground">Boardroom booking: $35/hour</p>
                <p>Ideal for meetings up to 6–8 people.</p>
                <p>After payment, you'll be redirected to our booking form to choose your date/time.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 border-t border-border mt-4 space-y-3">
            <Button
              className="w-full"
              onClick={() => window.open('https://buy.stripe.com/dRm3cvc7l2zggo8cnX0Ny0e', '_blank')}
            >
              Book Boardroom
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
            <p className="text-xs text-muted-foreground text-center">Secure checkout via Stripe</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
