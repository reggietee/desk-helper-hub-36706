import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Phone,
  Users,
  Building,
  AlertCircle,
  UserPlus,
  Gift,
  Tag,
  Handshake,
  Calendar,
} from 'lucide-react';

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const cards: DashboardCard[] = [
  {
    title: 'Equipment Checkout',
    description: 'Borrow shared items from the coworking space',
    icon: <Package className="h-6 w-6" />,
  },
  {
    title: 'Book Call Room',
    description: 'Reserve the call room for private calls',
    icon: <Phone className="h-6 w-6" />,
  },
  {
    title: 'Book Meeting Room',
    description: 'Reserve the meeting room for team sessions',
    icon: <Users className="h-6 w-6" />,
  },
  {
    title: 'Book Private Office',
    description: 'Reserve the private office for a full day',
    icon: <Building className="h-6 w-6" />,
  },
  {
    title: 'Submit an Issue',
    description: 'Report issues or request maintenance',
    icon: <AlertCircle className="h-6 w-6" />,
  },
  {
    title: 'Guest Day Pass',
    description: 'Request a day pass for your guest',
    icon: <UserPlus className="h-6 w-6" />,
  },
  {
    title: 'Special Offers',
    description: 'Exclusive deals for members',
    icon: <Tag className="h-6 w-6" />,
  },
  {
    title: 'Refer a Friend',
    description: 'Invite friends and earn rewards',
    icon: <Gift className="h-6 w-6" />,
    comingSoon: true,
  },
  {
    title: 'Barter Network',
    description: 'Exchange services with other members',
    icon: <Handshake className="h-6 w-6" />,
    comingSoon: true,
  },
  {
    title: 'Events Calendar',
    description: 'View and join upcoming community events',
    icon: <Calendar className="h-6 w-6" />,
    comingSoon: true,
  },
];

/**
 * Privacy-safe placeholder for service cards grid.
 * Shows the same structure without any user-specific data.
 */
export function ServiceCardsPlaceholder() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="haven-card border-0 group relative"
        >
          {card.comingSoon && (
            <Badge className="absolute top-6 right-6 bg-accent/20 text-primary border-0" variant="secondary">
              Coming Soon
            </Badge>
          )}
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10 text-primary group-hover:bg-accent/20 transition-colors">
                {card.icon}
              </div>
              <CardTitle className="text-lg">{card.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">{card.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
