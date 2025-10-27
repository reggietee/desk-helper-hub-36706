import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'product_signout' | 'call_room' | 'meeting_room' | 'private_office' | 'issue';
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
