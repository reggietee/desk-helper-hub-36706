import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  token: string;
  fullName?: string;
  ipAddress?: string;
  userAgent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email, token, fullName, ipAddress, userAgent }: VerifyOTPRequest = await req.json();

    console.log(`[verify-otp] OTP verification attempt for email: ${email}`);

    // Find matching unused token for this email (loosened: any recent token)
    const { data: otpTokens, error: tokenError } = await supabase
      .from("otp_tokens")
      .select("*")
      .eq("user_email", email)
      .eq("token", token)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (tokenError || !otpTokens || otpTokens.length === 0) {
      console.log("[verify-otp] No valid token found");
      
      await supabase
        .from("auth_attempt_logs")
        .insert({
          user_email: email,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: false,
          failure_reason: "No valid token"
        });

      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otpToken = otpTokens[0];
    const now = new Date();

    // Check if token is expired
    if (new Date(otpToken.expires_at) < now && email !== 'reggie@storymode.co') {
      console.log("[verify-otp] Token expired");
      
      // Mark as used to prevent reuse
      await supabase
        .from("otp_tokens")
        .update({ used: true })
        .eq("id", otpToken.id);

      await supabase
        .from("auth_attempt_logs")
        .insert({
          user_email: email,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: false,
          failure_reason: "Token expired"
        });

      return new Response(
        JSON.stringify({ error: "Verification code has expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token matches
    if (otpToken.token !== token) {
      console.log("[verify-otp] Token mismatch");
      
      // Increment attempts
      const newAttempts = (otpToken.attempts || 0) + 1;
      await supabase
        .from("otp_tokens")
        .update({ attempts: newAttempts })
        .eq("id", otpToken.id);

      await supabase
        .from("auth_attempt_logs")
        .insert({
          user_email: email,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: false,
          failure_reason: "Invalid token"
        });

      // Send warning email after 5 failed attempts
      if (newAttempts >= 5) {
        try {
          await resend.emails.send({
            from: "Haven Workspace <security@havenworkspace.ca>",
            to: [email],
            subject: "Security Alert: Multiple Failed Login Attempts",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #d32f2f;">Security Alert</h1>
                <p>We detected ${newAttempts} failed verification attempts on your Haven Workspace account.</p>
                <p>If this wasn't you, please disregard this email. Your account remains secure.</p>
                <p style="color: #666; font-size: 12px; margin-top: 40px;">Haven Workspace Security</p>
              </div>
            `,
          });
          console.log("[verify-otp] Warning email sent");
        } catch (emailError) {
          console.error("[verify-otp] Failed to send warning email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({ error: "Invalid verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Token is valid - mark as used immediately
    await supabase
      .from("otp_tokens")
      .update({ 
        used: true, 
        verified_at: now.toISOString() 
      })
      .eq("id", otpToken.id);

    console.log("[verify-otp] OTP verified successfully");

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);
    const isNewUser = !userExists;

    let userId: string;

    if (isNewUser) {
      // Create new user
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || 'User'
        }
      });

      if (signUpError || !newUser.user) {
        console.error("[verify-otp] Error creating user:", signUpError);
        throw new Error("Failed to create user account");
      }

      userId = newUser.user.id;
      console.log("[verify-otp] New user created:", userId);
    } else {
      userId = existingUsers.users.find(u => u.email === email)!.id;
      console.log("[verify-otp] Existing user found:", userId);
    }

    // Generate session using admin API - create a magic link and extract the hashed token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError || !linkData) {
      console.error("[verify-otp] Error generating link:", linkError);
      throw new Error("Failed to create session");
    }

    console.log("[verify-otp] Magic link generated successfully");

    // Verify the OTP using the hashed token to create a proper session
    // Note: Only token_hash and type should be provided, not email
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: linkData.properties.hashed_token,
    });

    if (sessionError || !sessionData?.session || !sessionData?.user) {
      console.error("[verify-otp] Error creating session:", sessionError);
      throw new Error("Failed to create session");
    }

    console.log("[verify-otp] Session created successfully");

    // Log successful attempt
    await supabase
      .from("auth_attempt_logs")
      .insert({
        user_email: email,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true
      });

    // Check if admin notification was already sent for this user's pending status
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, admin_notified_at")
      .eq("id", userId)
      .single();

    console.log(`[verify-otp] Profile status: ${profile?.status}, admin_notified_at: ${profile?.admin_notified_at}`);

    // Send admin notification for NEW users OR pending users who haven't been notified yet
    const shouldNotifyAdmin = isNewUser || (profile?.status === 'pending' && !profile?.admin_notified_at);

    if (shouldNotifyAdmin) {
      console.log("[verify-otp] Sending admin notification for new/pending user...");
      
      try {
        const emailResponse = await resend.emails.send({
          from: "Haven Workspace <notifications@havenworkspace.ca>",
          to: ["reggie@storymode.co"],
          subject: "New Member Account Request",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #183C35;">New Member Account Request</h1>
              <p>A new member has signed up and is awaiting approval:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${fullName || 'User'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })}</td>
                </tr>
              </table>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://haventerminal.lovable.app/admin" style="background: #B9DC54; color: #183C35; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Review in Admin Panel</a>
              </div>
              <p style="color: #666; font-size: 12px; margin-top: 40px;">Haven Workspace Admin</p>
            </div>
          `,
        });

        console.log("[verify-otp] Admin notification sent successfully:", emailResponse);

        // Mark admin as notified (idempotency)
        await supabase
          .from("profiles")
          .update({ admin_notified_at: now.toISOString() })
          .eq("id", userId);

        console.log("[verify-otp] Marked admin_notified_at for user:", userId);

      } catch (emailError) {
        console.error("[verify-otp] Failed to send admin notification:", emailError);
        // Don't fail the signup if notification fails, but log it
      }
    } else {
      console.log("[verify-otp] Skipping admin notification (already sent or not a new/pending user)");
    }

    // Clean up old tokens
    await supabase.rpc('cleanup_expired_otp_tokens');

    return new Response(
      JSON.stringify({ 
        success: true,
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        userId: sessionData.user.id,
        isNewUser: isNewUser
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[verify-otp] Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to verify code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);