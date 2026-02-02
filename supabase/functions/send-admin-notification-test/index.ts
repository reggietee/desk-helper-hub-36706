import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    console.log("[send-admin-notification-test] Starting test...");

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("[send-admin-notification-test] Auth error:", authError);
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
      console.error("[send-admin-notification-test] User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-admin-notification-test] Admin verified, sending test email...");

    // Check Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-admin-notification-test] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY is not configured" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/Toronto" });

    // Send test email
    const emailResponse = await resend.emails.send({
      from: "Haven Workspace <notifications@havenworkspace.ca>",
      to: [ADMIN_EMAIL],
      subject: "🧪 Test: New Member Signup Notification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f0f4e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #183C35; margin: 0;">🧪 Test Email</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Admin Notification System</p>
          </div>
          
          <p>This is a <strong>test email</strong> from the Haven admin notification system.</p>
          <p>If you're seeing this, the notification system is working correctly!</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Test Details:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Sent at: ${timestamp} (ET)</li>
              <li>Recipient: ${ADMIN_EMAIL}</li>
              <li>Triggered by: Admin panel test button</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">Haven Workspace</p>
        </div>
      `,
    });

    console.log("[send-admin-notification-test] Email response:", JSON.stringify(emailResponse));

    // Check for errors in response
    if (emailResponse.error) {
      console.error("[send-admin-notification-test] Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResponse.error.message || JSON.stringify(emailResponse.error)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = emailResponse.data?.id;
    console.log("[send-admin-notification-test] Email sent successfully! Message ID:", messageId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: messageId,
        recipient: ADMIN_EMAIL,
        sentAt: timestamp
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-admin-notification-test] Error:", error);
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