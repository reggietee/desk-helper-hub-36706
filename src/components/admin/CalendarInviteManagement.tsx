import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { RefreshCw, Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
}

interface InviteLog {
  id: string;
  user_id: string;
  schedule_date: string;
  week_start_date: string | null;
  start_time: string;
  end_time: string;
  time_windows: string[];
  event_uid: string;
  action: string;
  status: string;
  provider_message_id: string | null;
  error: string | null;
  retry_count: number;
  created_at: string;
  sent_at: string | null;
}

interface ScheduleEntry {
  id: string;
  user_id: string;
  week_start_date: string;
  day_of_week: number;
  time_windows: string[];
}

interface DayStatus {
  date: string;
  dayOfWeek: number;
  timeWindows: string[];
  hasSchedule: boolean;
  inviteStatus: 'sent' | 'failed' | 'pending' | 'missing';
  lastLog?: InviteLog;
}

const STATUS_ICONS = {
  sent: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  sending: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
  missing: <AlertCircle className="h-4 w-4 text-orange-500" />,
  cancelled: <XCircle className="h-4 w-4 text-gray-500" />,
};

const STATUS_LABELS = {
  sent: 'Sent',
  failed: 'Failed',
  pending: 'Pending',
  sending: 'Sending',
  missing: 'Missing',
  cancelled: 'Cancelled',
};

