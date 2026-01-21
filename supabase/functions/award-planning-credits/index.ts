import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEEKLY_PLANNING_CREDITS = 10;

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

    // Check if credits already awarded for this week
    const { data: existingAward } = await supabaseClient
      .from("haven_credits_ledger")
      .select("id")
      .eq("user_id", user.id)
      .eq("reason", "weekly_planning")
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString())
      .limit(1);

    if (existingAward && existingAward.length > 0) {
      console.log(`[award-planning-credits] Credits already awarded for week ${weekStartDate}`);
      
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

    // Award credits
    const newBalance = creditsRecord.balance + WEEKLY_PLANNING_CREDITS;

    await supabaseClient
      .from("haven_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Add ledger entry
    await supabaseClient
      .from("haven_credits_ledger")
      .insert({
        user_id: user.id,
        amount: WEEKLY_PLANNING_CREDITS,
        reason: "weekly_planning",
        balance_after: newBalance,
        reference_id: null
      });

    console.log(`[award-planning-credits] Awarded ${WEEKLY_PLANNING_CREDITS} credits to user ${user.id}`);

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
