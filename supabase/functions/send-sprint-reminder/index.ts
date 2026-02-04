import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HAVEN_ADDRESS = "242 Mary St, Unit 8, Niagara-on-the-Lake, ON, Canada";

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

    // Get today's date in America/Toronto
    const now = new Date();
    const torontoDate = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Toronto" })
    );
    const todayStr = torontoDate.toISOString().split("T")[0];

    console.log(`Checking for sprints on ${todayStr}`);

    // Find active sprints for today
    const { data: sprints, error: sprintError } = await supabase
      .from("coworking_sprints")
      .select("*")
      .eq("is_active", true)
      .eq("sprint_date", todayStr);

    if (sprintError) {
      throw new Error(`Error fetching sprints: ${sprintError.message}`);
    }

    if (!sprints || sprints.length === 0) {
      console.log("No active sprints today");
      return new Response(
        JSON.stringify({ success: true, message: "No active sprints today" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ sprintId: string; emailsSent: number; errors: string[] }> = [];

    for (const sprint of sprints) {
      const sprintResults = { sprintId: sprint.id, emailsSent: 0, errors: [] as string[] };

      // Get participants with their profiles
      const { data: participants, error: participantError } = await supabase
        .from("coworking_sprint_participants")
        .select("user_id")
        .eq("sprint_id", sprint.id);

      if (participantError || !participants || participants.length === 0) {
        console.log(`No participants for sprint ${sprint.id}`);
        results.push(sprintResults);
        continue;
      }

      const userIds = participants.map((p) => p.user_id);

      // Get profiles with emails
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (!profiles || profiles.length === 0) {
        console.log(`No profiles found for participants`);
        results.push(sprintResults);
        continue;
      }

      // Check which emails have already been sent
      const { data: existingEmails } = await supabase
        .from("coworking_sprint_emails")
        .select("user_id")
        .eq("sprint_id", sprint.id)
        .eq("email_type", "8am_reminder")
        .eq("status", "sent");

      const sentUserIds = new Set(existingEmails?.map((e) => e.user_id) || []);

      // Format sprint details
      const sprintDate = new Date(sprint.sprint_date + "T00:00:00");
      const formattedDate = sprintDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const formattedTime = `${formatTo12Hour(sprint.start_time)} – ${formatTo12Hour(sprint.end_time)} ET`;

      for (const profile of profiles) {
        if (!profile.email || sentUserIds.has(profile.id)) {
          continue;
        }

        // Build email content based on hosting mode
        let locationInfo = "";
        let instructions = "";

        if (sprint.hosting_mode === "haven") {
          locationInfo = `<p><strong>Location:</strong> ${HAVEN_ADDRESS}</p>`;
          instructions = `<p>Arrive a few minutes early and get set up. See you there!</p>`;
        } else if (sprint.hosting_mode === "google_meet") {
          locationInfo = `<p><strong>Format:</strong> Virtual via Google Meet</p>`;
          instructions = `<p>The Google Meet link will be sent 5 minutes before the sprint starts.</p>`;
        } else if (sprint.hosting_mode === "daily") {
          locationInfo = `<p><strong>Format:</strong> Virtual in Homebase</p>`;
          instructions = `<p>Join from Homebase when it's time to start. We'll include the join link below.</p>`;
          if (sprint.daily_room_url) {
            instructions += `<p><a href="${sprint.daily_room_url}" style="color: #3b82f6; text-decoration: underline;">Join Video Room</a></p>`;
          }
        }

        const emailHtml = `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">
              🚀 Your Coworking Sprint is Today!
            </h1>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Hi ${profile.full_name},
            </p>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              This is a reminder that you've signed up for <strong>${sprint.title}</strong> today.
            </p>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
              ${locationInfo}
            </div>
            
            ${instructions}
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-top: 20px;">
              Looking forward to a productive session!
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
            subject: `🚀 Reminder: ${sprint.title} is today!`,
            html: emailHtml,
          });

          // Log the email send
          await supabase.from("coworking_sprint_emails").upsert(
            {
              sprint_id: sprint.id,
              user_id: profile.id,
              email_type: "8am_reminder",
              status: "sent",
              sent_at: new Date().toISOString(),
              resend_message_id: emailResponse.data?.id || null,
            },
            { onConflict: "sprint_id,user_id,email_type" }
          );

          sprintResults.emailsSent++;
          console.log(`Sent 8am reminder to ${profile.email}`);
        } catch (emailError: unknown) {
          const errMsg = emailError instanceof Error ? emailError.message : "Unknown error";
          sprintResults.errors.push(`Failed to send to ${profile.email}: ${errMsg}`);
          console.error(`Error sending to ${profile.email}:`, emailError);

          // Log the failure
          await supabase.from("coworking_sprint_emails").upsert(
            {
              sprint_id: sprint.id,
              user_id: profile.id,
              email_type: "8am_reminder",
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
    console.error("Error in sprint reminder:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
