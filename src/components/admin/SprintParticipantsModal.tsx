import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatTimeRange } from '@/lib/time-utils';

interface Sprint {
  id: string;
  title: string;
  sprint_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
}

interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    full_name: string;
    email: string | null;
  };
}

interface SprintParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint: Sprint | null;
  onParticipantRemoved: () => void;
}

export function SprintParticipantsModal({ open, onOpenChange, sprint, onParticipantRemoved }: SprintParticipantsModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && sprint) {
      fetchParticipants();
    }
  }, [open, sprint?.id]);

  const fetchParticipants = async () => {
    if (!sprint) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('coworking_sprint_participants')
      .select('id, user_id, joined_at')
      .eq('sprint_id', sprint.id)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const participantsWithProfiles = data.map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.id === p.user_id)
      }));

      setParticipants(participantsWithProfiles);
    } else {
      setParticipants([]);
    }
    setLoading(false);
  };

  const handleRemoveParticipant = async (participantId: string) => {
    const { error } = await supabase
      .from('coworking_sprint_participants')
      .delete()
      .eq('id', participantId);

    if (error) {
      toast.error('Failed to remove participant');
    } else {
      toast.success('Participant removed');
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      onParticipantRemoved();
    }
  };

  if (!sprint) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants
          </DialogTitle>
          <DialogDescription>
            {sprint.title} • {format(new Date(sprint.sprint_date + 'T00:00:00'), 'MMM d')} • {formatTimeRange(sprint.start_time, sprint.end_time)}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <Badge variant={participants.length >= sprint.max_participants ? "destructive" : "secondary"}>
              {participants.length} / {sprint.max_participants} spots filled
            </Badge>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-4">Loading...</p>
          ) : participants.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No participants yet
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.profile?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.profile?.email || 'No email'} • Joined {format(new Date(p.joined_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="shrink-0 ml-2"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
