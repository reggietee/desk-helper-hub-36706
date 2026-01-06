import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { HCaptchaComponent } from '@/components/auth/HCaptcha';
import { toast } from 'sonner';
import { z } from 'zod';
import havenLogo from '@/assets/haven-logo.svg';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get('email') as string;
    const fullNameValue = formData.get('fullName') as string;

    try {
      const validation = emailSchema.safeParse({
        email: emailValue,
        fullName: isLogin ? undefined : fullNameValue,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Check if captcha is required but not provided
      if (requiresCaptcha && !captchaToken) {
        toast.error('Please complete the CAPTCHA verification');
        setLoading(false);
        return;
      }

      setEmail(emailValue);
      setFullName(fullNameValue || '');

      // Get user's IP and user agent
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      // Call our custom send-otp edge function
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email: emailValue,
          fullName: fullNameValue || 'User',
          ipAddress: ip,
          userAgent: navigator.userAgent,
          captchaToken: captchaToken,
        },
      });

      // Handle rate limiting (429 errors)
      if (error) {
        // Check if this is a FunctionsHttpError with rate limiting
        if (error.message?.includes('non-2xx') || error.message?.includes('429')) {
          // The actual response data might be in error context
          const errorData = data || {};
          if (errorData.requiresCaptcha) {
            setRequiresCaptcha(true);
            if (errorData.retryAfter) {
              setRetryAfter(errorData.retryAfter);
              toast.error(`Too many attempts. Please wait ${errorData.retryAfter} minutes or complete the CAPTCHA below.`);
            } else {
              toast.error('Too many attempts. Please complete the CAPTCHA below.');
            }
            setLoading(false);
            return;
          }
        }
        throw error;
      }

      if (data?.error) {
        if (data.requiresCaptcha) {
          setRequiresCaptcha(true);
          if (data.retryAfter) {
            setRetryAfter(data.retryAfter);
            toast.error(`Too many attempts. Please wait ${data.retryAfter} minutes or complete the CAPTCHA below.`);
          } else {
            toast.error(data.error);
          }
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }
      
      toast.success('Verification code sent to your email!');
      setStep('otp');
      setRequiresCaptcha(false);
      setCaptchaToken(null);
    } catch (error: any) {
      console.error('Send code error:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);

    try {
      // Get user's IP and user agent
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      // Call our custom verify-otp edge function
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email,
          token: otp,
          fullName: fullName || 'User',
          ipAddress: ip,
          userAgent: navigator.userAgent,
        },
      });

      if (error) {
        const errorData = data || {};
        if (errorData.error) throw new Error(errorData.error);
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      if (data?.success && data?.accessToken && data?.refreshToken) {
        // Set the session using the tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        // Show different messages for login vs signup
        if (!isLogin) {
          toast.success('Account created! Your request has been submitted for review. You\'ll receive an email once approved.');
        } else {
          toast.success('Successfully verified!');
        }
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      // Get user's IP and user agent
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      // Call our custom send-otp edge function
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email,
          fullName: fullName || 'User',
          ipAddress: ip,
          userAgent: navigator.userAgent,
          captchaToken: captchaToken,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('New verification code sent!');
      setOtp('');
    } catch (error: any) {
      console.error('Resend code error:', error);
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp('');
    setRequiresCaptcha(false);
    setCaptchaToken(null);
    setRetryAfter(null);
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    toast.success('CAPTCHA verified');
  };

  const handleCaptchaError = () => {
    toast.error('CAPTCHA verification failed');
    setCaptchaToken(null);
  };

  const handleCaptchaExpire = () => {
    toast.error('CAPTCHA expired. Please try again.');
    setCaptchaToken(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md haven-card border-0">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={havenLogo} alt="Haven Workspace" className="h-12 md:h-16 w-auto" />
          </div>
          <CardDescription className="text-center text-base text-muted-foreground">
            {step === 'email' 
              ? 'Enter your email to receive a verification code'
              : 'Enter the 6-digit code sent to your email'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(v) => {
              setIsLogin(v === 'login');
              setStep('email');
            }}>
              <TabsList className="grid w-full grid-cols-2 bg-muted rounded-xl p-1 mb-6">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-card">Login</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-card">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSendCode} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold text-foreground">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="h-11 rounded-xl border-2 focus:ring-accent"
                    />
                  </div>
                  
                  {requiresCaptcha && (
                    <div className="space-y-2">
                      <HCaptchaComponent
                        onVerify={handleCaptchaVerify}
                        onError={handleCaptchaError}
                        onExpire={handleCaptchaExpire}
                      />
                    </div>
                  )}
                  
                  {retryAfter && (
                    <p className="text-sm text-destructive text-center">
                      Too many attempts. Please try again in {retryAfter} minutes.
                    </p>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || (retryAfter !== null && retryAfter > 0)}
                  >
                    {loading ? 'Sending code...' : 'Send Verification Code'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSendCode} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-semibold text-foreground">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="John Doe"
                      required
                      className="h-11 rounded-xl border-2 focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-semibold text-foreground">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="h-11 rounded-xl border-2 focus:ring-accent"
                    />
                  </div>
                  
                  {requiresCaptcha && (
                    <div className="space-y-2">
                      <HCaptchaComponent
                        onVerify={handleCaptchaVerify}
                        onError={handleCaptchaError}
                        onExpire={handleCaptchaExpire}
                      />
                    </div>
                  )}
                  
                  {retryAfter && (
                    <p className="text-sm text-destructive text-center">
                      Too many attempts. Please try again in {retryAfter} minutes.
                    </p>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || (retryAfter !== null && retryAfter > 0)}
                  >
                    {loading ? 'Sending code...' : 'Send Verification Code'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground text-center block">
                  Verification Code
                </Label>
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={otp} 
                    onChange={setOtp}
                    onComplete={handleVerifyOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Code sent to {email}
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleVerifyOtp} 
                  className="w-full" 
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleBack} 
                    variant="outline" 
                    className="flex-1"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleResendCode} 
                    variant="outline" 
                    className="flex-1"
                    disabled={loading}
                  >
                    Resend Code
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
