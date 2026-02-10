import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import havenLogo from '@/assets/haven-logo.svg';
import havenLogoWhite from '@/assets/haven-logo-white.png';
import { LogOut, Settings, Shield, Trophy, Menu, Coins, Video } from 'lucide-react';
import { toast } from 'sonner';
import { WeeklyPresence } from '@/components/dashboard/WeeklyPresence';
import { WeeklyPresencePlaceholder } from '@/components/dashboard/WeeklyPresencePlaceholder';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { HavenUpdates } from '@/components/dashboard/HavenUpdates';
import { CheckInBanner } from '@/components/dashboard/CheckInBanner';
import { CreditsDisplay } from '@/components/dashboard/CreditsDisplay';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/hooks/use-theme';
import { LeaderboardModal } from '@/components/dashboard/LeaderboardModal';
import { Feed } from '@/components/dashboard/Feed';
import { SprintsList } from '@/components/dashboard/SprintsList';
import { useIsMobile } from '@/hooks/use-mobile';
import { LockedOverlay } from '@/components/ui/locked-overlay';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';
import { HavenServices } from '@/components/dashboard/HavenServices';
import { StartCallModal } from '@/components/calls/StartCallModal';
import { LivestreamPanel } from '@/components/dashboard/LivestreamPanel';
import { useLivestreamWithGuest } from '@/hooks/useLivestreamWithGuest';
import { WatchNowButton } from '@/components/dashboard/WatchNowButton';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
// Greeting utilities
const greetings = [(name: string) => `Welcome back, ${name} 👋`, (name: string) => `Good to see you again, ${name}!`, (name: string) => `Hey there, ${name} — ready to get things done?`, (name: string) => `Howdy, ${name} 🤠`, (name: string) => `Hi ${name}, your space is ready 🌿`, (name: string) => `Welcome in, ${name} — make yourself at home.`, (name: string) => `Hey ${name}, great to have you back at Haven.`];
const getDailyGreeting = (name: string) => {
  const today = new Date().toDateString();
  const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = seed % greetings.length;
  return greetings[index](name);
};
export default function Dashboard() {
  const navigate = useNavigate();
  const {
    theme
  } = useTheme();
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
  const [startCallOpen, setStartCallOpen] = useState(false);

  // Get user role from hook
  const {
    role: userRole,
    isGuest
  } = useUserRole(userId || null);

  // Get livestream state (needs isGuest for proper guest access check)
  const { shouldReplaceDashboard, hasActiveLivestream, shouldShowWatchNow, livestream } = useLivestreamWithGuest(isGuest);
  const handleHavenUpdateVisibilityChange = useCallback((hasUpdate: boolean) => {
    setHasHavenUpdate(hasUpdate);
  }, []);
  const handleCheckInComplete = () => {
    // Refresh credits display after check-in
    setCreditsRefreshKey(prev => prev + 1);
  };
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserEmail(session.user.email || '');

      // Get user profile
      const {
        data: profile
      } = await supabase.from('profiles').select('full_name, status').eq('id', session.user.id).single();
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
      const {
        data: roles
      } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
      if (roles && roles.some(r => r.role === 'admin')) {
        setIsAdmin(true);
      }
      setUserId(session.user.id);
      setLoading(false);
    };
    checkAuth();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
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
  // Service cards are now handled by HavenServices component
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>;
  }
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky navigation wrapper */}
      <div className="sticky top-0 z-50">
        {/* Check-in banner - appears above everything when on Haven Wi-Fi */}
        <CheckInBanner userId={userId} userRole={userRole} onCheckIn={handleCheckInComplete} />
        
        <header className="bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="container mx-auto px-4 md:px-6 py-4 md:py-5 flex justify-between items-center">
            <div className="flex items-center">
              <img src={theme === 'dark' ? havenLogoWhite : havenLogo} alt="Haven Workspace" className="w-[113px] h-16 object-contain" />
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {/* Watch Now Button - prominent position, left of credits */}
              {shouldShowWatchNow && livestream && (
                <WatchNowButton status={livestream.status as 'scheduled' | 'live'} />
              )}
              <CreditsDisplay userId={userId} refreshKey={creditsRefreshKey} onClick={() => {
              setProfileDefaultTab("credits");
              setProfileSettingsOpen(true);
            }} />
              <Button variant="outline" size="sm" onClick={() => setLeaderboardOpen(true)} className="rounded-xl">
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Button>
              {isAdmin && <>
                  <Button variant="outline" size="sm" onClick={() => setStartCallOpen(true)} className="rounded-xl">
                    <Video className="mr-2 h-4 w-4" />
                    Start a Call
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="rounded-xl">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                </>}
              <Button variant="outline" size="sm" onClick={() => {
              setProfileDefaultTab("name");
              setProfileSettingsOpen(true);
            }} className="rounded-xl">
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
                    {/* Watch Now - Prominent at top of mobile menu */}
                    {shouldShowWatchNow && livestream && (
                      <button onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/live');
                      }} className="flex items-center gap-3 px-4 py-3 bg-destructive/10 hover:bg-destructive/20 transition-colors text-left border-b border-border">
                        <span className="relative flex h-2.5 w-2.5">
                          {livestream.status === 'live' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                          )}
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                        </span>
                        <Video className="h-5 w-5 text-destructive" />
                        <span className="font-semibold text-destructive">Watch Now</span>
                        {livestream.status === 'live' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-destructive opacity-75 ml-auto">LIVE</span>
                        )}
                      </button>
                    )}

                    {/* Credits */}
                    <button onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileDefaultTab("credits");
                    setProfileSettingsOpen(true);
                  }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
                      <Coins className="h-5 w-5 text-primary" />
                      <span className="font-medium">Credits</span>
                      <CreditsDisplay userId={userId} refreshKey={creditsRefreshKey} onClick={() => {}} className="ml-auto" />
                    </button>

                    {/* Leaderboard */}
                    <button onClick={() => {
                    setMobileMenuOpen(false);
                    setLeaderboardOpen(true);
                  }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
                      <Trophy className="h-5 w-5 text-muted-foreground" />
                      <span>Leaderboard</span>
                    </button>

                    {/* Admin options (conditional) */}
                    {isAdmin && <>
                        <button onClick={() => {
                      setMobileMenuOpen(false);
                      setStartCallOpen(true);
                    }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
                          <Video className="h-5 w-5 text-muted-foreground" />
                          <span>Start a Call</span>
                        </button>
                        <button onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/admin');
                    }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                          <span>Admin</span>
                        </button>
                      </>}

                    {/* Profile */}
                    <button onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileDefaultTab("name");
                    setProfileSettingsOpen(true);
                  }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <span>Profile</span>
                    </button>

                    {/* Sign Out */}
                    <button onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
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
        <div className="mb-12 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-4xl font-heading font-bold mb-3 text-foreground">
              {getDailyGreeting(userName)}
            </h2>
            <p className="text-lg text-muted-foreground">Welcome to Homebase. What would you like to do today?</p>
          </div>
          {!isGuest && (
            <div className="hidden md:block w-[280px] flex-shrink-0">
              <OnboardingChecklist
                userId={userId}
                onCreditsEarned={handleCheckInComplete}
                onOpenProfile={() => {
                  setProfileDefaultTab("name");
                  setProfileSettingsOpen(true);
                }}
                onOpenWeekPlan={() => {
                  // Scroll to weekly presence section
                  document.querySelector('[data-section="weekly-presence"]')?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          )}
        </div>

        {/* Mobile onboarding checklist */}
        {!isGuest && (
          <div className="md:hidden mb-8">
            <OnboardingChecklist
              userId={userId}
              onCreditsEarned={handleCheckInComplete}
              onOpenProfile={() => {
                setProfileDefaultTab("name");
                setProfileSettingsOpen(true);
              }}
              onOpenWeekPlan={() => {
                document.querySelector('[data-section="weekly-presence"]')?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        )}

        {/* Haven Updates / Livestream + Feed Section */}
        <div data-section="feed">
          {isMobile ?
          // Mobile: Stack vertically with fixed height Feed
          <div className="space-y-6">
              {/* Show Livestream OR Haven Updates based on replace mode */}
              {shouldReplaceDashboard && !isGuest ? (
                <LivestreamPanel mode="full" />
              ) : hasHavenUpdate ? (
                <HavenUpdates onVisibilityChange={handleHavenUpdateVisibilityChange} />
              ) : null}
              
              <div className="h-[400px]">
                <Feed userId={userId} userName={userName} isGuestViewer={isGuest} />
              </div>
            </div> : (shouldReplaceDashboard && !isGuest) ?
          // Desktop with Livestream: Width-driven layout where 16:9 video determines row height
          // Left column drives height via aspect-ratio, right column stretches to match
          <div className="grid grid-cols-[3fr_1fr] gap-6 items-stretch">
              {/* Left column - Livestream (drives height via 16:9 aspect ratio) */}
              <div className="min-h-0">
                <LivestreamPanel mode="full" userId={userId} />
              </div>
              {/* Right column - Feed stretches to match left column height */}
              <div className="min-h-0 max-h-[600px] overflow-hidden">
                <Feed userId={userId} userName={userName} isGuestViewer={isGuest} />
              </div>
          </div> : hasHavenUpdate ?
          // Desktop with Haven Update (no livestream): Left column drives height naturally, right matches
          <div className="grid grid-cols-[3fr_1fr] gap-6 items-stretch">
              {/* Left column - Haven Updates (natural height, no constraints) */}
              <div className="min-h-0">
                <HavenUpdates onVisibilityChange={handleHavenUpdateVisibilityChange} />
              </div>
              {/* Right column - Feed stretches to match left column, scrolls internally */}
              <div className="relative min-h-[400px] max-h-[600px]">
                <div className="absolute inset-0">
                  <Feed userId={userId} userName={userName} isGuestViewer={isGuest} />
                </div>
              </div>
            </div> :
          // Desktop without Haven Update and no livestream: Full-width Feed with fixed height
          <div className="h-[500px]">
              <HavenUpdates onVisibilityChange={handleHavenUpdateVisibilityChange} />
              
              <Feed userId={userId} userName={userName} isGuestViewer={isGuest} />
            </div>}
        </div>

        {/* Divider: Updates/Feed → Who's In */}
        <div className="my-8 md:my-10">
          <div className="h-px w-full bg-border/50" />
        </div>

        {/* Weekly Presence Section - locked for guests with privacy-safe placeholder */}
        <div data-section="weekly-presence">
          <LockedOverlay isLocked={isGuest} message="Members only" teaser="Plan your upcoming coworking days and see how busy Haven will be across the week." modalTitle="Plan My Week / Who's In" modalDescription="Plan your coworking days at Haven for the next two weeks so you can match the vibe you want—lighter days for focus and deeper work, and busier days for networking. Members can also optionally share their name on the calendar to coordinate with others." hideContent={true} placeholder={<WeeklyPresencePlaceholder />}>
            <WeeklyPresence userId={userId} onCreditsEarned={handleCheckInComplete} />
          </LockedOverlay>
        </div>

        {/* Divider: Who's In → Work Sprints */}
        <div className="my-8 md:my-10">
          <div className="h-px w-full bg-border/50" />
        </div>

        {/* Co-Working Sprints Section */}
        <div data-section="sprints">
          <SprintsList userId={userId} userName={userName} userRole={userRole} />
        </div>

        {/* Divider: Work Sprints → Haven Services */}
        <div className="my-8 md:my-10">
          <div className="h-px w-full bg-border/50" />
        </div>

        {/* Haven Services - with per-service locking for guests */}
        <HavenServices isGuest={isGuest} />
      </main>

      <ProfileSettings open={profileSettingsOpen} onOpenChange={setProfileSettingsOpen} currentName={userName} currentEmail={userEmail} onNameUpdate={setUserName} defaultTab={profileDefaultTab} />

      <LeaderboardModal open={leaderboardOpen} onOpenChange={setLeaderboardOpen} refreshKey={creditsRefreshKey} />

      {/* Start Call Modal (Admin only) */}
      {isAdmin && <StartCallModal open={startCallOpen} onOpenChange={setStartCallOpen} />}
    </div>;
}