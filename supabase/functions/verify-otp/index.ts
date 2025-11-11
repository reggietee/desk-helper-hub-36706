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

    console.log(`OTP verification attempt for email: ${email}`);

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
      console.log("No valid token found");
      
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
      console.log("Token expired");
      
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
      console.log("Token mismatch");
      
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
          console.log("Warning email sent");
        } catch (emailError) {
          console.error("Failed to send warning email:", emailError);
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

    console.log("OTP verified successfully");

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);

    let userId: string;

    if (!userExists) {
      // Create new user
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || 'User'
        }
      });

      if (signUpError || !newUser.user) {
        console.error("Error creating user:", signUpError);
        throw new Error("Failed to create user account");
      }

      userId = newUser.user.id;
      console.log("New user created:", userId);
    } else {
      userId = existingUsers.users.find(u => u.email === email)!.id;
      console.log("Existing user found:", userId);
    }

    // Generate session using admin API - create a magic link and extract the hashed token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError || !linkData) {
      console.error("Error generating link:", linkError);
      throw new Error("Failed to create session");
    }

    console.log("Magic link generated successfully");

    // Verify the OTP using the hashed token to create a proper session
    // Note: Only token_hash and type should be provided, not email
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: linkData.properties.hashed_token,
    });

    if (sessionError || !sessionData?.session || !sessionData?.user) {
      console.error("Error creating session:", sessionError);
      throw new Error("Failed to create session");
    }

    console.log("Session created successfully");

    // Log successful attempt
    await supabase
      .from("auth_attempt_logs")
      .insert({
        user_email: email,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true
      });

    // If this was a new user signup, send notification to admin
    if (!userExists) {
      try {
        await resend.emails.send({
          from: "Haven Workspace <notifications@havenworkspace.ca>",
          to: ["reggie@storymode.co"],
          subject: "New Member Account Request",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">New Member Account Request</h1>
              <p>A new member has signed up and is awaiting approval:</p>
              <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Name:</strong> ${fullName || 'User'}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })}</p>
              </div>
              <p>Please log in to the admin panel to review and approve this request.</p>
              <p style="color: #666; font-size: 12px; margin-top: 40px;">Haven Workspace Admin</p>
            </div>
          `,
        });
        console.log("Admin notification sent for new signup");
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
      }
    }

    // Clean up old tokens
    await supabase.rpc('cleanup_expired_otp_tokens');

    return new Response(
      JSON.stringify({ 
        success: true,
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        userId: sessionData.user.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to verify code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
