import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import havenLogo from '@/assets/haven-logo.svg';
import havenLogoWhite from '@/assets/haven-logo-white.png';
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
  Shield,
  Trophy,
  Menu,
  X,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import { WeeklyPresence } from '@/components/dashboard/WeeklyPresence';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { HavenUpdates } from '@/components/dashboard/HavenUpdates';
import { CheckInBanner } from '@/components/dashboard/CheckInBanner';
import { CreditsDisplay } from '@/components/dashboard/CreditsDisplay';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/hooks/use-theme';
import { LeaderboardModal } from '@/components/dashboard/LeaderboardModal';
import { Feed } from '@/components/dashboard/Feed';
import { CoworkingSprintCard } from '@/components/dashboard/CoworkingSprintCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { LockedOverlay } from '@/components/ui/locked-overlay';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';

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
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [profileDefaultTab, setProfileDefaultTab] = useState("name");
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creditsRefreshKey, setCreditsRefreshKey] = useState(0);
  const [hasHavenUpdate, setHasHavenUpdate] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get user role from hook
  const { role: userRole, isGuest } = useUserRole(userId || null);

  const handleHavenUpdateVisibilityChange = useCallback((hasUpdate: boolean) => {
    setHasHavenUpdate(hasUpdate);
  }, []);

  const handleCheckInComplete = () => {
    // Refresh credits display after check-in
    setCreditsRefreshKey(prev => prev + 1);
  };
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
        .select('full_name, status')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
        
        // Check if user is pending approval
        if (profile.status === 'pending') {
          toast.error('Your account is pending approval. You\'ll receive an email once approved.');
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }
        
        // Check if user is declined
        if (profile.status === 'declined') {
          toast.error('Your account request was not approved.');
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }
      }
      
      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);
      
      if (roles && roles.some(r => r.role === 'admin')) {
        setIsAdmin(true);
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
      path: '/coming-soon?feature=refer',
      comingSoon: true,
    },
    {
      title: 'Barter Network',
      description: 'Exchange services with other members',
      icon: <Handshake className="h-6 w-6" />,
      path: '/coming-soon?feature=barter',
      comingSoon: true,
    },
    {
      title: 'Events Calendar',
      description: 'View and join upcoming community events',
      icon: <Calendar className="h-6 w-6" />,
      path: '/coming-soon?feature=events',
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky navigation wrapper */}
      <div className="sticky top-0 z-50">
        {/* Check-in banner - appears above everything when on Haven Wi-Fi */}
        <CheckInBanner userId={userId} onCheckIn={handleCheckInComplete} />
        
        <header className="bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="container mx-auto px-4 md:px-6 py-4 md:py-5 flex justify-between items-center">
            <div className="flex items-center">
              <img 
                src={theme === 'dark' ? havenLogoWhite : havenLogo} 
                alt="Haven Workspace" 
                className="w-[113px] h-16 object-contain" 
              />
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <CreditsDisplay 
                userId={userId} 
                refreshKey={creditsRefreshKey} 
                onClick={() => {
                  setProfileDefaultTab("credits");
                  setProfileSettingsOpen(true);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLeaderboardOpen(true)}
                className="rounded-xl"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Button>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="rounded-xl"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setProfileDefaultTab("name");
                  setProfileSettingsOpen(true);
                }} 
                className="rounded-xl"
              >
                <Settings className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="rounded-xl">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <ThemeToggle />
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0">
                  <SheetHeader className="p-4 border-b border-border">
                    <SheetTitle className="text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col py-2">
                    {/* Credits */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setProfileDefaultTab("credits");
                        setProfileSettingsOpen(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <Coins className="h-5 w-5 text-primary" />
                      <span className="font-medium">Credits</span>
                      <CreditsDisplay 
                        userId={userId} 
                        refreshKey={creditsRefreshKey} 
                        onClick={() => {}}
                        className="ml-auto"
                      />
                    </button>

                    {/* Leaderboard */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLeaderboardOpen(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <Trophy className="h-5 w-5 text-muted-foreground" />
                      <span>Leaderboard</span>
                    </button>

                    {/* Admin (conditional) */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate('/admin');
                        }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                      >
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <span>Admin</span>
                      </button>
                    )}

                    {/* Profile */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setProfileDefaultTab("name");
                        setProfileSettingsOpen(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <span>Profile</span>
                    </button>

                    {/* Sign Out */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <LogOut className="h-5 w-5 text-muted-foreground" />
                      <span>Sign Out</span>
                    </button>

                    {/* Theme Toggle */}
                    <div className="flex items-center gap-3 px-4 py-3 border-t border-border mt-2">
                      <span className="text-sm text-muted-foreground">Theme</span>
                      <div className="ml-auto">
                        <ThemeToggle />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="mb-12">
          <h2 className="text-4xl font-heading font-bold mb-3 text-foreground">
            {getDailyGreeting(userName)}
          </h2>
          <p className="text-lg text-muted-foreground">
            What would you like to do today?
          </p>
        </div>

        {/* Haven Updates + Feed Section */}
        <div className="mb-8">
          {isMobile ? (
            // Mobile: Stack vertically with fixed height Feed
            <div className="space-y-6">
              {hasHavenUpdate && (
                <HavenUpdates onVisibilityChange={handleHavenUpdateVisibilityChange} />
              )}
              <div className="h-[400px]">
                <Feed userId={userId} userName={userName} />
              </div>
            </div>
          ) : hasHavenUpdate ? (
            // Desktop with Haven Update: CSS Grid with subgrid-like behavior
            // Haven Updates defines the implicit row height, Feed container is constrained to match
            <div className="grid grid-cols-[3fr_1fr] gap-6" style={{ gridTemplateRows: 'auto' }}>
              <div className="row-start-1">
                <HavenUpdates onVisibilityChange={handleHavenUpdateVisibilityChange} />
              </div>
              {/* Feed container: absolute positioning trick to constrain height to grid row */}
              <div className="row-start-1 relative">
                <div className="absolute inset-0">
                  <Feed userId={userId} userName={userName} />
                </div>
              </div>
            </div>
          ) : (
            // Desktop without Haven Update: Full-width Feed with fixed height
            <div className="h-[500px]">
              <HavenUpdates onVisibilityChange={handleHavenUpdateVisibilityChange} />
              <Feed userId={userId} userName={userName} />
            </div>
          )}
        </div>

        {/* Weekly Presence Section - locked for guests */}
        <div className="mb-8">
          <LockedOverlay isLocked={isGuest} message="Members only">
            <WeeklyPresence userId={userId} onCreditsEarned={handleCheckInComplete} />
          </LockedOverlay>
        </div>

        {/* Co-Working Sprint Section - only shows if active sprint exists, has its own guest handling */}
        <div className="mb-12">
          <CoworkingSprintCard userId={userId} userName={userName} userRole={userRole} />
        </div>

        {/* Service cards grid - locked for guests */}
        <LockedOverlay isLocked={isGuest} message="Members only">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cards.map((card) => (
              <Card
                key={card.path}
                className="cursor-pointer haven-card border-0 group relative"
                onClick={() => !isGuest && navigate(card.path)}
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
        </LockedOverlay>
      </main>

      <ProfileSettings
        open={profileSettingsOpen}
        onOpenChange={setProfileSettingsOpen}
        currentName={userName}
        currentEmail={userEmail}
        onNameUpdate={setUserName}
        defaultTab={profileDefaultTab}
      />

      <LeaderboardModal
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
        refreshKey={creditsRefreshKey}
      />
    </div>
  );
}
