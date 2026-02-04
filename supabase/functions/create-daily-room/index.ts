import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sprint_id } = await req.json();
    if (!sprint_id) {
      throw new Error("sprint_id is required");
    }

    // Get sprint details
    const { data: sprint, error: sprintError } = await supabase
      .from("coworking_sprints")
      .select("*")
      .eq("id", sprint_id)
      .single();

    if (sprintError || !sprint) {
      throw new Error("Sprint not found");
    }

    // Generate a unique room name
    const roomName = `haven-sprint-${sprint_id.slice(0, 8)}-${Date.now()}`;

    // Calculate expiration (end of sprint day + 2 hours buffer)
    const sprintEnd = new Date(`${sprint.sprint_date}T${sprint.end_time}`);
    sprintEnd.setHours(sprintEnd.getHours() + 2);
    const expiryTimestamp = Math.floor(sprintEnd.getTime() / 1000);

    // Create Daily room
    const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public", // Allows anyone with link to join
        properties: {
          exp: expiryTimestamp,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          max_participants: sprint.max_participants + 2, // Buffer for admins
        },
      }),
    });

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      console.error("Daily API error:", errorText);
      throw new Error(`Failed to create Daily room: ${dailyResponse.status}`);
    }

    const dailyRoom = await dailyResponse.json();
    console.log("Daily room created:", dailyRoom.url);

    // Update sprint with room details
    const { error: updateError } = await supabase
      .from("coworking_sprints")
      .update({
        daily_room_url: dailyRoom.url,
        daily_room_name: dailyRoom.name,
      })
      .eq("id", sprint_id);

    if (updateError) {
      console.error("Error updating sprint:", updateError);
      throw new Error("Failed to save room URL to sprint");
    }

    return new Response(
      JSON.stringify({
        success: true,
        room_url: dailyRoom.url,
        room_name: dailyRoom.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating Daily room:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
