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
}

// Time window definitions (America/Toronto timezone)
const TIME_WINDOWS = {
  morning: { start: '09:00', end: '12:00', label: 'Morning' },
  afternoon: { start: '12:00', end: '18:00', label: 'Afternoon' },
  evening: { start: '18:00', end: '21:00', label: 'Evening' },
};

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
ORGANIZER:mailto:onboarding@resend.dev
ATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${userEmail}
END:VEVENT
END:VCALENDAR`;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Calendar invite function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userEmail, userId, events }: CalendarInviteRequest = await req.json();
    console.log(`Processing ${events.length} calendar events for ${userEmail} (user: ${userId})`);

    if (!userEmail || !userId || !events || events.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userEmail, userId, and events are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const results: { date: string; success: boolean; error?: string }[] = [];

    for (const event of events) {
      try {
        let eventUid = event.eventUid;
        let sequenceNumber = event.sequenceNumber || 0;

        // Check if we have an existing calendar event for this date
        const { data: existingEvent } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .eq('schedule_date', event.date)
          .single();

        if (event.action === 'create') {
          // Generate new UID for new events
          eventUid = `haven-${userId}-${event.date}@haventerminal.com`;
          sequenceNumber = 0;

          // Store the calendar event
          await supabase
            .from('calendar_events')
            .upsert({
              user_id: userId,
              schedule_date: event.date,
              event_uid: eventUid,
              sequence_number: sequenceNumber,
              time_windows: event.timeWindows,
              updated_at: new Date().toISOString(),
            });
        } else if (event.action === 'update') {
          if (existingEvent) {
            eventUid = existingEvent.event_uid;
            sequenceNumber = existingEvent.sequence_number + 1;

            // Update the calendar event
            await supabase
              .from('calendar_events')
              .update({
                sequence_number: sequenceNumber,
                time_windows: event.timeWindows,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingEvent.id);
          } else {
            // Treat as create if no existing event
            eventUid = `haven-${userId}-${event.date}@haventerminal.com`;
            sequenceNumber = 0;

            await supabase
              .from('calendar_events')
              .insert({
                user_id: userId,
                schedule_date: event.date,
                event_uid: eventUid,
                sequence_number: sequenceNumber,
                time_windows: event.timeWindows,
              });
          }
        } else if (event.action === 'cancel') {
          if (existingEvent) {
            eventUid = existingEvent.event_uid;
            sequenceNumber = existingEvent.sequence_number + 1;

            // Delete the calendar event record
            await supabase
              .from('calendar_events')
              .delete()
              .eq('id', existingEvent.id);
          } else {
            // No existing event to cancel, skip
            console.log(`No existing event to cancel for date ${event.date}`);
            results.push({ date: event.date, success: true });
            continue;
          }
        }

        // Generate and send the ICS file
        const icsContent = generateICS(event, userEmail, eventUid!, sequenceNumber);
        const icsBase64 = encodeBase64(icsContent);

        const subjectPrefix = event.action === 'cancel' ? 'Cancelled: ' : (event.action === 'update' ? 'Updated: ' : '');
        const emailSubject = `${subjectPrefix}Coworking at Haven - ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;

        const timeWindowsDesc = formatTimeWindowsDescription(event.timeWindows);
        const { start, end } = getEventTimes(event.timeWindows);
        
        let emailBody: string;
        if (event.action === 'cancel') {
          emailBody = `
            <h2>Coworking Session Cancelled</h2>
            <p>Your coworking session at Haven has been cancelled.</p>
            <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p>If you didn't make this change, please contact Haven support.</p>
          `;
        } else {
          emailBody = `
            <h2>${event.action === 'update' ? 'Updated: ' : ''}Coworking at Haven</h2>
            <p>Your coworking session has been ${event.action === 'update' ? 'updated' : 'scheduled'}!</p>
            <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p><strong>Time:</strong> ${start} - ${end} (${timeWindowsDesc})</p>
            <p><strong>Location:</strong> 242 Mary St, Unit 8, Niagara-on-the-Lake, ON Canada</p>
            <p>The calendar invite is attached to this email.</p>
          `;
        }

        const emailResponse = await resend.emails.send({
          from: "Haven Terminal <onboarding@resend.dev>",
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

        console.log(`Calendar invite sent for ${event.date}:`, emailResponse);
        results.push({ date: event.date, success: true });
      } catch (eventError: any) {
        console.error(`Error processing event for ${event.date}:`, eventError);
        results.push({ date: event.date, success: false, error: eventError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in calendar invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
