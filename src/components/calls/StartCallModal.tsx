import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Video, Copy, ExternalLink, Check, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StartCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallStarted?: (callId: string) => void;
}

interface CallData {
  id: string;
  call_name: string;
  daily_room_url: string;
}

export function StartCallModal({ open, onOpenChange, onCallStarted }: StartCallModalProps) {
  const navigate = useNavigate();
  const [callName, setCallName] = useState('Haven Call');
  const [note, setNote] = useState('');
  const [allowGuests, setAllowGuests] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdCall, setCreatedCall] = useState<CallData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleStartCall = async () => {
    setCreating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to start a call');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-daily-call', {
        body: {
          call_name: callName,
          note: note || null,
          allow_guests: allowGuests,
        },
      });

      if (error) {
        console.error('Error creating call:', error);
        toast.error('Failed to create call');
        return;
      }

      if (data?.success && data.call) {
        setCreatedCall(data.call);
        toast.success('Call started successfully!');
        onCallStarted?.(data.call.id);
      } else {
        toast.error(data?.error || 'Failed to create call');
      }
    } catch (err) {
      console.error('Error starting call:', err);
      toast.error('Failed to start call');
    } finally {
      setCreating(false);
    }
  };

  const getInviteLink = () => {
    if (!createdCall) return '';
    // Create an in-app link that routes to the call room
    return `${window.location.origin}/call/${createdCall.id}`;
  };

  const handleCopyLink = async () => {
    const link = getInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    const link = getInviteLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: createdCall?.call_name || 'Haven Call',
          text: `Join me on a video call: ${createdCall?.call_name}`,
          url: link,
        });
      } catch (err) {
        // User cancelled share, ignore
      }
    } else {
      handleCopyLink();
    }
  };

  const handleJoinCall = () => {
    if (createdCall) {
      handleClose();
      navigate(`/call/${createdCall.id}`);
    }
  };

  const handleClose = () => {
    setCreatedCall(null);
    setCallName('Haven Call');
    setNote('');
    setAllowGuests(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Start a Daily Call
          </DialogTitle>
          <DialogDescription>
            {createdCall
              ? 'Your call is ready! Share the invite link with others.'
              : 'Create a video call and invite others to join.'}
          </DialogDescription>
        </DialogHeader>

        {!createdCall ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="callName">Call Name</Label>
              <Input
                id="callName"
                value={callName}
                onChange={(e) => setCallName(e.target.value)}
                placeholder="Haven Call"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note / Agenda (optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this call about?"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Allow Guests</Label>
                <p className="text-xs text-muted-foreground">
                  Let guests join this call (otherwise members only)
                </p>
              </div>
              <Switch
                checked={allowGuests}
                onCheckedChange={setAllowGuests}
              />
            </div>

            <Button
              onClick={handleStartCall}
              disabled={creating || !callName.trim()}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Call...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Start Call
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">{createdCall.call_name}</p>
              <div className="flex items-center gap-2">
                <Input
                  value={getInviteLink()}
                  readOnly
                  className="text-xs bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleJoinCall} className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Join in Homebase
              </Button>
              <Button variant="outline" onClick={handleShare} className="w-full">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>

            <Button variant="ghost" onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
