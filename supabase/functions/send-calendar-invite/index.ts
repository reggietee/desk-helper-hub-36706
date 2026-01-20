import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalendarEvent {
  date: string; // YYYY-MM-DD
  timeWindows: string[];
  action: 'create' | 'update' | 'cancel';
  eventUid?: string;
  sequenceNumber?: number;
}

interface CalendarInviteRequest {
  userEmail: string;
  userId: string;
  events: CalendarEvent[];
  weekStartDate?: string; // Optional: for tracking
  isResend?: boolean; // Flag to indicate admin resend
}

// Time window definitions (America/Toronto timezone)
const TIME_WINDOWS = {
  morning: { start: '09:00', end: '12:00', label: 'Morning' },
  afternoon: { start: '12:00', end: '18:00', label: 'Afternoon' },
  evening: { start: '18:00', end: '21:00', label: 'Evening' },
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function getEventTimes(timeWindows: string[]): { start: string; end: string } {
  const windows = timeWindows.map(tw => TIME_WINDOWS[tw as keyof typeof TIME_WINDOWS]).filter(Boolean);
  
  if (windows.length === 0) {
    return { start: '09:00', end: '17:00' };
  }

  // Find earliest start and latest end
  const starts = windows.map(w => w.start).sort();
  const ends = windows.map(w => w.end).sort();
  
  return {
    start: starts[0],
    end: ends[ends.length - 1],
  };
}

function formatTimeWindowsDescription(timeWindows: string[]): string {
  const labels = timeWindows
    .map(tw => TIME_WINDOWS[tw as keyof typeof TIME_WINDOWS]?.label)
    .filter(Boolean);
  
  return labels.join(' + ');
}

function formatDateForICS(date: string, time: string): string {
  // Convert YYYY-MM-DD and HH:MM to ICS format: YYYYMMDDTHHMMSS
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  return `${year}${month}${day}T${hour}${minute}00`;
}

// Helper function to properly encode UTF-8 string to base64
function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

// Helper to sleep for retry backoff
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calculate week start date for a given date (Monday of that week)
function getWeekStartDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone issues
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function generateICS(
  event: CalendarEvent,
  userEmail: string,
  eventUid: string,
  sequenceNumber: number
): string {
  const { start, end } = getEventTimes(event.timeWindows);
  const timeWindowsDesc = formatTimeWindowsDescription(event.timeWindows);
  
  const dtStart = formatDateForICS(event.date, start);
  const dtEnd = formatDateForICS(event.date, end);
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const status = event.action === 'cancel' ? 'CANCELLED' : 'CONFIRMED';
  const method = event.action === 'cancel' ? 'CANCEL' : (event.action === 'update' ? 'REQUEST' : 'REQUEST');
  
  const description = event.action === 'cancel' 
    ? 'This coworking session has been cancelled.'
    : `Planned coworking session at Haven - ${timeWindowsDesc}.`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Haven Terminal//Calendar//EN
METHOD:${method}
BEGIN:VTIMEZONE
TZID:America/Toronto
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:${eventUid}
DTSTAMP:${dtstamp}
DTSTART;TZID=America/Toronto:${dtStart}
DTEND;TZID=America/Toronto:${dtEnd}
SUMMARY:Coworking at Haven
LOCATION:242 Mary St, Unit 8, Niagara-on-the-Lake, ON Canada
DESCRIPTION:${description}
STATUS:${status}
SEQUENCE:${sequenceNumber}
ORGANIZER:mailto:info@havenworkspace.ca
ATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${userEmail}
END:VEVENT
END:VCALENDAR`;
}

// Send email with retries
async function sendEmailWithRetry(
  emailParams: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    attachments: { filename: string; content: string }[];
  },
  maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; messageId?: string; error?: string; attempts: number }> {
  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${maxRetries}] Sending email to ${emailParams.to[0]}`);
      
      const emailResponse = await resend.emails.send(emailParams);
      
      if (emailResponse.error) {
        lastError = emailResponse.error.message || JSON.stringify(emailResponse.error);
        console.error(`[Attempt ${attempt}] Resend API error:`, lastError);
        
        if (attempt < maxRetries) {
          await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
          continue;
        }
      } else {
        console.log(`[Attempt ${attempt}] Email sent successfully, ID:`, emailResponse.data?.id);
        return { 
          success: true, 
          messageId: emailResponse.data?.id, 
          attempts: attempt 
        };
      }
    } catch (error: any) {
      lastError = error.message || String(error);
      console.error(`[Attempt ${attempt}] Exception sending email:`, lastError);
      
      if (attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
    }
  }
  
  return { success: false, error: lastError, attempts: maxRetries };
}

