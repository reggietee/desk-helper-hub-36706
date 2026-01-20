import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";

    console.log(`[check-in] Client IP: ${clientIp}`);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("[check-in] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the allowed IP from settings
    const { data: setting, error: settingError } = await supabaseClient
      .from("haven_settings")
      .select("setting_value")
      .eq("setting_key", "allowed_ip")
      .single();

    if (settingError) {
      console.error("[check-in] Error fetching setting:", settingError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not verify location" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedIp = setting?.setting_value;
    
    // If no IP is configured, reject check-in
    if (!allowedIp || allowedIp.trim() === "") {
      console.log("[check-in] No allowed IP configured");
      return new Response(
        JSON.stringify({ success: false, error: "Check-in not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify IP matches
    if (clientIp !== allowedIp.trim()) {
      console.log(`[check-in] IP mismatch. Expected: ${allowedIp}, Got: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Check-in is only available when connected to Haven Wi-Fi" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create visit record using service role (bypasses RLS)
    const { data: visit, error: insertError } = await supabaseClient
      .from("member_visits")
      .insert({
        user_id: user.id,
        ip_address: clientIp,
        checked_in_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error("[check-in] Error creating visit:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record check-in" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[check-in] Successfully checked in user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, visit }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-in] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
