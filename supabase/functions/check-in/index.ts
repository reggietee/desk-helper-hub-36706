import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_CHECKIN_CREDITS = 5;
const WEEKLY_STREAK_BONUS = 10;
const STREAK_THRESHOLD = 5;

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

    // Check if user already checked in today (in America/Toronto timezone)
    const now = new Date();
    const torontoDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
    const todayStart = new Date(torontoDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(torontoDate);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: existingVisit } = await supabaseClient
      .from("member_visits")
      .select("id")
      .eq("user_id", user.id)
      .gte("checked_in_at", todayStart.toISOString())
      .lte("checked_in_at", todayEnd.toISOString())
      .limit(1);

    const alreadyCheckedInToday = existingVisit && existingVisit.length > 0;

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

    // Award credits if not already awarded today
    let creditsAwarded = 0;
    let streakBonusAwarded = false;

    if (!alreadyCheckedInToday) {
      // Get or create credits record
      let { data: creditsRecord } = await supabaseClient
        .from("haven_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!creditsRecord) {
        // Create new credits record
        const { data: newRecord, error: createError } = await supabaseClient
          .from("haven_credits")
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single();

        if (createError) {
          console.error("[check-in] Error creating credits record:", createError);
        } else {
          creditsRecord = newRecord;
        }
      }

      if (creditsRecord) {
        // Award daily check-in credits
        const newBalance = creditsRecord.balance + DAILY_CHECKIN_CREDITS;
        
        // Update balance
        await supabaseClient
          .from("haven_credits")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        // Add ledger entry for daily check-in
        await supabaseClient
          .from("haven_credits_ledger")
          .insert({
            user_id: user.id,
            amount: DAILY_CHECKIN_CREDITS,
            reason: "daily_checkin",
            balance_after: newBalance,
            reference_id: visit.id
          });

        creditsAwarded = DAILY_CHECKIN_CREDITS;
        console.log(`[check-in] Awarded ${DAILY_CHECKIN_CREDITS} credits to user ${user.id}`);

        // Check for weekly streak bonus
        // Get the start and end of the current week (Mon-Sun)
        const dayOfWeek = torontoDate.getDay(); // 0 = Sunday
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(torontoDate);
        weekStart.setDate(torontoDate.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Count unique check-in days this week
        const { data: weekVisits } = await supabaseClient
          .from("member_visits")
          .select("checked_in_at")
          .eq("user_id", user.id)
          .gte("checked_in_at", weekStart.toISOString())
          .lte("checked_in_at", weekEnd.toISOString());

        if (weekVisits) {
          // Get unique days
          const uniqueDays = new Set(
            weekVisits.map(v => {
              const d = new Date(v.checked_in_at);
              return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
          );

          console.log(`[check-in] User has ${uniqueDays.size} unique check-in days this week`);

          // Check if we hit exactly 5 days (award once at the 5th day)
          if (uniqueDays.size === STREAK_THRESHOLD) {
            // Check if bonus already awarded this week
            const { data: existingBonus } = await supabaseClient
              .from("haven_credits_ledger")
              .select("id")
              .eq("user_id", user.id)
              .eq("reason", "weekly_streak_bonus")
              .gte("created_at", weekStart.toISOString())
              .lte("created_at", weekEnd.toISOString())
              .limit(1);

            if (!existingBonus || existingBonus.length === 0) {
              // Award streak bonus
              const bonusBalance = newBalance + WEEKLY_STREAK_BONUS;
              
              await supabaseClient
                .from("haven_credits")
                .update({ balance: bonusBalance, updated_at: new Date().toISOString() })
                .eq("user_id", user.id);

              await supabaseClient
                .from("haven_credits_ledger")
                .insert({
                  user_id: user.id,
                  amount: WEEKLY_STREAK_BONUS,
                  reason: "weekly_streak_bonus",
                  balance_after: bonusBalance,
                  reference_id: visit.id
                });

              creditsAwarded += WEEKLY_STREAK_BONUS;
              streakBonusAwarded = true;
              console.log(`[check-in] Awarded ${WEEKLY_STREAK_BONUS} streak bonus to user ${user.id}`);
            }
          }
        }
      }
    } else {
      console.log(`[check-in] User ${user.id} already earned credits today`);
    }

    // Get updated balance
    const { data: finalCredits } = await supabaseClient
      .from("haven_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        visit,
        credits: {
          awarded: creditsAwarded,
          streakBonus: streakBonusAwarded,
          balance: finalCredits?.balance ?? 0
        }
      }),
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