interface ProcessResult {
  date: string;
  action: string;
  success: boolean;
  messageId?: string;
  error?: string;
  attempts?: number;
  logId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== Calendar invite function called ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userEmail, userId, events, weekStartDate, isResend }: CalendarInviteRequest = await req.json();
    
    console.log(`Processing ${events.length} calendar events for ${userEmail} (user: ${userId})`);
    console.log(`Events to process:`, JSON.stringify(events.map(e => ({ date: e.date, action: e.action, windows: e.timeWindows }))));

    if (!userEmail || !userId || !events || events.length === 0) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: userEmail, userId, and events are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: ProcessResult[] = [];
    const errors: { date: string; error: string }[] = [];

    // Process events sequentially with proper awaiting using for...of
    for (const event of events) {
      const eventStartTime = Date.now();
      console.log(`\n--- Processing event for date: ${event.date}, action: ${event.action} ---`);
      
      let logId: string | undefined;
      
      try {
        let eventUid = event.eventUid;
        let sequenceNumber = event.sequenceNumber || 0;
        const { start, end } = getEventTimes(event.timeWindows);
        const weekStart = weekStartDate || getWeekStartDate(event.date);

        // Check if we have an existing calendar event for this date
        const { data: existingEvent, error: fetchError } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .eq('schedule_date', event.date)
          .maybeSingle();

        if (fetchError) {
          console.error(`Error fetching existing event for ${event.date}:`, fetchError);
        }

        // Create invite log entry first (status: sending)
        const { data: logEntry, error: logError } = await supabase
          .from('calendar_invite_logs')
          .insert({
            user_id: userId,
            schedule_date: event.date,
            week_start_date: weekStart,
            start_time: start,
            end_time: end,
            time_windows: event.timeWindows,
            event_uid: eventUid || `haven-${userId}-${event.date}@haventerminal.com`,
            action: event.action,
            status: 'sending',
            provider: 'resend',
            retry_count: isResend ? 1 : 0,
          })
          .select('id')
          .single();

        if (logError) {
          console.error(`Error creating invite log for ${event.date}:`, logError);
        } else {
          logId = logEntry?.id;
          console.log(`Created invite log ${logId} for ${event.date}`);
        }

        if (event.action === 'create') {
          // Generate new UID for new events
          eventUid = `haven-${userId}-${event.date}@haventerminal.com`;
          sequenceNumber = 0;

          // Store the calendar event
          const { error: upsertError } = await supabase
            .from('calendar_events')
            .upsert({
              user_id: userId,
              schedule_date: event.date,
              event_uid: eventUid,
              sequence_number: sequenceNumber,
              time_windows: event.timeWindows,
              updated_at: new Date().toISOString(),
            });

          if (upsertError) {
            console.error(`Error upserting calendar event for ${event.date}:`, upsertError);
          }
        } else if (event.action === 'update') {
          if (existingEvent) {
            eventUid = existingEvent.event_uid;
            sequenceNumber = existingEvent.sequence_number + 1;

            // Update the calendar event
            const { error: updateError } = await supabase
              .from('calendar_events')
              .update({
                sequence_number: sequenceNumber,
                time_windows: event.timeWindows,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingEvent.id);

            if (updateError) {
              console.error(`Error updating calendar event for ${event.date}:`, updateError);
            }
          } else {
            // Treat as create if no existing event
            eventUid = `haven-${userId}-${event.date}@haventerminal.com`;
            sequenceNumber = 0;

            const { error: insertError } = await supabase
              .from('calendar_events')
              .insert({
                user_id: userId,
                schedule_date: event.date,
                event_uid: eventUid,
                sequence_number: sequenceNumber,
                time_windows: event.timeWindows,
              });

            if (insertError) {
              console.error(`Error inserting calendar event for ${event.date}:`, insertError);
            }
          }
        } else if (event.action === 'cancel') {
          if (existingEvent) {
            eventUid = existingEvent.event_uid;
            sequenceNumber = existingEvent.sequence_number + 1;

            // Delete the calendar event record
            const { error: deleteError } = await supabase
              .from('calendar_events')
              .delete()
              .eq('id', existingEvent.id);

            if (deleteError) {
              console.error(`Error deleting calendar event for ${event.date}:`, deleteError);
            }
          } else {
            // No existing event to cancel, skip email but log success
            console.log(`No existing event to cancel for date ${event.date}`);
            
            if (logId) {
              await supabase
                .from('calendar_invite_logs')
                .update({ 
                  status: 'cancelled',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', logId);
            }
            
            results.push({ date: event.date, action: event.action, success: true, logId });
            continue;
          }
        }

        // Update log with final event UID
        if (logId && eventUid) {
          await supabase
            .from('calendar_invite_logs')
            .update({ event_uid: eventUid })
            .eq('id', logId);
        }

        // Generate and send the ICS file
        const icsContent = generateICS(event, userEmail, eventUid!, sequenceNumber);
        const icsBase64 = encodeBase64(icsContent);

        const subjectPrefix = event.action === 'cancel' ? 'Cancelled: ' : (event.action === 'update' ? 'Updated: ' : '');
        const emailSubject = `${subjectPrefix}Coworking at Haven - ${new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;

        const timeWindowsDesc = formatTimeWindowsDescription(event.timeWindows);
        
        let emailBody: string;
        if (event.action === 'cancel') {
          emailBody = `
            <h2>Coworking Session Cancelled</h2>
            <p>Your coworking session at Haven has been cancelled.</p>
            <p><strong>Date:</strong> ${new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p>If you didn't make this change, please contact Haven support.</p>
          `;
        } else {
          emailBody = `
            <h2>${event.action === 'update' ? 'Updated: ' : ''}Coworking at Haven</h2>
            <p>Your coworking session has been ${event.action === 'update' ? 'updated' : 'scheduled'}!</p>
            <p><strong>Date:</strong> ${new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p><strong>Time:</strong> ${start} - ${end} (${timeWindowsDesc})</p>
            <p><strong>Location:</strong> 242 Mary St, Unit 8, Niagara-on-the-Lake, ON Canada</p>
            <p>The calendar invite is attached to this email.</p>
          `;
        }

        // Send email with retries
        const sendResult = await sendEmailWithRetry({
          from: "Haven Workspace <info@havenworkspace.ca>",
          to: [userEmail],
          subject: emailSubject,
          html: emailBody,
          attachments: [
            {
              filename: "invite.ics",
              content: icsBase64,
            },
          ],
        });

        // Update log with result
        if (logId) {
          await supabase
            .from('calendar_invite_logs')
            .update({
              status: sendResult.success ? 'sent' : 'failed',
              provider_message_id: sendResult.messageId,
              error: sendResult.error,
              retry_count: sendResult.attempts,
              sent_at: sendResult.success ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', logId);
        }

        const eventDuration = Date.now() - eventStartTime;
        console.log(`Event ${event.date} processed in ${eventDuration}ms - ${sendResult.success ? 'SUCCESS' : 'FAILED'}`);

        if (sendResult.success) {
          results.push({ 
            date: event.date, 
            action: event.action,
            success: true, 
            messageId: sendResult.messageId,
            attempts: sendResult.attempts,
            logId,
          });
        } else {
          errors.push({ date: event.date, error: sendResult.error || 'Unknown error' });
          results.push({ 
            date: event.date, 
            action: event.action,
            success: false, 
            error: sendResult.error,
            attempts: sendResult.attempts,
            logId,
          });
        }
      } catch (eventError: any) {
        const errorMessage = eventError.message || String(eventError);
        console.error(`Exception processing event for ${event.date}:`, errorMessage);
        
        // Update log with error
        if (logId) {
          await supabase
            .from('calendar_invite_logs')
            .update({
              status: 'failed',
              error: errorMessage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', logId);
        }
        
        errors.push({ date: event.date, error: errorMessage });
        results.push({ 
          date: event.date, 
          action: event.action,
          success: false, 
          error: errorMessage,
          logId,
        });
        // Continue processing remaining events
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`\n=== Calendar invite processing complete ===`);
    console.log(`Total: ${events.length}, Success: ${successCount}, Failed: ${failCount}`);
    console.log(`Total duration: ${totalDuration}ms`);

    return new Response(
      JSON.stringify({ 
        success: failCount === 0, 
        results,
        summary: {
          total: events.length,
          sent: successCount,
          failed: failCount,
          durationMs: totalDuration,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`Fatal error in calendar invite function after ${totalDuration}ms:`, error);
    return new Response(
      JSON.stringify({ error: error.message, durationMs: totalDuration }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
