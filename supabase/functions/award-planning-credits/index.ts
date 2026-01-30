import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEEKLY_PLANNING_CREDITS = 10;

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
      console.log("[award-planning-credits] Activity post already exists for ledger:", ledgerId);
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
      if (error.code === "23505") {
        console.log("[award-planning-credits] Activity post already exists (race condition):", ledgerId);
      } else {
        console.error("[award-planning-credits] Error creating activity post:", error);
      }
    } else {
      console.log("[award-planning-credits] Activity post created for ledger:", ledgerId);
    }
  } catch (error) {
    console.error("[award-planning-credits] Exception creating activity post:", error);
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
      console.error("[award-planning-credits] Failed to send credit email:", await response.text());
    } else {
      console.log("[award-planning-credits] Credit email sent successfully");
    }
  } catch (error) {
    console.error("[award-planning-credits] Error sending credit email:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { weekStartDate } = await req.json();
    if (!weekStartDate) {
      return new Response(
        JSON.stringify({ error: "Missing weekStartDate" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      console.error("[award-planning-credits] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate week boundaries (Mon-Sun) based on weekStartDate
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    console.log(`[award-planning-credits] Checking for user ${user.id}, week: ${weekStartDate}`);

    // Use a deterministic reason that includes the week to ensure idempotency
    const weekSpecificReason = `weekly_planning:${weekStartDate}`;

    // Check if credits already awarded for this specific week
    // Check BOTH new format (weekly_planning:YYYY-MM-DD) and old format (weekly_planning) for legacy entries
    const { data: existingAward } = await supabaseClient
      .from("haven_credits_ledger")
      .select("id, reason, created_at")
      .eq("user_id", user.id)
      .or(`reason.eq.${weekSpecificReason},reason.eq.weekly_planning`)
      .order("created_at", { ascending: false })
      .limit(10);

    // Check for exact match on new format
    const hasNewFormatMatch = existingAward?.some(entry => entry.reason === weekSpecificReason);
    
    // For old format entries (without week suffix), we need to check if the entry's created_at
    // falls within the week being requested - this prevents duplicate awards for historical weeks
    const hasOldFormatMatch = existingAward?.some(entry => {
      if (entry.reason !== 'weekly_planning') return false;
      const entryDate = new Date(entry.created_at);
      // Check if the entry was created during the week being requested
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    if (hasNewFormatMatch || hasOldFormatMatch) {
      const matchType = hasNewFormatMatch ? 'new format' : 'old format (legacy)';
      console.log(`[award-planning-credits] Credits already awarded for week ${weekStartDate} (${matchType})`);
      
      // Get current balance
      const { data: currentCredits } = await supabaseClient
        .from("haven_credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyAwarded: true,
          credits: {
            awarded: 0,
            balance: currentCredits?.balance ?? 0
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[award-planning-credits] No existing award found for week ${weekStartDate}, proceeding with credit award`);

    // Verify user has at least 1 planned day for this week
    const { data: schedules, error: scheduleError } = await supabaseClient
      .from("weekly_schedules")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start_date", weekStartDate)
      .limit(1);

    if (scheduleError) {
      console.error("[award-planning-credits] Error checking schedules:", scheduleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify schedule" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!schedules || schedules.length === 0) {
      console.log(`[award-planning-credits] No scheduled days for week ${weekStartDate}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          credits: { awarded: 0, balance: 0 }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create credits record
    let { data: creditsRecord } = await supabaseClient
      .from("haven_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!creditsRecord) {
      const { data: newRecord, error: createError } = await supabaseClient
        .from("haven_credits")
        .insert({ user_id: user.id, balance: 0 })
        .select()
        .single();

      if (createError) {
        console.error("[award-planning-credits] Error creating credits record:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create credits record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      creditsRecord = newRecord;
    }

    // Fetch user profile for email notifications
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const userEmail = profile?.email || user.email || "";
    const userName = profile?.full_name || "Member";
    const firstName = userName.split(" ")[0];

    // Award credits
    const newBalance = creditsRecord.balance + WEEKLY_PLANNING_CREDITS;

    await supabaseClient
      .from("haven_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Add ledger entry with week-specific reason for idempotency
    const { data: ledgerEntry } = await supabaseClient
      .from("haven_credits_ledger")
      .insert({
        user_id: user.id,
        amount: WEEKLY_PLANNING_CREDITS,
        reason: weekSpecificReason,
        balance_after: newBalance,
        reference_id: null
      })
      .select("id")
      .single();

    console.log(`[award-planning-credits] Awarded ${WEEKLY_PLANNING_CREDITS} credits to user ${user.id}`);

    // Create feed activity post (async, don't block response)
    if (ledgerEntry) {
      createFeedActivityPost(
        supabaseClient,
        user.id,
        userName,
        WEEKLY_PLANNING_CREDITS,
        "weekly_planning",
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
        WEEKLY_PLANNING_CREDITS,
        "weekly_planning",
        newBalance
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        credits: {
          awarded: WEEKLY_PLANNING_CREDITS,
          balance: newBalance
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[award-planning-credits] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});