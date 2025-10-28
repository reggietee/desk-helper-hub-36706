import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import havenLogo from '@/assets/haven-logo.svg';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const { error } = await supabase.functions.invoke('reset-password', {
        body: { token, newPassword },
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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-haven-offwhite p-4">
        <Card className="w-full max-w-md haven-card border-0">
          <CardHeader>
            <CardTitle className="text-center text-haven-charcoal">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                minLength={6}
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
                minLength={6}
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