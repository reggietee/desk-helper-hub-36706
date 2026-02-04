import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(RESEND_API_KEY);

    // Get current time in Toronto
    const now = new Date();
    const torontoNow = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Toronto" })
    );
    const todayStr = torontoNow.toISOString().split("T")[0];
    const currentHour = torontoNow.getHours();
    const currentMinute = torontoNow.getMinutes();

    console.log(`Checking for sprints starting soon at ${currentHour}:${currentMinute} on ${todayStr}`);

    // Find active Google Meet sprints for today
    const { data: sprints, error: sprintError } = await supabase
      .from("coworking_sprints")
      .select("*")
      .eq("is_active", true)
      .eq("sprint_date", todayStr)
      .eq("hosting_mode", "google_meet");

    if (sprintError) {
      throw new Error(`Error fetching sprints: ${sprintError.message}`);
    }

    if (!sprints || sprints.length === 0) {
      console.log("No Google Meet sprints today");
      return new Response(
        JSON.stringify({ success: true, message: "No Google Meet sprints today" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ sprintId: string; emailsSent: number; errors: string[] }> = [];

    for (const sprint of sprints) {
      // Parse sprint start time
      const [startHour, startMinute] = sprint.start_time.split(":").map(Number);
      
      // Calculate minutes until sprint starts
      const sprintStartMinutes = startHour * 60 + startMinute;
      const currentMinutes = currentHour * 60 + currentMinute;
      const minutesUntilStart = sprintStartMinutes - currentMinutes;

      // Only send if we're within 5-6 minutes window
      if (minutesUntilStart < 4 || minutesUntilStart > 6) {
        console.log(`Sprint ${sprint.id} starts in ${minutesUntilStart} minutes, skipping`);
        continue;
      }

      if (!sprint.meeting_link) {
        console.log(`Sprint ${sprint.id} has no meeting link, skipping`);
        continue;
      }

      const sprintResults = { sprintId: sprint.id, emailsSent: 0, errors: [] as string[] };

      // Get participants
      const { data: participants } = await supabase
        .from("coworking_sprint_participants")
        .select("user_id")
        .eq("sprint_id", sprint.id);

      if (!participants || participants.length === 0) {
        results.push(sprintResults);
        continue;
      }

      const userIds = participants.map((p) => p.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (!profiles || profiles.length === 0) {
        results.push(sprintResults);
        continue;
      }

      // Check which emails have already been sent
      const { data: existingEmails } = await supabase
        .from("coworking_sprint_emails")
        .select("user_id")
        .eq("sprint_id", sprint.id)
        .eq("email_type", "5min_link")
        .eq("status", "sent");

      const sentUserIds = new Set(existingEmails?.map((e) => e.user_id) || []);

      for (const profile of profiles) {
        if (!profile.email || sentUserIds.has(profile.id)) {
          continue;
        }

        const emailHtml = `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">
              ⏰ Your Sprint Starts in 5 Minutes!
            </h1>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Hi ${profile.full_name},
            </p>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              <strong>${sprint.title}</strong> is about to begin. Click the button below to join:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${sprint.meeting_link}" 
                 style="display: inline-block; background: #3b82f6; color: white; 
                        padding: 14px 28px; border-radius: 8px; text-decoration: none;
                        font-weight: 600; font-size: 16px;">
                Join Google Meet
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Or copy this link: <a href="${sprint.meeting_link}" style="color: #3b82f6;">${sprint.meeting_link}</a>
            </p>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-top: 20px;">
              See you there!
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              — Haven Workspace
            </p>
          </div>
        `;

        try {
          const emailResponse = await resend.emails.send({
            from: "Haven Workspace <notifications@havenworkspace.ca>",
            to: [profile.email],
            subject: `⏰ Your Coworking Sprint link — starts in 5 minutes`,
            html: emailHtml,
          });

          await supabase.from("coworking_sprint_emails").upsert(
            {
              sprint_id: sprint.id,
              user_id: profile.id,
              email_type: "5min_link",
              status: "sent",
              sent_at: new Date().toISOString(),
              resend_message_id: emailResponse.data?.id || null,
            },
            { onConflict: "sprint_id,user_id,email_type" }
          );

          sprintResults.emailsSent++;
          console.log(`Sent 5min link to ${profile.email}`);
        } catch (emailError: unknown) {
          const errMsg = emailError instanceof Error ? emailError.message : "Unknown error";
          sprintResults.errors.push(`Failed to send to ${profile.email}: ${errMsg}`);
          console.error(`Error sending to ${profile.email}:`, emailError);

          await supabase.from("coworking_sprint_emails").upsert(
            {
              sprint_id: sprint.id,
              user_id: profile.id,
              email_type: "5min_link",
              status: "failed",
              error: errMsg,
            },
            { onConflict: "sprint_id,user_id,email_type" }
          );
        }
      }

      results.push(sprintResults);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in sprint meet link:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
