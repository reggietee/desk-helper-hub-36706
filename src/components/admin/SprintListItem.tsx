import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { 
  Calendar, Clock, Users, MapPin, Video, Monitor, 
  MoreHorizontal, Edit, Trash2, Power, PowerOff, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { formatTimeRange } from '@/lib/time-utils';

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
  created_at: string;
  participant_count?: number;
}

interface SprintListItemProps {
  sprint: Sprint;
  onEdit: (sprint: Sprint) => void;
  onViewParticipants: (sprint: Sprint) => void;
  onRefresh: () => void;
}

const HOSTING_ICONS = {
  haven: MapPin,
  google_meet: Video,
  daily: Monitor,
};

const HOSTING_LABELS = {
  haven: 'In person',
  google_meet: 'Google Meet',
  daily: 'Homebase',
};

export function SprintListItem({ sprint, onEdit, onViewParticipants, onRefresh }: SprintListItemProps) {
  const [loading, setLoading] = useState(false);
  
  const HostingIcon = HOSTING_ICONS[sprint.hosting_mode] || MapPin;
  const hostingLabel = HOSTING_LABELS[sprint.hosting_mode] || 'In person';
  const participantCount = sprint.participant_count || 0;
  const isFull = participantCount >= sprint.max_participants;
  
  // Determine sprint status for display
  const now = new Date();
  const sprintDateTime = new Date(`${sprint.sprint_date}T${sprint.start_time}`);
  const sprintEndDateTime = new Date(`${sprint.sprint_date}T${sprint.end_time}`);
  const isPast = now > sprintEndDateTime;
  const isHappeningNow = now >= sprintDateTime && now <= sprintEndDateTime;

  const handleToggleActive = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('coworking_sprints')
      .update({ is_active: !sprint.is_active })
      .eq('id', sprint.id);
    
    if (error) {
      toast.error('Failed to update sprint');
    } else {
      toast.success(sprint.is_active ? 'Sprint deactivated' : 'Sprint activated');
      onRefresh();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${sprint.title}"? This will remove all participants.`)) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('coworking_sprints')
      .delete()
      .eq('id', sprint.id);
    
    if (error) {
      toast.error('Failed to delete sprint');
    } else {
      toast.success('Sprint deleted');
      onRefresh();
    }
    setLoading(false);
  };

  return (
    <Card className={sprint.is_active ? 'border-primary/30' : 'border-muted'}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title and badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold truncate">{sprint.title}</h3>
            {sprint.is_active ? (
                <Badge className="bg-primary text-primary-foreground">Active</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
              {isPast && <Badge variant="outline" className="text-muted-foreground">Past</Badge>}
              {isHappeningNow && <Badge className="bg-accent text-accent-foreground">Now</Badge>}
              <Badge variant="outline">
                {sprint.allow_guests ? 'All Visitors' : 'Members Only'}
              </Badge>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(sprint.sprint_date + 'T00:00:00'), 'EEE, MMM d')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeRange(sprint.start_time, sprint.end_time)}
              </span>
              <span className="flex items-center gap-1">
                <HostingIcon className="h-3.5 w-3.5" />
                {hostingLabel}
              </span>
              <span className={`flex items-center gap-1 ${isFull ? 'text-destructive' : ''}`}>
                <Users className="h-3.5 w-3.5" />
                {participantCount} / {sprint.max_participants}
              </span>
            </div>

            {/* Description snippet */}
            {sprint.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                {sprint.description}
              </p>
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={loading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(sprint)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewParticipants(sprint)}>
                <Eye className="mr-2 h-4 w-4" />
                View Participants ({participantCount})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleActive}>
                {sprint.is_active ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
