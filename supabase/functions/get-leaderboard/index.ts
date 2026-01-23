import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all credits with balance > 0, joined with profiles for active members
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from("haven_credits")
      .select(`
        user_id,
        balance,
        profiles!inner (
          full_name,
          status
        )
      `)
      .gt("balance", 0)
      .eq("profiles.status", "active")
      .order("balance", { ascending: false });

    if (leaderboardError) {
      console.error("Leaderboard query error:", leaderboardError);
      return new Response(JSON.stringify({ error: "Failed to fetch leaderboard" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the current user's credits (even if 0)
    const { data: currentUserCredits } = await supabase
      .from("haven_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Format the leaderboard
    const formattedLeaderboard = (leaderboardData || [])
      .map((entry: any, index: number) => ({
        rank: index + 1,
        userId: entry.user_id,
        name: entry.profiles?.full_name || "Unknown",
        balance: entry.balance,
        isCurrentUser: entry.user_id === user.id,
      }))
      // Secondary sort by name for ties
      .sort((a: any, b: any) => {
        if (b.balance !== a.balance) return b.balance - a.balance;
        return a.name.localeCompare(b.name);
      })
      // Re-assign ranks after secondary sort
      .map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1,
      }));

    // Check if current user is in the leaderboard
    const currentUserInList = formattedLeaderboard.some((e: any) => e.isCurrentUser);
    const currentUserBalance = currentUserCredits?.balance ?? 0;

    // If current user has 0 balance or isn't in the list, add them separately
    let currentUserEntry = null;
    if (!currentUserInList) {
      currentUserEntry = {
        rank: null,
        userId: user.id,
        name: currentUserProfile?.full_name || "You",
        balance: currentUserBalance,
        isCurrentUser: true,
      };
    }

    return new Response(
      JSON.stringify({
        leaderboard: formattedLeaderboard,
        currentUserEntry,
        currentUserId: user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
