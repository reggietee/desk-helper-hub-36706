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
    const { token, reason } = await req.json();

    if (!token) {
      throw new Error('Token is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Decode the token (format: userId.timestamp.signature)
    const [userId, timestamp, signature] = token.split('.');
    
    if (!userId || !timestamp || !signature) {
      throw new Error('Invalid token format');
    }

    // Verify token hasn't expired (72 hours)
    const tokenTimestamp = parseInt(timestamp);
    const now = Date.now();
    const expiryTime = 72 * 60 * 60 * 1000; // 72 hours
    
    if (now - tokenTimestamp > expiryTime) {
      return new Response(
        JSON.stringify({ error: 'Token has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature
    const expectedSignature = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${userId}.${timestamp}.${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`)
    );
    const expectedSig = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32);

    if (signature !== expectedSig) {
      throw new Error('Invalid token signature');
    }

    // Check if already processed
    const { data: existingEvents } = await supabase
      .from('approval_events')
      .select('*')
      .eq('user_id', userId)
      .eq('token_used', token)
      .single();

    if (existingEvents) {
      return new Response(
        JSON.stringify({ message: 'This denial has already been processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
        declined_reason: reason || 'Not specified',
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Log the denial event
    const { error: logError } = await supabase
      .from('approval_events')
      .insert({
        user_id: userId,
        action: 'declined',
        token_used: token,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

    if (logError) throw logError;

    // Note: We don't send email to declined users as per requirements

    return new Response(
      JSON.stringify({ message: 'User denied successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in deny-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});