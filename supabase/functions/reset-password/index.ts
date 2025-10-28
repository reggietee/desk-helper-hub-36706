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
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      throw new Error('Token and new password are required');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find and validate token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .single();

    if (tokenError || !resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token has expired
    const expiresAt = new Date(resetToken.expires_at);
    if (expiresAt < new Date()) {
      throw new Error('Reset token has expired');
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetToken.user_id,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (markUsedError) throw markUsedError;

    return new Response(
      JSON.stringify({ message: 'Password reset successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in reset-password function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});