import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  comingSoon?: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
      }
      
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const cards: DashboardCard[] = [
    {
      title: 'Equipment Checkout',
      description: 'Borrow shared items from the coworking space',
      icon: <Package className="h-6 w-6" />,
      path: '/equipment-checkout',
    },
    {
      title: 'Book Call Room',
      description: 'Reserve the call room for private calls',
      icon: <Phone className="h-6 w-6" />,
      path: '/book-call-room',
    },
    {
      title: 'Book Meeting Room',
      description: 'Reserve the meeting room for team sessions',
      icon: <Users className="h-6 w-6" />,
      path: '/book-meeting-room',
    },
    {
      title: 'Book Private Office',
      description: 'Reserve the private office for a full day',
      icon: <Building className="h-6 w-6" />,
      path: '/book-private-office',
    },
    {
      title: 'Submit an Issue',
      description: 'Report issues or request maintenance',
      icon: <AlertCircle className="h-6 w-6" />,
      path: '/submit-issue',
    },
    {
      title: 'Guest Day Pass',
      description: 'Request a day pass for your guest',
      icon: <UserPlus className="h-6 w-6" />,
      path: '/guest-day-pass',
    },
    {
      title: 'Special Offers',
      description: 'Exclusive deals for members',
      icon: <Tag className="h-6 w-6" />,
      path: '/special-offers',
    },
    {
      title: 'Refer a Friend',
      description: 'Invite friends and earn rewards',
      icon: <Gift className="h-6 w-6" />,
      path: '/coming-soon',
      comingSoon: true,
    },
    {
      title: 'Barter Network',
      description: 'Exchange services with other members',
      icon: <Handshake className="h-6 w-6" />,
      path: '/coming-soon',
      comingSoon: true,
    },
    {
      title: 'Events Calendar',
      description: 'View and join upcoming community events',
      icon: <Calendar className="h-6 w-6" />,
      path: '/coming-soon',
      comingSoon: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {userName}!</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Card
              key={card.path}
              className="hover:shadow-lg transition-shadow cursor-pointer relative"
              onClick={() => navigate(card.path)}
            >
              {card.comingSoon && (
                <Badge className="absolute top-4 right-4" variant="secondary">
                  Coming Soon
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                  {card.icon}
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant={card.comingSoon ? 'outline' : 'default'} className="w-full" disabled={card.comingSoon}>
                  {card.comingSoon ? 'Coming Soon' : 'Open'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
