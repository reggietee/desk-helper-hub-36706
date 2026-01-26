import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      console.log("[admin-adjust-credits] Activity post already exists for ledger:", ledgerId);
      return;
    }

    // Insert new activity post
    const { error } = await supabaseClient
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
        console.log("[admin-adjust-credits] Activity post already exists (race condition):", ledgerId);
      } else {
        console.error("[admin-adjust-credits] Error creating activity post:", error);
      }
    } else {
      console.log("[admin-adjust-credits] Activity post created for ledger:", ledgerId);
    }
  } catch (error) {
    console.error("[admin-adjust-credits] Exception creating activity post:", error);
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
      console.error("[admin-adjust-credits] Failed to send credit email:", await response.text());
    } else {
      console.log("[admin-adjust-credits] Credit email sent successfully");
    }
  } catch (error) {
    console.error("[admin-adjust-credits] Error sending credit email:", error);
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
    const { targetUserId, amount, action, note } = await req.json();
    
    if (!targetUserId || !amount || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: targetUserId, amount, action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["add", "subtract"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Action must be 'add' or 'subtract'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be a positive number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is authenticated and is an admin
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("[admin-adjust-credits] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the requesting user is an admin
    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (!isAdmin) {
      console.error("[admin-adjust-credits] User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[admin-adjust-credits] Admin ${user.id} adjusting credits for ${targetUserId}: ${action} ${amount}`);

    // Get or create credits record for target user
    let { data: creditsRecord } = await supabaseClient
      .from("haven_credits")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!creditsRecord) {
      // Create new credits record
      const { data: newRecord, error: insertError } = await supabaseClient
        .from("haven_credits")
        .insert({ user_id: targetUserId, balance: 0 })
        .select()
        .single();

      if (insertError) {
        console.error("[admin-adjust-credits] Error creating credits record:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create credits record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      creditsRecord = newRecord;
    }

    // Fetch target user profile for email notifications and feed
    const { data: targetProfile } = await supabaseClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", targetUserId)
      .single();

    const targetUserEmail = targetProfile?.email || "";
    const targetUserName = targetProfile?.full_name || "Member";
    const targetFirstName = targetUserName.split(" ")[0];

    // Calculate new balance
    const adjustmentAmount = action === "add" ? amount : -amount;
    let newBalance = creditsRecord.balance + adjustmentAmount;

    // Clamp to 0 if subtracting would go negative
    if (newBalance < 0) {
      newBalance = 0;
    }

    // Update balance
    const { error: updateError } = await supabaseClient
      .from("haven_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", targetUserId);

    if (updateError) {
      console.error("[admin-adjust-credits] Error updating balance:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update balance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create ledger entry
    const reason = note 
      ? `admin_adjustment: ${note}` 
      : "admin_adjustment";

    const { data: ledgerEntry, error: ledgerError } = await supabaseClient
      .from("haven_credits_ledger")
      .insert({
        user_id: targetUserId,
        amount: adjustmentAmount,
        reason: reason,
        balance_after: newBalance,
      })
      .select("id")
      .single();

    if (ledgerError) {
      console.error("[admin-adjust-credits] Error creating ledger entry:", ledgerError);
      // Don't fail the request, the balance was already updated
    }

    console.log(`[admin-adjust-credits] Successfully adjusted credits. New balance: ${newBalance}`);

    // Create feed activity post for positive adjustments (async, don't block response)
    if (ledgerEntry && adjustmentAmount > 0) {
      createFeedActivityPost(
        supabaseClient,
        targetUserId,
        targetUserName,
        adjustmentAmount,
        "admin_adjustment",
        ledgerEntry.id
      );
    }

    // Send credit email notification for positive adjustments (async, don't block response)
    if (ledgerEntry && targetUserEmail && adjustmentAmount > 0) {
      sendCreditEmail(
        supabaseUrl,
        ledgerEntry.id,
        targetUserId,
        targetUserEmail,
        targetFirstName,
        adjustmentAmount,
        reason,
        newBalance
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        previousBalance: creditsRecord.balance,
        adjustment: adjustmentAmount,
        newBalance: newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[admin-adjust-credits] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});