import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) throw userError;
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return new Response(
        JSON.stringify({ message: 'If an account exists, a reset link has been sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is declined
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'declined') {
      // Return success but don't send email
      return new Response(
        JSON.stringify({ message: 'If an account exists, a reset link has been sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) throw tokenError;

    // Send reset email
    await supabase.functions.invoke('send-notification', {
      body: {
        type: 'password_reset',
        data: {
          email: user.email,
          name: user.user_metadata?.full_name || 'Member',
          resetToken: token,
        },
      },
    });

    return new Response(
      JSON.stringify({ message: 'If an account exists, a reset link has been sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in request-password-reset function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});