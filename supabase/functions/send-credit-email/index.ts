import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreditEmailRequest {
  ledgerId: string;
  userId: string;
  userEmail: string;
  firstName: string;
  creditsAdded: number;
  actionName: string;
  newBalance: number;
}

// Map reason codes to friendly action names
const REASON_DISPLAY_NAMES: Record<string, string> = {
  daily_checkin: "Daily check-in",
  weekly_planning: "Weekly planning",
  weekly_streak_bonus: "5-day streak bonus",
  admin_adjustment: "Admin adjustment",
};

function getActionDisplayName(reason: string): string {
  // Handle admin_adjustment with custom note
  if (reason.startsWith("admin_adjustment:")) {
    return reason.replace("admin_adjustment:", "Admin adjustment -");
  }
  return REASON_DISPLAY_NAMES[reason] || reason;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ledgerId, 
      userId, 
      userEmail, 
      firstName, 
      creditsAdded, 
      actionName, 
      newBalance 
    }: CreditEmailRequest = await req.json();

    console.log(`[send-credit-email] Processing for ledger ${ledgerId}, user ${userId}`);

    // Validate required fields
    if (!ledgerId || !userId || !userEmail || !firstName || creditsAdded === undefined || !actionName || newBalance === undefined) {
      console.error("[send-credit-email] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check idempotency: has email already been sent for this ledger entry?
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from("haven_credits_ledger")
      .select("id, email_sent_at")
      .eq("id", ledgerId)
      .single();

    if (ledgerError) {
      console.error("[send-credit-email] Error fetching ledger entry:", ledgerError);
      return new Response(
        JSON.stringify({ error: "Failed to verify ledger entry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ledgerEntry?.email_sent_at) {
      console.log(`[send-credit-email] Email already sent for ledger ${ledgerId} at ${ledgerEntry.email_sent_at}`);
      return new Response(
        JSON.stringify({ success: true, alreadySent: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user preference for credit email notifications
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credit_email_notifications")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[send-credit-email] Error fetching profile:", profileError);
      // Continue anyway - default is to send
    }

    if (profile && profile.credit_email_notifications === false) {
      console.log(`[send-credit-email] User ${userId} has disabled credit email notifications`);
      // Mark as sent (opted out) to prevent future attempts
      await supabase
        .from("haven_credits_ledger")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", ledgerId);

      return new Response(
        JSON.stringify({ success: true, optedOut: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content
    const displayActionName = getActionDisplayName(actionName);
    const subject = `You earned +${creditsAdded} © — ${displayActionName}`;
    
    const appUrl = "https://desk-helper-hub-36706.lovable.app";
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #183C35; margin: 0;">+${creditsAdded} ©</h1>
          <p style="color: #666; margin-top: 5px;">Haven Credits</p>
        </div>
        
        <p style="font-size: 16px; color: #333;">Hi ${firstName},</p>
        
        <p style="font-size: 16px; color: #333;">
          You just earned <strong>+${creditsAdded} ©</strong> for <strong>${displayActionName}</strong>.
        </p>
        
        <p style="font-size: 16px; color: #333;">
          Your Haven Credits balance is now <strong>${newBalance} ©</strong>.
        </p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${appUrl}/?profileTab=credits" 
             style="background: #B9DC54; color: #183C35; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            View your credits
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          You're receiving this because you earned Haven Credits.<br/>
          <a href="${appUrl}" style="color: #999;">Manage notification preferences in your profile settings</a>
        </p>
      </div>
    `;

    // Send email via Resend
    console.log(`[send-credit-email] Sending email to ${userEmail}`);
    
    const emailResponse = await resend.emails.send({
      from: "Haven <notifications@havenworkspace.ca>",
      to: [userEmail],
      subject: subject,
      html: html,
      tags: [
        { name: "category", value: "credit_notification" },
        { name: "ledger_id", value: ledgerId },
        { name: "user_id", value: userId },
      ],
    });

    console.log("[send-credit-email] Email sent successfully:", emailResponse);

    // Mark email as sent in ledger (idempotency)
    const { error: updateError } = await supabase
      .from("haven_credits_ledger")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", ledgerId);

    if (updateError) {
      console.error("[send-credit-email] Error marking email as sent:", updateError);
      // Don't fail - email was already sent
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-credit-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
