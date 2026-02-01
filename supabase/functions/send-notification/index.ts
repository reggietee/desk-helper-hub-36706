import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'product_signout' | 'call_room' | 'meeting_room' | 'private_office' | 'issue' | 'guest_day_pass' | 'member_approved' | 'sprint_join';
  data: Record<string, any>;
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

      case 'member_approved':
        subject = 'Welcome to Haven Workspace!';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #183C35;">Welcome to Haven Workspace!</h1>
            <p>Hi ${data.user_name},</p>
            <p>Great news! Your Haven Workspace account has been approved.</p>
            <p>You can now log in to access your member dashboard and all the features we offer:</p>
            <ul>
              <li>Book call rooms and meeting spaces</li>
              <li>Request guest day passes</li>
              <li>Submit maintenance issues</li>
              <li>View special member offers</li>
              <li>And much more!</li>
            </ul>
            <div style="margin: 30px 0; text-align: center;">
              <a href="https://haventerminal.lovable.app/auth" style="background: #B9DC54; color: #183C35; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Log In Now</a>
            </div>
            <p>We're excited to have you as part of our community!</p>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">Haven Workspace Team</p>
          </div>
        `;
        break;

      case 'sprint_join':
        subject = `Co-Working Sprint: ${data.user_name} joined!`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #183C35;">New Sprint Participant</h1>
            <p>A member has joined the co-working sprint:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Member:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.user_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.user_email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Sprint:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.sprint_title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.sprint_date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.sprint_time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Capacity:</strong></td>
                <td style="padding: 8px 0;">${data.current_count}/${data.max_count} spots filled</td>
              </tr>
            </table>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">Haven Workspace</p>
          </div>
        `;
        break;
    }

    // Determine recipient based on notification type
    const recipient = type === 'member_approved' ? [data.email] : ["reggie@havenworkspace.ca"];

    const emailResponse = await resend.emails.send({
      from: "Haven Workspace <notifications@havenworkspace.ca>",
      to: recipient,
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
