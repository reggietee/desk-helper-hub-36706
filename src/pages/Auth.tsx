import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { z } from 'zod';
import havenLogo from '@/assets/haven-logo.svg';

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

      setEmail(emailValue);
      setFullName(fullNameValue || '');

      const { error } = await supabase.auth.signInWithOtp({
        email: emailValue,
        options: {
          data: {
            full_name: fullNameValue || 'User',
          },
        },
      });

      if (error) throw error;
      
      toast.success('Verification code sent to your email!');
      setStep('otp');
    } catch (error: any) {
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
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;
      
      toast.success('Successfully verified!');
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            full_name: fullName || 'User',
          },
        },
      });

      if (error) throw error;
      toast.success('New verification code sent!');
      setOtp('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
                  <Button type="submit" className="w-full" disabled={loading}>
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
                  <Button type="submit" className="w-full" disabled={loading}>
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
