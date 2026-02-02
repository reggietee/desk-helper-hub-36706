import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LockedOverlay } from '@/components/ui/locked-overlay';

interface Sprint {
  id: string;
  title: string;
  description: string | null;
  sprint_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  is_active: boolean;
  allow_guests: boolean;
}

interface Participant {
  id: string;
  user_id: string;
  profile?: {
    full_name: string;
  };
}

interface CoworkingSprintCardProps {
  userId: string;
  userName: string;
  userRole?: 'admin' | 'member' | 'guest' | null;
}

export function CoworkingSprintCard({ userId, userName, userRole }: CoworkingSprintCardProps) {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isJoined = participants.some(p => p.user_id === userId);
  const isFull = participants.length >= (sprint?.max_participants || 4);
  const spotsRemaining = (sprint?.max_participants || 4) - participants.length;
  
  // Check if user can access the sprint
  const isGuest = userRole === 'guest';
  const canAccess = !isGuest || sprint?.allow_guests;

  useEffect(() => {
    fetchActiveSprint();
    
    // Set up realtime subscription for participants
    const channel = supabase
      .channel('sprint-participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coworking_sprint_participants',
        },
        () => {
          // Refetch participants when changes occur
          if (sprint?.id) {
            fetchParticipants(sprint.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (sprint?.id) {
      fetchParticipants(sprint.id);
    }
  }, [sprint?.id]);

  const fetchActiveSprint = async () => {
    const { data, error } = await supabase
      .from('coworking_sprints')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching sprint:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setSprint(data[0]);
    }
    setLoading(false);
  };

  const fetchParticipants = async (sprintId: string) => {
    const { data, error } = await supabase
      .from('coworking_sprint_participants')
      .select('id, user_id')
      .eq('sprint_id', sprintId)
      .order('joined_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }

    if (data && data.length > 0) {
      // Fetch names for participants
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const participantsWithProfiles = data.map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.id === p.user_id)
      }));
      
      setParticipants(participantsWithProfiles);
    } else {
      setParticipants([]);
    }
  };

  const handleJoin = async () => {
    if (!sprint || isJoined || isFull) return;
    
    setJoining(true);
    
    // Insert participant record
    const { error: insertError } = await supabase
      .from('coworking_sprint_participants')
      .insert({
        sprint_id: sprint.id,
        user_id: userId,
      });
    
    if (insertError) {
      console.error('Error joining sprint:', insertError);
      if (insertError.code === '23505') {
        toast.error('You have already joined this sprint');
      } else if (insertError.message.includes('row-level security')) {
        toast.error('Sprint is full or no longer available');
      } else {
        toast.error('Failed to join sprint');
      }
      setJoining(false);
      return;
    }

    // Send notification to admin
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'sprint_join',
          data: {
            user_name: userName,
            user_email: (await supabase.auth.getUser()).data.user?.email,
            sprint_title: sprint.title,
            sprint_date: format(new Date(sprint.sprint_date), 'EEEE, MMMM d, yyyy'),
            sprint_time: `${sprint.start_time.slice(0, 5)} - ${sprint.end_time.slice(0, 5)}`,
            current_count: participants.length + 1,
            max_count: sprint.max_participants,
          }
        }
      });
    } catch (err) {
      console.error('Error sending notification:', err);
      // Don't fail the join if notification fails
    }

    // Mark notification as sent
    await supabase
      .from('coworking_sprint_participants')
      .update({ notification_sent: true })
      .eq('sprint_id', sprint.id)
      .eq('user_id', userId);

    toast.success("You've joined the sprint!");
    fetchParticipants(sprint.id);
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!sprint || !isJoined) return;
    
    setLeaving(true);
    
    const { error } = await supabase
      .from('coworking_sprint_participants')
      .delete()
      .eq('sprint_id', sprint.id)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error leaving sprint:', error);
      toast.error('Failed to leave sprint');
      setLeaving(false);
      return;
    }

    toast.success("You've left the sprint");
    fetchParticipants(sprint.id);
    setLeaving(false);
  };

  // Don't render if no active sprint or still loading
  if (loading) return null;
  if (!sprint) return null;

  const sprintDateFormatted = format(new Date(sprint.sprint_date + 'T00:00:00'), 'EEEE, MMMM d');
  const timeRange = `${sprint.start_time.slice(0, 5)} – ${sprint.end_time.slice(0, 5)}`;

  const sprintContent = (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-accent" />
              {sprint.title}
            </CardTitle>
            {sprint.description && (
              <CardDescription className="text-sm">
                {sprint.description}
              </CardDescription>
            )}
          </div>
          <Badge 
            variant={isFull ? "destructive" : "secondary"}
            className="shrink-0"
          >
            {isFull ? 'Full' : `${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} left`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date & Time */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {sprintDateFormatted}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {timeRange}
          </div>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Who's in:
            </p>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <Badge 
                  key={p.id} 
                  variant="outline"
                  className={p.user_id === userId ? 'border-accent bg-accent/10' : ''}
                >
                  {p.profile?.full_name || 'Member'}
                  {p.user_id === userId && ' (you)'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Capacity indicator */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${(participants.length / (sprint.max_participants || 4)) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {participants.length} of {sprint.max_participants} spots filled
        </p>

        {/* Action Button */}
        {isJoined ? (
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              className="flex-1"
              disabled
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              You're In!
            </Button>
            <Button 
              variant="outline"
              onClick={handleLeave}
              disabled={leaving}
            >
              {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Leave'}
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full"
            onClick={handleJoin}
            disabled={joining || isFull}
          >
            {joining ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
            {isFull ? 'Sprint is Full' : "I'm In!"}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  // If guest and sprint doesn't allow guests, show locked overlay
  if (isGuest && !sprint.allow_guests) {
    return (
      <LockedOverlay isLocked={true} message="Members only">
        {sprintContent}
      </LockedOverlay>
    );
  }

  return sprintContent;
}
