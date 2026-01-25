import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map reason codes to friendly action names
const REASON_DISPLAY_NAMES: Record<string, string> = {
  daily_checkin: "Daily check-in",
  weekly_planning: "Weekly planning",
  weekly_streak_bonus: "5-day streak bonus",
  admin_adjustment: "Admin adjustment",
};

function getActionDisplayName(reason: string): string {
  if (reason.startsWith("admin_adjustment:")) {
    return reason.replace("admin_adjustment:", "Admin adjustment - ");
  }
  return REASON_DISPLAY_NAMES[reason] || reason;
}

function formatDateET(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getReportDateString(): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const reportDate = getReportDateString();
  console.log(`[daily-credits-report] Starting report for ${reportDate}`);

  try {
    // Check idempotency - has report already been sent today?
    const { data: existingReport, error: checkError } = await supabase
      .from("daily_credits_report_logs")
      .select("id, status, sent_at")
      .eq("report_date", reportDate)
      .maybeSingle();

    if (checkError) {
      console.error("[daily-credits-report] Error checking existing report:", checkError);
      throw new Error("Failed to check existing report");
    }

    if (existingReport?.status === "sent") {
      console.log(`[daily-credits-report] Report already sent for ${reportDate}`);
      return new Response(
        JSON.stringify({ success: true, alreadySent: true, reportDate }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update report log entry
    let reportLogId: string;
    if (existingReport) {
      reportLogId = existingReport.id;
      await supabase
        .from("daily_credits_report_logs")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", reportLogId);
    } else {
      const { data: newLog, error: insertError } = await supabase
        .from("daily_credits_report_logs")
        .insert({ report_date: reportDate, status: "processing" })
        .select("id")
        .single();

      if (insertError) {
        console.error("[daily-credits-report] Error creating report log:", insertError);
        throw new Error("Failed to create report log");
      }
      reportLogId = newLog.id;
    }

    // Fetch all active members with their credits
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, status")
      .or("status.eq.active,status.eq.approved");

    if (profilesError) {
      console.error("[daily-credits-report] Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch profiles");
    }

    console.log(`[daily-credits-report] Found ${profiles?.length || 0} active profiles`);

    // Fetch credits balances for all users
    const { data: credits, error: creditsError } = await supabase
      .from("haven_credits")
      .select("user_id, balance");

    if (creditsError) {
      console.error("[daily-credits-report] Error fetching credits:", creditsError);
      throw new Error("Failed to fetch credits");
    }

    // Create a map of user_id to balance
    const creditsMap = new Map<string, number>();
    credits?.forEach((c) => creditsMap.set(c.user_id, c.balance));

    // Fetch recent activities for each member (3 most recent positive entries)
    const memberData: Array<{
      name: string;
      email: string;
      balance: number;
      activities: Array<{ action: string; amount: number; date: string }>;
    }> = [];

    for (const profile of profiles || []) {
      const balance = creditsMap.get(profile.id) || 0;

      // Fetch 3 most recent positive credit entries
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from("haven_credits_ledger")
        .select("amount, reason, created_at")
        .eq("user_id", profile.id)
        .gt("amount", 0)
        .order("created_at", { ascending: false })
        .limit(3);

      if (ledgerError) {
        console.error(`[daily-credits-report] Error fetching ledger for ${profile.id}:`, ledgerError);
      }

      const activities = (ledgerEntries || []).map((entry) => ({
        action: getActionDisplayName(entry.reason),
        amount: entry.amount,
        date: formatDateET(new Date(entry.created_at)),
      }));

      memberData.push({
        name: profile.full_name,
        email: profile.email || "",
        balance,
        activities,
      });
    }

    // Sort by balance descending, then name A-Z
    memberData.sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return a.name.localeCompare(b.name);
    });

    console.log(`[daily-credits-report] Prepared data for ${memberData.length} members`);

    // Generate Excel file
    const worksheetData: (string | number)[][] = [
      [
        "Member Name",
        "Member Email",
        "Current Credits Balance",
        "Activity 1 - Action",
        "Activity 1 - Credits",
        "Activity 1 - Date",
        "Activity 2 - Action",
        "Activity 2 - Credits",
        "Activity 2 - Date",
        "Activity 3 - Action",
        "Activity 3 - Credits",
        "Activity 3 - Date",
      ],
    ];

    for (const member of memberData) {
      const row: (string | number)[] = [
        member.name,
        member.email,
        member.balance,
      ];

      // Add up to 3 activities
      for (let i = 0; i < 3; i++) {
        if (member.activities[i]) {
          row.push(
            member.activities[i].action,
            `+${member.activities[i].amount}`,
            member.activities[i].date
          );
        } else {
          row.push("", "", "");
        }
      }

      worksheetData.push(row);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 25 }, // Member Name
      { wch: 30 }, // Member Email
      { wch: 20 }, // Current Credits Balance
      { wch: 20 }, // Activity 1 - Action
      { wch: 15 }, // Activity 1 - Credits
      { wch: 20 }, // Activity 1 - Date
      { wch: 20 }, // Activity 2 - Action
      { wch: 15 }, // Activity 2 - Credits
      { wch: 20 }, // Activity 2 - Date
      { wch: 20 }, // Activity 3 - Action
      { wch: 15 }, // Activity 3 - Credits
      { wch: 20 }, // Activity 3 - Date
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Credits Report");

    // Generate binary Excel file
    const excelBuffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
    const filename = `haven-credits-report-${reportDate}.xlsx`;

    const generatedAtET = formatDateET(new Date());

    // Send email with attachment
    const emailResponse = await resend.emails.send({
      from: "Haven <notifications@havenworkspace.ca>",
      to: ["reggie@storymode.co"],
      subject: `Haven Credits Daily Report — ${reportDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #183C35; margin-bottom: 20px;">Haven Credits Daily Report</h1>
          
          <p style="font-size: 16px; color: #333;">
            The daily Haven Credits report is attached.
          </p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Report Date:</strong> ${reportDate}</p>
            <p style="margin: 5px 0;"><strong>Members Included:</strong> ${memberData.length}</p>
            <p style="margin: 5px 0;"><strong>Generated:</strong> ${generatedAtET} ET</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This report includes all active members, their current credits balance, and their 3 most recent credit-earning activities.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated report from Haven Base.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: filename,
          content: excelBuffer,
        },
      ],
      tags: [
        { name: "category", value: "daily_credits_report" },
        { name: "report_date", value: reportDate },
      ],
    });

    console.log("[daily-credits-report] Email sent successfully:", emailResponse);

    // Update report log with success
    await supabase
      .from("daily_credits_report_logs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        members_included: memberData.length,
        resend_message_id: emailResponse.data?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportLogId);

    return new Response(
      JSON.stringify({
        success: true,
        reportDate,
        membersIncluded: memberData.length,
        emailId: emailResponse.data?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[daily-credits-report] Error:", error);

    // Update report log with failure
    await supabase
      .from("daily_credits_report_logs")
      .update({
        status: "failed",
        error: error.message || "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("report_date", reportDate);

    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
