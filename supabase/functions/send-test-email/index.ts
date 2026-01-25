import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "reggie@storymode.co";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[send-test-email] === START ===");

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("[send-test-email] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      console.error("[send-test-email] User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-test-email] Admin verified:", user.email);

    // Check Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-test-email] RESEND_API_KEY is not configured!");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY is not configured in environment secrets"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-test-email] RESEND_API_KEY configured (length: ${resendApiKey.length})`);

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    const senderAddress = "notifications@havenworkspace.ca";
    const subject = "Haven Test Email — Credit Notification System";
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/Toronto" });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #183C35; margin: 0;">🧪 Test Email</h1>
          <p style="color: #666; margin-top: 5px;">Haven Credits Notification System</p>
        </div>
        
        <p style="font-size: 16px; color: #333;">Hi Admin,</p>
        
        <p style="font-size: 16px; color: #333;">
          This is a <strong>test email</strong> from the Haven Credits notification system.
        </p>
        
        <p style="font-size: 16px; color: #333;">
          If you're seeing this, the Resend integration is working correctly!
        </p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;"><strong>Details:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
            <li>Sent at: ${timestamp} (ET)</li>
            <li>From: ${senderAddress}</li>
            <li>To: ${ADMIN_EMAIL}</li>
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an admin test email from Haven.
        </p>
      </div>
    `;

    console.log(`[send-test-email] Sending from: Haven <${senderAddress}>`);
    console.log(`[send-test-email] Sending to: ${ADMIN_EMAIL}`);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `Haven <${senderAddress}>`,
      to: [ADMIN_EMAIL],
      subject: subject,
      html: html,
      tags: [
        { name: "category", value: "test_email" },
      ],
    });

    console.log("[send-test-email] Resend API response:", JSON.stringify(emailResponse));

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error("[send-test-email] Resend returned error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResponse.error.message || JSON.stringify(emailResponse.error),
          details: emailResponse.error
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = emailResponse.data?.id;
    console.log(`[send-test-email] ✅ Test email sent successfully! Message ID: ${messageId}`);
    console.log("[send-test-email] === END SUCCESS ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: messageId,
        recipient: ADMIN_EMAIL,
        subject: subject,
        sentAt: timestamp
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-test-email] === ERROR ===");
    console.error("[send-test-email] Error:", error);
    console.error("[send-test-email] Error message:", error.message);
    console.error("[send-test-email] Error stack:", error.stack);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
