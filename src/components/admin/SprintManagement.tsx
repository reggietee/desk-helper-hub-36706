import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon, Users, Trash2, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  created_at: string;
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

const TIME_OPTIONS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

export function SprintManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Form state
  const [title, setTitle] = useState('Co-Working Sprint');
  const [description, setDescription] = useState('');
  const [sprintDate, setSprintDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [isActive, setIsActive] = useState(false);
  const [allowGuests, setAllowGuests] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    fetchSprint();
  }, []);

  const fetchSprint = async () => {
    setLoading(true);
    
    // Fetch the most recent sprint (active or not)
    const { data: sprints, error } = await supabase
      .from('coworking_sprints')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching sprint:', error);
      toast.error('Failed to load sprint');
      setLoading(false);
      return;
    }

    if (sprints && sprints.length > 0) {
      const s = sprints[0];
      setSprint(s);
      setTitle(s.title);
      setDescription(s.description || '');
      setSprintDate(new Date(s.sprint_date + 'T00:00:00'));
      setStartTime(s.start_time.slice(0, 5));
      setEndTime(s.end_time.slice(0, 5));
      setIsActive(s.is_active);
      setAllowGuests(s.allow_guests);
      
      // Fetch participants
      await fetchParticipants(s.id);
    }
    
    setLoading(false);
  };

  const fetchParticipants = async (sprintId: string) => {
    const { data, error } = await supabase
      .from('coworking_sprint_participants')
      .select('id, user_id, joined_at')
      .eq('sprint_id', sprintId)
      .order('joined_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }

    // Fetch profiles for participants
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
  };

  const handleSave = async () => {
    if (!sprintDate) {
      toast.error('Please select a date');
      return;
    }

    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);

    const sprintData = {
      title,
      description: description || null,
      sprint_date: format(sprintDate, 'yyyy-MM-dd'),
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      is_active: isActive,
      allow_guests: allowGuests,
    };

    let error;
    if (sprint) {
      // Update existing
      const result = await supabase
        .from('coworking_sprints')
        .update(sprintData)
        .eq('id', sprint.id);
      error = result.error;
    } else {
      // Create new
      const result = await supabase
        .from('coworking_sprints')
        .insert(sprintData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving sprint:', error);
      toast.error('Failed to save sprint');
    } else {
      toast.success('Sprint saved successfully');
      fetchSprint();
    }

    setSaving(false);
  };

  const handleClearSprint = async () => {
    if (!sprint) return;
    
    if (!confirm('Are you sure you want to delete this sprint? All participants will be removed.')) {
      return;
    }

    const { error } = await supabase
      .from('coworking_sprints')
      .delete()
      .eq('id', sprint.id);
    
    if (error) {
      console.error('Error deleting sprint:', error);
      toast.error('Failed to delete sprint');
    } else {
      toast.success('Sprint deleted');
      setSprint(null);
      setTitle('Co-Working Sprint');
      setDescription('');
      setSprintDate(undefined);
      setStartTime('10:00');
      setEndTime('12:00');
      setIsActive(false);
      setAllowGuests(false);
      setParticipants([]);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    const { error } = await supabase
      .from('coworking_sprint_participants')
      .delete()
      .eq('id', participantId);
    
    if (error) {
      console.error('Error removing participant:', error);
      toast.error('Failed to remove participant');
    } else {
      toast.success('Participant removed');
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Sprint Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {sprint ? 'Edit Sprint' : 'Create Sprint'}
          </CardTitle>
          <CardDescription>
            Configure the next co-working sprint session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Sprint Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co-Working Sprint"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Join us for a focused work session..."
              rows={3}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Sprint Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !sprintDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {sprintDate ? format(sprintDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={sprintDate}
                  onSelect={(date) => {
                    setSprintDate(date);
                    setDatePickerOpen(false);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Activate Sprint</Label>
              <p className="text-sm text-muted-foreground">
                When active, members will see the sprint on their dashboard
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Allow Guests Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Allow Guests to Join</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, guests can join this sprint (otherwise members only)
              </p>
            </div>
            <Switch
              checked={allowGuests}
              onCheckedChange={setAllowGuests}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Sprint'}
            </Button>
            {sprint && (
              <Button variant="destructive" onClick={handleClearSprint}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      {sprint && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Participants</CardTitle>
                <CardDescription>
                  Members who have joined this sprint
                </CardDescription>
              </div>
              <Badge variant={participants.length >= 4 ? "destructive" : "secondary"}>
                {participants.length} / 4 spots
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No participants yet
              </p>
            ) : (
              <div className="space-y-3">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{p.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{p.profile?.email || 'No email'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Joined {format(new Date(p.joined_at), 'MMM d, h:mm a')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParticipant(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
