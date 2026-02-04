import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SprintCard } from './SprintCard';
import { CoworkingSprintPlaceholder } from './CoworkingSprintPlaceholder';
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

interface SprintsListProps {
  userId: string;
  userName: string;
  userRole?: 'admin' | 'member' | 'guest' | null;
}

export function SprintsList({ userId, userName, userRole }: SprintsListProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [participantsMap, setParticipantsMap] = useState<Record<string, Participant[]>>({});
  const [loading, setLoading] = useState(true);

  const isGuest = userRole === 'guest';

  useEffect(() => {
    fetchActiveSprints();
    
    // Set up realtime subscription for participants
    const channel = supabase
      .channel('sprint-participants-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coworking_sprint_participants',
        },
        () => {
          // Refetch all participants when changes occur
          if (sprints.length > 0) {
            fetchAllParticipants(sprints.map(s => s.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (sprints.length > 0) {
      fetchAllParticipants(sprints.map(s => s.id));
    }
  }, [sprints.length]);

  const fetchActiveSprints = async () => {
    const { data, error } = await supabase
      .from('coworking_sprints')
      .select('*')
      .eq('is_active', true)
      .order('sprint_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching sprints:', error);
      setLoading(false);
      return;
    }

    // Filter out past sprints (ended more than 5 minutes ago)
    const now = new Date();
    const activeSprints = (data || []).filter(sprint => {
      const sprintEnd = new Date(`${sprint.sprint_date}T${sprint.end_time}`);
      const closedAfter = new Date(sprintEnd.getTime() + 5 * 60 * 1000);
      return now < closedAfter;
    }) as Sprint[];

    setSprints(activeSprints);
    setLoading(false);
  };

  const fetchAllParticipants = async (sprintIds: string[]) => {
    const { data, error } = await supabase
      .from('coworking_sprint_participants')
      .select('id, user_id, sprint_id')
      .in('sprint_id', sprintIds)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }

    if (data && data.length > 0) {
      // Fetch profiles for all participants
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Group participants by sprint
      const grouped: Record<string, Participant[]> = {};
      data.forEach(p => {
        const profile = profiles?.find(pr => pr.id === p.user_id);
        const participant = { ...p, profile };
        if (!grouped[p.sprint_id]) {
          grouped[p.sprint_id] = [];
        }
        grouped[p.sprint_id].push(participant);
      });

      setParticipantsMap(grouped);
    } else {
      setParticipantsMap({});
    }
  };

  const handleParticipantsChanged = (sprintId: string) => {
    // Refetch participants for this sprint
    fetchAllParticipants(sprints.map(s => s.id));
  };

  // Don't render if loading or no active sprints
  if (loading) return null;
  if (sprints.length === 0) return null;

  // Separate sprints into visible (guest can access) and locked (members only for guests)
  const visibleSprints = sprints.filter(s => !isGuest || s.allow_guests);
  const lockedSprints = sprints.filter(s => isGuest && !s.allow_guests);

  return (
    <div className="space-y-4">
      {/* Render visible sprints */}
      {visibleSprints.map(sprint => (
        <SprintCard
          key={sprint.id}
          sprint={sprint}
          participants={participantsMap[sprint.id] || []}
          userId={userId}
          userName={userName}
          onParticipantsChanged={() => handleParticipantsChanged(sprint.id)}
        />
      ))}

      {/* Render locked sprints for guests (show 1 as placeholder) */}
      {lockedSprints.length > 0 && (
        <LockedOverlay
          isLocked={true}
          message="Members only"
          teaser={`${lockedSprints.length} member-only sprint${lockedSprints.length > 1 ? 's' : ''} available`}
          modalTitle="Co-Working Sprints"
          modalDescription="Coworking sprints are scheduled, focused work sessions you can join with a small group. They're designed to help you commit to a time block, stay accountable, and build momentum together."
          hideContent={true}
          placeholder={<CoworkingSprintPlaceholder />}
        >
          <div />
        </LockedOverlay>
      )}
    </div>
  );
}
