import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_CHECKIN_CREDITS = 5;
const WEEKLY_STREAK_BONUS = 10;
const STREAK_THRESHOLD = 5;

const ACTION_LABELS: Record<string, string> = {
  daily_checkin: "Daily check-in",
  weekly_streak_bonus: "5-day streak bonus",
  weekly_planning: "Weekly planning",
  admin_adjustment: "Admin adjustment",
};

// Helper to create feed activity post
// deno-lint-ignore no-explicit-any
async function createFeedActivityPost(
  supabaseClient: any,
  userId: string,
  userName: string,
  creditsAmount: number,
  actionName: string,
  ledgerId: string
): Promise<void> {
  const actionLabel = ACTION_LABELS[actionName] || actionName;
  const body = `${userName} earned +${creditsAmount} © — ${actionLabel}`;

  try {
    // First check if post already exists for this ledger entry
    const { data: existing } = await supabaseClient
      .from("feed_items")
      .select("id")
      .eq("ledger_id", ledgerId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("[check-in] Activity post already exists for ledger:", ledgerId);
      return;
    }

    // Insert new activity post using raw query to bypass type issues
    // deno-lint-ignore no-explicit-any
    const { error } = await (supabaseClient as any)
      .from("feed_items")
      .insert({
        type: "activity",
        author_id: userId,
        body,
        credits_amount: creditsAmount,
        action_name: actionName,
        ledger_id: ledgerId,
      });

    if (error) {
      // Check if it's a duplicate key error (race condition)
      if (error.code === "23505") {
        console.log("[check-in] Activity post already exists (race condition):", ledgerId);
      } else {
        console.error("[check-in] Error creating activity post:", error);
      }
    } else {
      console.log("[check-in] Activity post created for ledger:", ledgerId);
    }
  } catch (error) {
    console.error("[check-in] Exception creating activity post:", error);
  }
}

// Helper to send credit notification email
async function sendCreditEmail(
  supabaseUrl: string,
  ledgerId: string,
  userId: string,
  userEmail: string,
  firstName: string,
  creditsAdded: number,
  actionName: string,
  newBalance: number
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-credit-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        ledgerId,
        userId,
        userEmail,
        firstName,
        creditsAdded,
        actionName,
        newBalance,
      }),
    });
    
    if (!response.ok) {
      console.error("[check-in] Failed to send credit email:", await response.text());
    } else {
      console.log("[check-in] Credit email sent successfully");
    }
  } catch (error) {
    console.error("[check-in] Error sending credit email:", error);
  }
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

    // Check if user is a guest - block check-in
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role === "guest") {
      console.log(`[check-in] Guest user ${user.id} blocked from check-in`);
      return new Response(
        JSON.stringify({ success: false, error: "Check-in is available to members only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      // Fetch user profile for email notifications
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const userEmail = profile?.email || user.email || "";
      const userName = profile?.full_name || "Member";
      const firstName = userName.split(" ")[0];

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
        const { data: ledgerEntry } = await supabaseClient
          .from("haven_credits_ledger")
          .insert({
            user_id: user.id,
            amount: DAILY_CHECKIN_CREDITS,
            reason: "daily_checkin",
            balance_after: newBalance,
            reference_id: visit.id
          })
          .select("id")
          .single();

        creditsAwarded = DAILY_CHECKIN_CREDITS;
        console.log(`[check-in] Awarded ${DAILY_CHECKIN_CREDITS} credits to user ${user.id}`);

        // Create feed activity post (async, don't block response)
        if (ledgerEntry) {
          createFeedActivityPost(
            supabaseClient,
            user.id,
            userName,
            DAILY_CHECKIN_CREDITS,
            "daily_checkin",
            ledgerEntry.id
          );
        }

        // Send credit email notification (async, don't block response)
        if (ledgerEntry && userEmail) {
          sendCreditEmail(
            supabaseUrl,
            ledgerEntry.id,
            user.id,
            userEmail,
            firstName,
            DAILY_CHECKIN_CREDITS,
            "daily_checkin",
            newBalance
          );
        }

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

              const { data: streakLedgerEntry } = await supabaseClient
                .from("haven_credits_ledger")
                .insert({
                  user_id: user.id,
                  amount: WEEKLY_STREAK_BONUS,
                  reason: "weekly_streak_bonus",
                  balance_after: bonusBalance,
                  reference_id: visit.id
                })
                .select("id")
                .single();

              creditsAwarded += WEEKLY_STREAK_BONUS;
              streakBonusAwarded = true;
              console.log(`[check-in] Awarded ${WEEKLY_STREAK_BONUS} streak bonus to user ${user.id}`);

              // Create feed activity post for streak bonus
              if (streakLedgerEntry) {
                createFeedActivityPost(
                  supabaseClient,
                  user.id,
                  userName,
                  WEEKLY_STREAK_BONUS,
                  "weekly_streak_bonus",
                  streakLedgerEntry.id
                );
              }

              // Send streak bonus email notification (async, don't block response)
              if (streakLedgerEntry && userEmail) {
                sendCreditEmail(
                  supabaseUrl,
                  streakLedgerEntry.id,
                  user.id,
                  userEmail,
                  firstName,
                  WEEKLY_STREAK_BONUS,
                  "weekly_streak_bonus",
                  bonusBalance
                );
              }
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