import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Clock, CheckCircle2, Loader2, MapPin, Video, Monitor, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatTimeRange, isSprintClosed } from '@/lib/time-utils';

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
  hosting_mode: 'haven' | 'google_meet' | 'daily';
  meeting_link: string | null;
  daily_room_url: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  sprint_id: string;
  profile?: {
    full_name: string;
  };
}

interface SprintCardProps {
  sprint: Sprint;
  participants: Participant[];
  userId: string;
  userName: string;
  onParticipantsChanged: () => void;
}

const HAVEN_ADDRESS = '242 Mary St, Unit 8, Niagara-on-the-Lake, ON, Canada';

const HOSTING_INFO = {
  haven: { icon: MapPin, label: 'In person at Haven' },
  google_meet: { icon: Video, label: 'Virtual via Google Meet' },
  daily: { icon: Monitor, label: 'Virtual in Homebase' },
};

export function SprintCard({ sprint, participants, userId, userName, onParticipantsChanged }: SprintCardProps) {
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isJoined = participants.some(p => p.user_id === userId);
  const isFull = participants.length >= sprint.max_participants;
  const spotsRemaining = sprint.max_participants - participants.length;
  const isClosed = isSprintClosed(sprint.sprint_date, sprint.start_time);

  const sprintDateFormatted = format(new Date(sprint.sprint_date + 'T00:00:00'), 'EEEE, MMMM d');
  const timeRange = formatTimeRange(sprint.start_time, sprint.end_time);
  const accessLabel = sprint.allow_guests ? 'All Visitors' : 'Members Only';

  const hostingInfo = HOSTING_INFO[sprint.hosting_mode] || HOSTING_INFO.haven;
  const HostingIcon = hostingInfo.icon;

  const handleJoin = async () => {
    if (isJoined || isFull || isClosed) return;

    setJoining(true);

    // First, verify the sprint is still joinable with fresh data
    const { data: freshSprint, error: sprintError } = await supabase
      .from('coworking_sprints')
      .select('id, max_participants, is_active')
      .eq('id', sprint.id)
      .maybeSingle();

    if (sprintError || !freshSprint || !freshSprint.is_active) {
      toast.error('Sprint is no longer available');
      setJoining(false);
      return;
    }

    // Check current participant count
    const { count, error: countError } = await supabase
      .from('coworking_sprint_participants')
      .select('*', { count: 'exact', head: true })
      .eq('sprint_id', sprint.id);

    if (countError) {
      console.error('Error checking capacity:', countError);
      toast.error('Failed to join sprint');
      setJoining(false);
      return;
    }

    if ((count || 0) >= freshSprint.max_participants) {
      toast.error('Sprint is now full');
      onParticipantsChanged();
      setJoining(false);
      return;
    }

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

    // Send notification to admin (fire and forget)
    supabase.functions.invoke('send-notification', {
      body: {
        type: 'sprint_join',
        data: {
          user_name: userName,
          user_email: (await supabase.auth.getUser()).data.user?.email,
          sprint_title: sprint.title,
          sprint_date: format(new Date(sprint.sprint_date), 'EEEE, MMMM d, yyyy'),
          sprint_time: timeRange,
          current_count: (count || 0) + 1,
          max_count: sprint.max_participants,
        }
      }
    }).catch(err => console.error('Error sending notification:', err));

    toast.success("You've joined the sprint!");
    onParticipantsChanged();
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!isJoined) return;

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
    onParticipantsChanged();
    setLeaving(false);
  };

  const getJoinContent = () => {
    if (isClosed) {
      return (
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            This coworking sprint has closed.
          </p>
        </div>
      );
    }

    if (isJoined) {
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              You're In!
            </Button>
            <Button variant="outline" onClick={handleLeave} disabled={leaving}>
              {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Leave'}
            </Button>
          </div>

          {sprint.hosting_mode === 'haven' && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <p className="font-medium text-foreground">See you at Haven!</p>
              <p className="text-xs mt-1">{HAVEN_ADDRESS}</p>
            </div>
          )}

          {sprint.hosting_mode === 'google_meet' && sprint.meeting_link && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(sprint.meeting_link!, '_blank')}
            >
              <Video className="mr-2 h-4 w-4" />
              Join Google Meet
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          )}

          {sprint.hosting_mode === 'google_meet' && !sprint.meeting_link && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <p>The Google Meet link will be sent 5 minutes before the sprint starts.</p>
            </div>
          )}

          {sprint.hosting_mode === 'daily' && sprint.daily_room_url && (
            <Button
              variant="default"
              className="w-full"
              onClick={() => window.open(sprint.daily_room_url!, '_blank')}
            >
              <Monitor className="mr-2 h-4 w-4" />
              Join Video Room
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          )}

          {sprint.hosting_mode === 'daily' && !sprint.daily_room_url && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <p>The video room is being set up. Check back soon!</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <Button className="w-full" onClick={handleJoin} disabled={joining || isFull}>
        {joining ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Users className="mr-2 h-4 w-4" />
        )}
        {isFull ? 'Sprint is Full' : "I'm In!"}
      </Button>
    );
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-accent shrink-0" />
              <span className="truncate">{sprint.title}</span>
            </CardTitle>
            {sprint.description && (
              <CardDescription className="text-sm line-clamp-2">
                {sprint.description}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <Badge variant={isFull ? "destructive" : "secondary"}>
              {isFull ? 'Full' : `${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} left`}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {accessLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date, Time & Hosting */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {sprintDateFormatted}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {timeRange}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <HostingIcon className="h-4 w-4" />
            {hostingInfo.label}
          </div>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Who's in:</p>
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
            style={{ width: `${(participants.length / sprint.max_participants) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {participants.length} of {sprint.max_participants} spots filled
        </p>

        {/* Action Button / Join Content */}
        {getJoinContent()}
      </CardContent>
    </Card>
  );
}
