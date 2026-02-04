import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { CalendarIcon, Save, MapPin, Video, Monitor, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatTo12Hour } from '@/lib/time-utils';

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
  daily_room_name: string | null;
  created_at: string;
}

interface SprintFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint: Sprint | null;
  onSaved: () => void;
  existingParticipantCount?: number;
}

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

const HOSTING_MODES = [
  { value: 'haven', label: 'In person at Haven', icon: MapPin },
  { value: 'google_meet', label: 'Virtual via Google Meet', icon: Video },
  { value: 'daily', label: 'Virtual in Homebase (Daily.co)', icon: Monitor },
] as const;

export function SprintFormModal({ open, onOpenChange, sprint, onSaved, existingParticipantCount = 0 }: SprintFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('Co-Working Sprint');
  const [description, setDescription] = useState('');
  const [sprintDate, setSprintDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [isActive, setIsActive] = useState(false);
  const [allowGuests, setAllowGuests] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [hostingMode, setHostingMode] = useState<'haven' | 'google_meet' | 'daily'>('haven');
  const [meetingLink, setMeetingLink] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Reset form when sprint changes
  useEffect(() => {
    if (sprint) {
      setTitle(sprint.title);
      setDescription(sprint.description || '');
      setSprintDate(new Date(sprint.sprint_date + 'T00:00:00'));
      setStartTime(sprint.start_time.slice(0, 5));
      setEndTime(sprint.end_time.slice(0, 5));
      setIsActive(sprint.is_active);
      setAllowGuests(sprint.allow_guests);
      setMaxParticipants(sprint.max_participants);
      setHostingMode(sprint.hosting_mode || 'haven');
      setMeetingLink(sprint.meeting_link || '');
    } else {
      // New sprint defaults
      setTitle('Co-Working Sprint');
      setDescription('');
      setSprintDate(undefined);
      setStartTime('10:00');
      setEndTime('12:00');
      setIsActive(false);
      setAllowGuests(false);
      setMaxParticipants(4);
      setHostingMode('haven');
      setMeetingLink('');
    }
  }, [sprint, open]);

  const handleSave = async () => {
    if (!sprintDate) {
      toast.error('Please select a date');
      return;
    }

    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }

    if (hostingMode === 'google_meet' && !meetingLink.trim()) {
      toast.error('Please enter a Google Meet link');
      return;
    }

    if (maxParticipants < 1) {
      toast.error('Capacity must be at least 1');
      return;
    }

    if (sprint && maxParticipants < existingParticipantCount) {
      const confirmed = window.confirm(
        `There are currently ${existingParticipantCount} participants. ` +
        `Reducing capacity to ${maxParticipants} won't remove anyone, ` +
        `but new participants won't be able to join until spots open. Continue?`
      );
      if (!confirmed) return;
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
      max_participants: maxParticipants,
      hosting_mode: hostingMode,
      meeting_link: hostingMode === 'google_meet' ? meetingLink.trim() : null,
    };

    let error;
    let newSprintId: string | null = null;

    if (sprint) {
      const result = await supabase
        .from('coworking_sprints')
        .update(sprintData)
        .eq('id', sprint.id);
      error = result.error;
      newSprintId = sprint.id;
    } else {
      const result = await supabase
        .from('coworking_sprints')
        .insert(sprintData)
        .select('id')
        .single();
      error = result.error;
      newSprintId = result.data?.id || null;
    }

    if (error) {
      console.error('Error saving sprint:', error);
      toast.error('Failed to save sprint');
    } else {
      // If Daily.co mode and new sprint, create room
      if (hostingMode === 'daily' && newSprintId && !sprint?.daily_room_url) {
        try {
          const { error: roomError } = await supabase.functions.invoke('create-daily-room', {
            body: { sprint_id: newSprintId }
          });
          if (roomError) {
            console.error('Error creating Daily room:', roomError);
            toast.error('Sprint saved, but Daily room creation failed.');
          }
        } catch (err) {
          console.error('Error invoking create-daily-room:', err);
        }
      }
      toast.success(sprint ? 'Sprint updated' : 'Sprint created');
      onSaved();
      onOpenChange(false);
    }

    setSaving(false);
  };

  const handleDuplicate = async () => {
    if (!sprint || !sprintDate) return;
    
    setSaving(true);
    
    const sprintData = {
      title: title + ' (Copy)',
      description: description || null,
      sprint_date: format(sprintDate, 'yyyy-MM-dd'),
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      is_active: false, // Duplicates start as draft
      allow_guests: allowGuests,
      max_participants: maxParticipants,
      hosting_mode: hostingMode,
      meeting_link: hostingMode === 'google_meet' ? meetingLink.trim() : null,
    };

    const { error } = await supabase
      .from('coworking_sprints')
      .insert(sprintData);

    if (error) {
      console.error('Error duplicating sprint:', error);
      toast.error('Failed to duplicate sprint');
    } else {
      toast.success('Sprint duplicated as draft');
      onSaved();
      onOpenChange(false);
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sprint ? 'Edit Sprint' : 'Create Sprint'}</DialogTitle>
          <DialogDescription>
            {sprint ? 'Update sprint details' : 'Set up a new co-working sprint session'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
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
              rows={2}
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
                  <SelectValue>{formatTo12Hour(startTime)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(time => (
                    <SelectItem key={time} value={time}>{formatTo12Hour(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue>{formatTo12Hour(endTime)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(time => (
                    <SelectItem key={time} value={time}>{formatTo12Hour(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (spots)</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              max={50}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            />
            {sprint && existingParticipantCount > maxParticipants && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Current participants ({existingParticipantCount}) exceeds new capacity
              </p>
            )}
          </div>

          {/* Hosting Mode */}
          <div className="space-y-2">
            <Label>Hosting Mode</Label>
            <div className="grid gap-2">
              {HOSTING_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <div
                    key={mode.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      hostingMode === mode.value 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                    onClick={() => setHostingMode(mode.value)}
                  >
                    <Icon className={cn(
                      "h-4 w-4",
                      hostingMode === mode.value ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      hostingMode === mode.value ? "text-primary" : ""
                    )}>
                      {mode.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Google Meet Link (conditional) */}
          {hostingMode === 'google_meet' && (
            <div className="space-y-2">
              <Label htmlFor="meetingLink">Google Meet Link *</Label>
              <Input
                id="meetingLink"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
            </div>
          )}

          {/* Daily.co info */}
          {hostingMode === 'daily' && (
            <div className="rounded-lg border border-muted p-3 bg-muted/30">
              <p className="text-sm text-muted-foreground">
                A video room will be created automatically when you save.
              </p>
            </div>
          )}

          {/* Haven address info */}
          {hostingMode === 'haven' && (
            <div className="rounded-lg border border-muted p-3 bg-muted/30">
              <p className="text-sm text-muted-foreground">
                <strong>Location:</strong> 242 Mary St, Unit 8, Niagara-on-the-Lake, ON
              </p>
            </div>
          )}

          {/* Toggle: Active */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Activate Sprint</Label>
              <p className="text-xs text-muted-foreground">
                Visible on dashboard when active
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Toggle: Allow Guests */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Allow Guests</Label>
              <p className="text-xs text-muted-foreground">
                Guests can join (otherwise members only)
              </p>
            </div>
            <Switch checked={allowGuests} onCheckedChange={setAllowGuests} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : sprint ? 'Update Sprint' : 'Create Sprint'}
            </Button>
            {sprint && (
              <Button variant="outline" onClick={handleDuplicate} disabled={saving}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
