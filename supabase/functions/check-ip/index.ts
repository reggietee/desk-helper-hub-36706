import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get today's date boundaries in America/Toronto timezone
function getTodayBoundaries(): { startOfDay: string; endOfDay: string } {
  const now = new Date();
  
  // Format current time in Toronto timezone to get the date
  const torontoDateStr = now.toLocaleDateString('en-CA', { 
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Create start and end of day in Toronto time, then convert to UTC
  // Toronto date string is in YYYY-MM-DD format
  const startOfDayToronto = new Date(`${torontoDateStr}T00:00:00`);
  const endOfDayToronto = new Date(`${torontoDateStr}T23:59:59.999`);
  
  // Get Toronto timezone offset for today
  const torontoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    timeZoneName: 'short'
  });
  
  // Parse to get offset - Toronto is either EST (-5) or EDT (-4)
  const parts = torontoFormatter.formatToParts(now);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value || 'EST';
  const offsetHours = tzName.includes('EDT') ? 4 : 5;
  
  // Adjust to UTC by adding the offset
  const startOfDayUTC = new Date(startOfDayToronto.getTime() + offsetHours * 60 * 60 * 1000);
  const endOfDayUTC = new Date(endOfDayToronto.getTime() + offsetHours * 60 * 60 * 1000);
  
  return {
    startOfDay: startOfDayUTC.toISOString(),
    endOfDay: endOfDayUTC.toISOString()
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";

    console.log(`[check-ip] Client IP: ${clientIp}`);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for reading settings
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
      console.error("[check-ip] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is a guest - don't show banner
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role === "guest") {
      console.log("[check-ip] Guest user, hiding check-in banner");
      return new Response(
        JSON.stringify({ matches: false, reason: "guest_user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the allowed IP from settings
    const { data: setting, error: settingError } = await supabaseClient
      .from("haven_settings")
      .select("setting_value")
      .eq("setting_key", "allowed_ip")
      .single();

    if (settingError) {
      console.error("[check-ip] Error fetching setting:", settingError);
      return new Response(
        JSON.stringify({ matches: false, reason: "settings_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedIp = setting?.setting_value;
    
    // If no IP is configured, don't show the banner
    if (!allowedIp || allowedIp.trim() === "") {
      console.log("[check-ip] No allowed IP configured");
      return new Response(
        JSON.stringify({ matches: false, reason: "not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ipMatches = clientIp === allowedIp.trim();
    console.log(`[check-ip] Allowed IP: ${allowedIp}, Client IP: ${clientIp}, IP Matches: ${ipMatches}`);

    // If IP doesn't match, no need to check for existing check-in
    if (!ipMatches) {
      return new Response(
        JSON.stringify({ matches: false, clientIp, reason: "ip_mismatch" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has already checked in today (America/Toronto timezone)
    const { startOfDay, endOfDay } = getTodayBoundaries();
    console.log(`[check-ip] Checking for existing check-in between ${startOfDay} and ${endOfDay}`);

    const { data: existingCheckIn, error: checkInError } = await supabaseClient
      .from("member_visits")
      .select("id, checked_in_at")
      .eq("user_id", user.id)
      .gte("checked_in_at", startOfDay)
      .lte("checked_in_at", endOfDay)
      .limit(1);

    if (checkInError) {
      console.error("[check-ip] Error checking existing check-in:", checkInError);
      // If we can't check, still allow showing the banner (fail open for UX)
      return new Response(
        JSON.stringify({ matches: true, clientIp, alreadyCheckedIn: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const alreadyCheckedIn = existingCheckIn && existingCheckIn.length > 0;
    console.log(`[check-ip] User ${user.id} already checked in today: ${alreadyCheckedIn}`);

    // Only show banner if IP matches AND user hasn't checked in today
    const shouldShowBanner = ipMatches && !alreadyCheckedIn;

    return new Response(
      JSON.stringify({ 
        matches: shouldShowBanner, 
        clientIp,
        alreadyCheckedIn,
        reason: alreadyCheckedIn ? "already_checked_in_today" : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-ip] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
