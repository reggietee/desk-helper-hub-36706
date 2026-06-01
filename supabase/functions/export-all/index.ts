import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-export-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const TABLES = [
  "profiles",
  "haven_credits",
  "haven_credits_ledger",
  "meeting_room_bookings",
  "call_room_bookings",
  "private_office_bookings",
  "issues",
  "guest_day_pass_requests",
  "product_signouts",
  "weekly_schedules",
  "member_visits",
  "onboarding_progress",
  "calendar_events",
  "calendar_invite_logs",
  "daily_calls",
  "livestreams",
  "coworking_sprints",
  "coworking_sprint_participants",
  "coworking_sprint_emails",
  "feed_items",
  "haven_settings",
  "haven_updates",
  "daily_credits_report_logs",
  "user_roles",
];

const PAGE = 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expected = Deno.env.get("EXPORT_SECRET");
    const provided = req.headers.get("x-export-secret");
    if (!expected || !provided || provided !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tables: Record<string, unknown[]> = {};
    const errors: Record<string, string> = {};

    for (const t of TABLES) {
      const rows: unknown[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(t)
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) {
          errors[t] = error.message;
          break;
        }
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      tables[t] = rows;
    }

    // auth users
    const authUsers: Array<Record<string, unknown>> = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        errors["auth_users"] = error.message;
        break;
      }
      const users = data?.users ?? [];
      for (const u of users) {
        authUsers.push({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          raw_user_meta_data: (u as any).user_metadata ?? (u as any).raw_user_meta_data ?? null,
        });
      }
      if (users.length < 1000) break;
      page += 1;
    }

    const body = {
      exported_at: new Date().toISOString(),
      tables,
      auth_users: authUsers,
      errors: Object.keys(errors).length ? errors : undefined,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
