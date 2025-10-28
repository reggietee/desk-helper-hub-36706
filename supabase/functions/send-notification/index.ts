import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'product_signout' | 'call_room' | 'meeting_room' | 'private_office' | 'issue' | 'guest_day_pass' | 'new_signup' | 'user_approved' | 'password_reset';
  data: Record<string, any>;
}

async function generateApprovalToken(userId: string): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${userId}.${timestamp}.${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`)
  );
  const sig = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 32);
  return `${userId}.${timestamp}.${sig}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: NotificationRequest = await req.json();

    let subject = '';
    let html = '';

    switch (type) {
      case 'new_signup':
        const approveToken = await generateApprovalToken(data.userId);
        const denyToken = await generateApprovalToken(data.userId);
        const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://');
        
        subject = 'New User Signup - Approval Required';
        html = `
          <h2>New User Registration</h2>
          <p>A new user has signed up and is awaiting approval:</p>
          <ul>
            <li><strong>Name:</strong> ${data.name}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            <li><strong>Signup Time:</strong> ${new Date(data.signupTime).toLocaleString()}</li>
          </ul>
          <p>Please review and take action:</p>
          <div style="margin: 20px 0;">
            <a href="${baseUrl}/functions/v1/approve-user" 
               style="background-color: #B9DC54; color: #183C35; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-right: 10px;"
               onclick="fetch('${baseUrl}/functions/v1/approve-user', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: '${approveToken}'})}).then(r => r.json()).then(d => alert(d.message || d.error)); return false;">
              ✓ Approve User
            </a>
            <a href="${baseUrl}/functions/v1/deny-user" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;"
               onclick="fetch('${baseUrl}/functions/v1/deny-user', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: '${denyToken}'})}).then(r => r.json()).then(d => alert(d.message || d.error)); return false;">
              ✗ Deny User
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">This link expires in 72 hours.</p>
        `;
        break;

      case 'user_approved':
        const loginUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/auth`;
        subject = 'Welcome to Haven Workspace - Account Approved!';
        html = `
          <h2>Welcome to Haven Workspace, ${data.name}!</h2>
          <p>Great news! Your account has been approved and you now have full access to Haven Workspace.</p>
          <p>You can log in and start using all our features:</p>
          <div style="margin: 20px 0;">
            <a href="${loginUrl}" 
               style="background-color: #B9DC54; color: #183C35; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Log In to Haven
            </a>
          </div>
          <p>We're excited to have you as part of our community!</p>
        `;
        break;

      case 'password_reset':
        const resetUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/reset-password?token=${data.resetToken}`;
        subject = 'Reset Your Haven Workspace Password';
        html = `
          <h2>Password Reset Request</h2>
          <p>Hi ${data.name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="margin: 20px 0;">
            <a href="${resetUrl}" 
               style="background-color: #B9DC54; color: #183C35; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, you can safely ignore this email.</p>
        `;
        break;

      case 'product_signout':
        subject = `Product Sign Out: ${data.item_type}`;
        html = `
          <h2>Product Sign Out Request</h2>
          <p><strong>User:</strong> ${data.user_name}</p>
          <p><strong>Item:</strong> ${data.item_type}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
        `;
        break;

      case 'call_room':
        subject = 'Call Room Booking';
        html = `
          <h2>Call Room Booking</h2>
          <p><strong>User:</strong> ${data.user_name}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
        `;
        break;

      case 'meeting_room':
        subject = 'Meeting Room Booking';
        html = `
          <h2>Meeting Room Booking</h2>
          <p><strong>User:</strong> ${data.user_name}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
        `;
        break;

      case 'private_office':
        subject = 'Private Office Booking';
        html = `
          <h2>Private Office Booking</h2>
          <p><strong>User:</strong> ${data.user_name}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Start Time:</strong> ${data.start_time}</p>
          <p><strong>Duration:</strong> ${data.duration}</p>
        `;
        break;

      case 'issue':
        subject = `Issue Submitted: ${data.issue_type}`;
        html = `
          <h2>Issue Submission</h2>
          <p><strong>User:</strong> ${data.user_name}</p>
          <p><strong>Issue Type:</strong> ${data.issue_type}</p>
          <p><strong>Details:</strong></p>
          <p>${data.details}</p>
        `;
        break;

      case 'guest_day_pass':
        subject = 'Guest Day Pass Request';
        html = `
          <h2>Guest Day Pass Request</h2>
          <p><strong>Member:</strong> ${data.user_name}</p>
          <p><strong>Guest Name:</strong> ${data.guest_name}</p>
          <p><strong>Guest Email:</strong> ${data.guest_email}</p>
          <p><strong>Guest Phone:</strong> ${data.guest_phone}</p>
          <p><strong>Arrival Date:</strong> ${data.date}</p>
          <p><strong>Arrival Time:</strong> ${data.time}</p>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "Haven Workspace <notifications@havenworkspace.ca>",
      to: ["reggie@havenworkspace.ca"],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