export function CalendarInviteManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  // Get week start based on offset
  const getWeekStart = (offset: number) => {
    const today = new Date();
    const mondayThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    return addWeeks(mondayThisWeek, offset);
  };

  const weekStart = getWeekStart(weekOffset);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  // Load all approved members
  useEffect(() => {
    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('status', 'approved')
        .order('full_name');

      if (error) {
        console.error('Error loading profiles:', error);
        return;
      }

      setProfiles(data || []);
    };

    loadProfiles();
  }, []);

  // Load data when user or week changes
  useEffect(() => {
    if (selectedUserId) {
      loadUserData();
    }
  }, [selectedUserId, weekOffset]);

  const loadUserData = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      // Find user profile
      const user = profiles.find(p => p.id === selectedUserId);
      setSelectedUser(user || null);

      // Load schedules for this week
      const { data: schedules, error: schedError } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('week_start_date', weekStartStr);

      if (schedError) throw schedError;

      // Load invite logs for this week
      const { data: logs, error: logsError } = await supabase
        .from('calendar_invite_logs')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('week_start_date', weekStartStr)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Build day statuses
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const statuses: DayStatus[] = [];

      for (let i = 0; i < 7; i++) {
        const date = addWeeks(weekStart, 0);
        date.setDate(weekStart.getDate() + i);
        const dateStr = format(date, 'yyyy-MM-dd');

        const schedule = schedules?.find(s => s.day_of_week === i);
        const relevantLogs = (logs || []).filter(l => l.schedule_date === dateStr);
        const latestLog = relevantLogs[0]; // Already sorted desc

        let inviteStatus: DayStatus['inviteStatus'] = 'missing';
        if (latestLog) {
          if (latestLog.status === 'sent') inviteStatus = 'sent';
          else if (latestLog.status === 'failed') inviteStatus = 'failed';
          else if (latestLog.status === 'pending' || latestLog.status === 'sending') inviteStatus = 'pending';
        }

        statuses.push({
          date: dateStr,
          dayOfWeek: i,
          timeWindows: schedule?.time_windows || [],
          hasSchedule: !!schedule && (schedule.time_windows?.length || 0) > 0,
          inviteStatus,
          lastLog: latestLog,
        });
      }

      setDayStatuses(statuses);
    } catch (error: any) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendMissing = async () => {
    if (!selectedUser?.email) {
      toast({
        title: 'No email',
        description: 'User does not have an email address.',
        variant: 'destructive',
      });
      return;
    }

    // Find days that need resending
    const daysToSend = dayStatuses.filter(
      d => d.hasSchedule && (d.inviteStatus === 'missing' || d.inviteStatus === 'failed')
    );

    if (daysToSend.length === 0) {
      toast({
        title: 'Nothing to send',
        description: 'No missing or failed invites for this week.',
      });
      return;
    }

    setResending(true);
    try {
      const events = daysToSend.map(d => ({
        date: d.date,
        timeWindows: d.timeWindows,
        action: 'create' as const,
      }));

      const { data, error } = await supabase.functions.invoke('send-calendar-invite', {
        body: {
          userEmail: selectedUser.email,
          userId: selectedUserId,
          events,
          weekStartDate: weekStartStr,
          isResend: true,
        },
      });

      if (error) throw error;

      const summary = data?.summary;
      toast({
        title: 'Invites sent',
        description: `Sent ${summary?.sent || 0} of ${summary?.total || 0} invites.${summary?.failed ? ` ${summary.failed} failed.` : ''}`,
        variant: summary?.failed ? 'destructive' : 'default',
      });

      // Reload data
      await loadUserData();
    } catch (error: any) {
      console.error('Error resending invites:', error);
      toast({
        title: 'Error sending invites',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  const handleResendSingle = async (day: DayStatus) => {
    if (!selectedUser?.email) {
      toast({
        title: 'No email',
        description: 'User does not have an email address.',
        variant: 'destructive',
      });
      return;
    }

    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-calendar-invite', {
        body: {
          userEmail: selectedUser.email,
          userId: selectedUserId,
          events: [{
            date: day.date,
            timeWindows: day.timeWindows,
            action: 'create',
          }],
          weekStartDate: weekStartStr,
          isResend: true,
        },
      });

      if (error) throw error;

      const result = data?.results?.[0];
      toast({
        title: result?.success ? 'Invite sent' : 'Send failed',
        description: result?.success 
          ? `Calendar invite sent for ${day.date}` 
          : `Failed: ${result?.error || 'Unknown error'}`,
        variant: result?.success ? 'default' : 'destructive',
      });

      await loadUserData();
    } catch (error: any) {
      console.error('Error resending invite:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  const scheduledDaysCount = dayStatuses.filter(d => d.hasSchedule).length;
  const missingCount = dayStatuses.filter(d => d.hasSchedule && (d.inviteStatus === 'missing' || d.inviteStatus === 'failed')).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Calendar Invite Management
        </CardTitle>
        <CardDescription>
          View invite status and resend missing calendar invites
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Selection */}
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Select Member</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a member..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name} {p.email ? `(${p.email})` : '(no email)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(o => o - 1)}
            >
              ← Prev
            </Button>
            <div className="text-sm font-medium min-w-[120px] text-center">
              Week of {format(weekStart, 'MMM d')}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(o => o + 1)}
            >
              Next →
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              Today
            </Button>
          </div>
        </div>

        {selectedUserId && (
          <>
            {/* Summary Bar */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
              <div className="flex gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Scheduled days:</span>{' '}
                  <span className="font-medium">{scheduledDaysCount}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Missing/Failed:</span>{' '}
                  <span className={`font-medium ${missingCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {missingCount}
                  </span>
                </div>
              </div>
              
              {missingCount > 0 && (
                <Button
                  onClick={handleResendMissing}
                  disabled={resending}
                  className="gap-2"
                >
                  {resending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Resend Missing ({missingCount})
                </Button>
              )}
            </div>

            {/* Status Table */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading schedule data...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Time Windows</TableHead>
                    <TableHead>Invite Status</TableHead>
                    <TableHead>Message ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayStatuses.map((day) => (
                    <TableRow key={day.date} className={!day.hasSchedule ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">
                        {format(new Date(day.date + 'T12:00:00'), 'EEE, MMM d')}
                      </TableCell>
                      <TableCell>
                        {day.hasSchedule ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {day.timeWindows.length > 0 ? (
                          <div className="flex gap-1">
                            {day.timeWindows.includes('morning') && <span>☀️</span>}
                            {day.timeWindows.includes('afternoon') && <span>🌤</span>}
                            {day.timeWindows.includes('evening') && <span>🌙</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {day.hasSchedule ? (
                          <div className="flex items-center gap-2">
                            {STATUS_ICONS[day.inviteStatus as keyof typeof STATUS_ICONS] || STATUS_ICONS.missing}
                            <span className="text-sm">{STATUS_LABELS[day.inviteStatus as keyof typeof STATUS_LABELS] || 'Unknown'}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {day.lastLog?.provider_message_id ? (
                          <span className="text-muted-foreground">{day.lastLog.provider_message_id.slice(0, 12)}...</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {day.hasSchedule && (day.inviteStatus === 'missing' || day.inviteStatus === 'failed') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendSingle(day)}
                            disabled={resending}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Error Details */}
            {dayStatuses.some(d => d.lastLog?.error) && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Error Details</h4>
                <div className="space-y-2">
                  {dayStatuses
                    .filter(d => d.lastLog?.error)
                    .map(d => (
                      <div key={d.date} className="text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-2">
                        <span className="font-medium">{d.date}:</span>{' '}
                        <span className="text-red-700 dark:text-red-400">{d.lastLog?.error}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
