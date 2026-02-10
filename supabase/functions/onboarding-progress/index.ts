import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONBOARDING_BONUS = 150;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check role - guests cannot access onboarding
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role === "guest") {
      return new Response(
        JSON.stringify({ error: "Guests cannot access onboarding" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create onboarding progress
    let { data: progress } = await supabaseClient
      .from("onboarding_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!progress) {
      const { data: newProgress } = await supabaseClient
        .from("onboarding_progress")
        .insert({ user_id: user.id })
        .select()
        .single();
      progress = newProgress;
    }

    // If already awarded, return completed state
    if (progress?.bonus_awarded_at) {
      return new Response(
        JSON.stringify({ progress, completed: true, bonusAwarded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const updates: Record<string, string> = {};

    // Step 1: Profile completed (has full_name with at least first + last name)
    if (!progress?.profile_completed_at) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      if (profile?.full_name && profile.full_name.trim().includes(" ") && profile.email) {
        updates.profile_completed_at = now;
      }
    }

    // Step 2: Week planned (has at least 1 weekly schedule entry)
    if (!progress?.week_planned_at) {
      const { data: schedules } = await supabaseClient
        .from("weekly_schedules")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (schedules && schedules.length > 0) {
        updates.week_planned_at = now;
      }
    }

    // Step 3: Checked in at Haven
    if (!progress?.checked_in_at) {
      const { data: visits } = await supabaseClient
        .from("member_visits")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (visits && visits.length > 0) {
        updates.checked_in_at = now;
      }
    }

    // Step 4: Posted in feed
    if (!progress?.feed_posted_at) {
      const { data: posts } = await supabaseClient
        .from("feed_items")
        .select("id")
        .eq("author_id", user.id)
        .eq("type", "chat")
        .limit(1);
      if (posts && posts.length > 0) {
        updates.feed_posted_at = now;
      }
    }

    // Step 5: Joined a sprint
    if (!progress?.sprint_joined_at) {
      const { data: participations } = await supabaseClient
        .from("coworking_sprint_participants")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (participations && participations.length > 0) {
        updates.sprint_joined_at = now;
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      updates.updated_at = now;
      const { data: updated } = await supabaseClient
        .from("onboarding_progress")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      progress = updated;
    }

    // Check if all steps are now complete
    const allComplete =
      progress?.profile_completed_at &&
      progress?.week_planned_at &&
      progress?.checked_in_at &&
      progress?.feed_posted_at &&
      progress?.sprint_joined_at;

    let bonusJustAwarded = false;

    if (allComplete && !progress?.bonus_awarded_at) {
      // Award the onboarding bonus
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const userName = profile?.full_name || "Member";

      // Get or create credits record
      let { data: creditsRecord } = await supabaseClient
        .from("haven_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!creditsRecord) {
        const { data: newRecord } = await supabaseClient
          .from("haven_credits")
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single();
        creditsRecord = newRecord;
      }

      if (creditsRecord) {
        const newBalance = creditsRecord.balance + ONBOARDING_BONUS;

        await supabaseClient
          .from("haven_credits")
          .update({ balance: newBalance, updated_at: now })
          .eq("user_id", user.id);

        // Create ledger entry with unique reference
        const { data: ledgerEntry } = await supabaseClient
          .from("haven_credits_ledger")
          .insert({
            user_id: user.id,
            amount: ONBOARDING_BONUS,
            reason: "onboarding_bonus",
            balance_after: newBalance,
            reference_id: progress.id,
          })
          .select("id")
          .single();

        // Mark bonus as awarded
        await supabaseClient
          .from("onboarding_progress")
          .update({ bonus_awarded_at: now })
          .eq("user_id", user.id);

        progress.bonus_awarded_at = now;
        bonusJustAwarded = true;

        // Create feed activity post
        if (ledgerEntry) {
          await supabaseClient.from("feed_items").insert({
            type: "activity",
            author_id: user.id,
            body: `${userName} earned +${ONBOARDING_BONUS} © — Onboarding bonus`,
            credits_amount: ONBOARDING_BONUS,
            action_name: "onboarding_bonus",
            ledger_id: ledgerEntry.id,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        progress,
        completed: !!allComplete,
        bonusAwarded: !!progress?.bonus_awarded_at,
        bonusJustAwarded,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[onboarding-progress] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
