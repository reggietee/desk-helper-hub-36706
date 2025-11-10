import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import havenLogo from '@/assets/haven-logo.svg';
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
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { WeeklyPresence } from '@/components/dashboard/WeeklyPresence';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  comingSoon?: boolean;
}

const greetings = [
  (name: string) => `Welcome back, ${name} 👋`,
  (name: string) => `Good to see you again, ${name}!`,
  (name: string) => `Hey there, ${name} — ready to get things done?`,
  (name: string) => `Howdy, ${name} 🤠`,
  (name: string) => `Hi ${name}, your space is ready 🌿`,
  (name: string) => `Welcome in, ${name} — make yourself at home.`,
  (name: string) => `Hey ${name}, great to have you back at Haven.`,
];

const getDailyGreeting = (name: string) => {
  const today = new Date().toDateString();
  const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = seed % greetings.length;
  return greetings[index](name);
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUserEmail(session.user.email || '');

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
      }
      
      setUserId(session.user.id);
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
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div>
            <img src={havenLogo} alt="Haven Workspace" className="h-12 md:h-16 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setProfileSettingsOpen(true)} 
              className="rounded-xl"
            >
              <Settings className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="rounded-xl">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-heading font-bold mb-3 text-foreground">
            {getDailyGreeting(userName)}
          </h2>
          <p className="text-lg text-muted-foreground">
            What would you like to do today?
          </p>
        </div>

        {/* Weekly Presence Section */}
        <div className="mb-12">
          <WeeklyPresence userId={userId} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card) => (
            <Card
              key={card.path}
              className="cursor-pointer haven-card border-0 group relative"
              onClick={() => navigate(card.path)}
            >
              {card.comingSoon && (
                <Badge className="absolute top-6 right-6 bg-accent/20 text-primary border-0" variant="secondary">
                  Coming Soon
                </Badge>
              )}
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-accent/10 rounded-2xl group-hover:bg-accent/20 transition-colors">
                    {card.icon}
                  </div>
                  <CardTitle className="text-xl font-heading font-bold text-foreground">{card.title}</CardTitle>
                </div>
                <CardDescription className="text-base text-muted-foreground leading-relaxed">
                  {card.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>

      <ProfileSettings
        open={profileSettingsOpen}
        onOpenChange={setProfileSettingsOpen}
        currentName={userName}
        currentEmail={userEmail}
        onNameUpdate={setUserName}
      />
    </div>
  );
}
