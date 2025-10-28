import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { z } from 'zod';
import havenLogo from '@/assets/haven-logo.svg';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const resetToken = searchParams.get('token');

  useEffect(() => {
    if (resetToken) {
      setShowResetPassword(true);
      return;
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Profile fetch error:', profileError);
          }
          
          if (profile?.status === 'approved') {
            navigate('/dashboard');
          } else {
            setUserStatus(profile?.status || null);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && event === 'SIGNED_IN') {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Profile fetch error:', profileError);
          }
          
          if (profile?.status === 'approved') {
            navigate('/dashboard');
          } else {
            setUserStatus(profile?.status || null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, resetToken]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    try {
      const validation = authSchema.safeParse({
        email,
        password,
        fullName: isLogin ? undefined : fullName,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check user status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        if (profile?.status === 'declined') {
          await supabase.auth.signOut();
          setUserStatus('declined');
          toast.error('Your account request was not approved');
          setLoading(false);
          return;
        } else if (profile?.status === 'pending') {
          setUserStatus('pending');
          toast.info('Your account is awaiting approval');
          setLoading(false);
          return;
        }

        toast.success('Successfully logged in!');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;

        // Send approval notification
        if (data.user) {
          console.log('Attempting to send approval notification for user:', data.user.id);
          
          try {
            const notificationResponse = await supabase.functions.invoke('send-notification', {
              body: {
                type: 'new_signup',
                data: {
                  userId: data.user.id,
                  name: fullName,
                  email: email,
                  signupTime: new Date().toISOString(),
                },
              },
            });

            if (notificationResponse.error) {
              console.error('Approval notification error:', notificationResponse.error);
              toast.warning('Account created, but approval email may not have been sent. Please contact support.');
            } else {
              console.log('Approval notification sent successfully:', notificationResponse.data);
              toast.success('Account created! An approval request has been sent to the admin.');
            }
          } catch (err) {
            console.error('Failed to send approval notification:', err);
            toast.warning('Account created, but approval email failed. Please contact support at reggie@havenworkspace.ca');
          }
        }

        setUserStatus('pending');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      const validation = authSchema.pick({ email: true }).safeParse({ email });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;
      toast.success('Password reset link sent to your email');
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    try {
      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      toast.success('Password reset successfully! You can now log in.');
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-haven-offwhite p-4">
        <Card className="w-full max-w-md haven-card border-0">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <img src={havenLogo} alt="Haven Workspace" className="h-12" />
            </div>
            <CardTitle className="text-2xl text-center font-heading font-bold text-haven-charcoal">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-center text-base text-haven-grey">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold text-haven-charcoal">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••"
                  required
                  className="h-11 rounded-xl border-2 border-haven-lightgrey focus:border-haven-forest focus:ring-haven-forest"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-haven-charcoal">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••"
                  required
                  className="h-11 rounded-xl border-2 border-haven-lightgrey focus:border-haven-forest focus:ring-haven-forest"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-haven-offwhite p-4">
        <Card className="w-full max-w-md haven-card border-0">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <img src={havenLogo} alt="Haven Workspace" className="h-12" />
            </div>
            <CardTitle className="text-2xl text-center font-heading font-bold text-haven-charcoal">
              Reset Password
            </CardTitle>
            <CardDescription className="text-center text-base text-haven-grey">
              Enter your email to receive a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-semibold text-haven-charcoal">
                  Email
                </Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="h-11 rounded-xl border-2 border-haven-lightgrey focus:border-haven-forest focus:ring-haven-forest"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowForgotPassword(false)}
              >
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-haven-offwhite p-4">
      <Card className="w-full max-w-md haven-card border-0">
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-2">
            <img src={havenLogo} alt="Haven Workspace" className="h-16" />
          </div>
          <CardDescription className="text-center text-base text-haven-grey">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userStatus === 'pending' && (
            <Alert className="mb-4 border-haven-lime bg-haven-lime/10">
              <AlertDescription className="text-haven-charcoal">
                Your account is awaiting approval. You'll receive an email once approved.
              </AlertDescription>
            </Alert>
          )}
          {userStatus === 'declined' && (
            <Alert className="mb-4 border-red-500 bg-red-50">
              <AlertDescription className="text-red-900">
                Your account request was not approved. Please contact support for more information.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(v) => setIsLogin(v === 'login')}>
            <TabsList className="grid w-full grid-cols-2 bg-haven-lightgrey/30 rounded-xl p-1 mb-6">
              <TabsTrigger 
                value="login" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-haven-forest"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-haven-forest"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-semibold text-haven-charcoal">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="h-11 rounded-xl border-2 border-haven-lightgrey focus:border-haven-forest focus:ring-haven-forest"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-sm font-semibold text-haven-charcoal">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-haven-forest hover:text-haven-lime transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="••••••"
                    required
                    className="h-11 rounded-xl border-2 border-haven-lightgrey focus:border-haven-forest focus:ring-haven-forest"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-semibold text-haven-charcoal">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="h-11 rounded-xl border-2 border-haven-lightgrey focus:border-haven-forest focus:ring-haven-forest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-semibold text-haven-charcoal">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="h-11 rounded-xl border-2 border-haven-lightgrey focus:border-haven-forest focus:ring-haven-forest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-semibold text-haven-charcoal">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••"
                    required
                    className="h-11 rounded-xl border-2 border-haven-lightgrey focus:border-haven-forest focus:ring-haven-forest"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
