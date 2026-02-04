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

    // Get authorization header to identify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Invalid authorization");
    }

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles || !roles.some((r) => r.role === "admin")) {
      throw new Error("Admin access required");
    }

    const { call_name, note, allow_guests } = await req.json();
    const callName = call_name || "Haven Call";

    // Generate a unique room name
    const roomName = `haven-call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Calculate expiration (24 hours from now)
    const expiryTimestamp = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);

    // Create Daily room
    const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public",
        properties: {
          exp: expiryTimestamp,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          max_participants: 20,
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

    // Store call record in database
    const { data: callRecord, error: insertError } = await supabase
      .from("daily_calls")
      .insert({
        call_name: callName,
        note: note || null,
        daily_room_url: dailyRoom.url,
        daily_room_name: dailyRoom.name,
        created_by: user.id,
        allow_guests: allow_guests || false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting call record:", insertError);
      throw new Error("Failed to save call record");
    }

    return new Response(
      JSON.stringify({
        success: true,
        call: callRecord,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating Daily call:", error);
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
