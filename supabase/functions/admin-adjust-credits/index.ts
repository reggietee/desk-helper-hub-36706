import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Fetch target user profile for email notifications
    const { data: targetProfile } = await supabaseClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", targetUserId)
      .single();

    const targetUserEmail = targetProfile?.email || "";
    const targetFirstName = targetProfile?.full_name?.split(" ")[0] || "Member";

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
