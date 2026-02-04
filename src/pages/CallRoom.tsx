import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, ExternalLink, LogOut, Clock, User, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LockedOverlay } from '@/components/ui/locked-overlay';
import { useUserRole } from '@/hooks/useUserRole';

interface CallData {
  id: string;
  call_name: string;
  note: string | null;
  daily_room_url: string;
  created_by: string;
  created_at: string;
  status: string;
  allow_guests: boolean;
}

interface CreatorProfile {
  full_name: string;
}

export default function CallRoom() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [call, setCall] = useState<CallData | null>(null);
  const [creatorName, setCreatorName] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ending, setEnding] = useState(false);
  const [joined, setJoined] = useState(false);

  const { role, isGuest } = useUserRole(userId);

  useEffect(() => {
    const loadCall = async () => {
      // Check auth first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Store the intended destination and redirect to login
        sessionStorage.setItem('redirectAfterLogin', `/call/${callId}`);
        toast.info('Please sign in to join this call');
        navigate('/auth');
        return;
      }

      setUserId(session.user.id);

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (roles && roles.some(r => r.role === 'admin')) {
        setIsAdmin(true);
      }

      // Fetch call data
      const { data: callData, error } = await supabase
        .from('daily_calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (error || !callData) {
        toast.error('Call not found or has ended');
        navigate('/dashboard');
        return;
      }

      // Type assertion since we know the shape
      const typedCall = callData as unknown as CallData;
      setCall(typedCall);

      // Fetch creator name
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', typedCall.created_by)
        .single();

      if (creatorProfile) {
        setCreatorName((creatorProfile as CreatorProfile).full_name);
      }

      setLoading(false);
    };

    loadCall();
  }, [callId, navigate]);

  // Check after login redirect
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      sessionStorage.removeItem('redirectAfterLogin');
    }
  }, []);

  const handleJoinCall = () => {
    if (call?.daily_room_url) {
      setJoined(true);
    }
  };

  const handleOpenInBrowser = () => {
    if (call?.daily_room_url) {
      window.open(call.daily_room_url, '_blank');
    }
  };

  const handleEndCall = async () => {
    if (!call) return;
    
    setEnding(true);
    try {
      const { error } = await supabase.functions.invoke('end-daily-call', {
        body: { call_id: call.id },
      });

      if (error) {
        toast.error('Failed to end call');
      } else {
        toast.success('Call ended');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Failed to end call');
    } finally {
      setEnding(false);
    }
  };

  const handleLeaveCall = () => {
    setJoined(false);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading call...</p>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Call Not Found
            </CardTitle>
            <CardDescription>
              This call may have ended or the link is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if call has ended
  if (call.status === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              Call Ended
            </CardTitle>
            <CardDescription>
              This call has ended. You can no longer join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check guest access
  if (isGuest && !call.allow_guests) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              {call.call_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LockedOverlay
              isLocked={true}
              message="Members only"
              teaser="This call is only available to Haven members."
              modalTitle="Members Only Call"
              modalDescription="The host has restricted this call to members only. Please contact a Haven admin if you need access."
            >
              <div className="h-32" />
            </LockedOverlay>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show embedded call view
  if (joined) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header bar */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-primary" />
            <span className="font-medium">{call.call_name}</span>
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenInBrowser}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Browser
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLeaveCall}>
              <LogOut className="mr-2 h-4 w-4" />
              Leave Call
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEndCall}
                disabled={ending}
                className="text-destructive hover:text-destructive"
              >
                {ending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                End Call
              </Button>
            )}
          </div>
        </div>

        {/* Embedded Daily iframe */}
        <div className="flex-1">
          <iframe
            src={call.daily_room_url}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            style={{ minHeight: 'calc(100vh - 60px)' }}
          />
        </div>
      </div>
    );
  }

  // Pre-join screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              {call.call_name}
            </CardTitle>
            <Badge variant="secondary">
              Active
            </Badge>
          </div>
          {call.note && (
            <CardDescription>{call.note}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Started by {creatorName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {new Date(call.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleJoinCall} className="w-full">
              <Video className="mr-2 h-4 w-4" />
              Join in Homebase
            </Button>
            <Button variant="outline" onClick={handleOpenInBrowser} className="w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Browser
            </Button>
          </div>

          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-full">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
