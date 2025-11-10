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

interface SendOTPRequest {
  email: string;
  fullName?: string;
  ipAddress?: string;
  userAgent?: string;
  captchaToken?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email, fullName, ipAddress, userAgent, captchaToken }: SendOTPRequest = await req.json();

    console.log(`OTP request for email: ${email}, IP: ${ipAddress}`);

    // Check rate limiting
    const { data: rateLimit, error: rateLimitError } = await supabase
      .from("auth_rate_limits")
      .select("*")
      .eq("ip_address", ipAddress || "unknown")
      .eq("endpoint", "send-otp")
      .single();

    if (rateLimitError && rateLimitError.code !== "PGRST116") {
      console.error("Rate limit check error:", rateLimitError);
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    // If rate limit exists and is locked
    if (rateLimit) {
      if (rateLimit.locked_until && new Date(rateLimit.locked_until) > now) {
        const minutesLeft = Math.ceil((new Date(rateLimit.locked_until).getTime() - now.getTime()) / 60000);
        console.log(`Rate limited: ${minutesLeft} minutes remaining`);
        
        return new Response(
          JSON.stringify({ 
            error: "Too many attempts. Please try again later.",
            requiresCaptcha: true,
            retryAfter: minutesLeft
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Reset if 15 minutes have passed
      if (new Date(rateLimit.updated_at) < fifteenMinutesAgo) {
        await supabase
          .from("auth_rate_limits")
          .update({ attempt_count: 1, locked_until: null, updated_at: now.toISOString() })
          .eq("id", rateLimit.id);
      } else {
        // Increment attempt count
        const newCount = rateLimit.attempt_count + 1;
        const needsCaptcha = newCount >= 5;
        
        // If needs captcha and no token provided
        if (needsCaptcha && !captchaToken) {
          await supabase
            .from("auth_rate_limits")
            .update({ 
              attempt_count: newCount, 
              locked_until: new Date(now.getTime() + 15 * 60 * 1000).toISOString()
            })
            .eq("id", rateLimit.id);

          return new Response(
            JSON.stringify({ 
              error: "Too many attempts. Please complete the CAPTCHA.",
              requiresCaptcha: true
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify CAPTCHA if provided
        if (captchaToken) {
          const hcaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
          const verifyResponse = await fetch("https://hcaptcha.com/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${hcaptchaSecret}&response=${captchaToken}`
          });
          
          const verifyData = await verifyResponse.json();
          
          if (!verifyData.success) {
            console.log("CAPTCHA verification failed");
            return new Response(
              JSON.stringify({ error: "CAPTCHA verification failed. Please try again." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Reset rate limit on successful CAPTCHA
          await supabase
            .from("auth_rate_limits")
            .update({ attempt_count: 0, locked_until: null })
            .eq("id", rateLimit.id);
        } else {
          await supabase
            .from("auth_rate_limits")
            .update({ attempt_count: newCount })
            .eq("id", rateLimit.id);
        }
      }
    } else {
      // Create new rate limit entry
      await supabase
        .from("auth_rate_limits")
        .insert({
          ip_address: ipAddress || "unknown",
          endpoint: "send-otp",
          attempt_count: 1
        });
    }

    // Generate 6-digit OTP
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    // Store OTP token
    const { error: tokenError } = await supabase
      .from("otp_tokens")
      .insert({
        user_email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
        attempts: 0
      });

    if (tokenError) {
      console.error("Error storing OTP token:", tokenError);
      throw new Error("Failed to generate verification code");
    }

    // Send email with OTP
    const emailResponse = await resend.emails.send({
      from: "Haven Workspace <onboarding@resend.dev>",
      to: [email],
      subject: "Your Haven Workspace Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Verification Code</h1>
          <p>Hello${fullName ? ` ${fullName}` : ''},</p>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h2 style="color: #333; font-size: 32px; letter-spacing: 8px; margin: 0;">${token}</h2>
          </div>
          <p>This code will expire in <strong>5 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p style="color: #666; font-size: 12px; margin-top: 40px;">Haven Workspace</p>
        </div>
      `,
    });

    console.log("OTP sent successfully:", emailResponse);

    // Log attempt
    await supabase
      .from("auth_attempt_logs")
      .insert({
        user_email: email,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true
      });

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
