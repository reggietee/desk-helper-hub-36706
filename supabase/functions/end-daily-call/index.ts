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

    const { call_id } = await req.json();
    if (!call_id) {
      throw new Error("call_id is required");
    }

    // Update call status to ended
    const { error: updateError } = await supabase
      .from("daily_calls")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", call_id);

    if (updateError) {
      console.error("Error ending call:", updateError);
      throw new Error("Failed to end call");
    }

    // Optionally delete the Daily room
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (DAILY_API_KEY) {
      const { data: call } = await supabase
        .from("daily_calls")
        .select("daily_room_name")
        .eq("id", call_id)
        .single();

      if (call?.daily_room_name) {
        try {
          await fetch(`https://api.daily.co/v1/rooms/${call.daily_room_name}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${DAILY_API_KEY}`,
            },
          });
        } catch (err) {
          console.log("Could not delete Daily room (may already be expired):", err);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error ending Daily call:", error);
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
