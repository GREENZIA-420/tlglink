import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with user's JWT to verify they're authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !userRole) {
      console.error('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Admin user verified:', user.id);

    // Use service role key for the actual operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Fetching all bot configs...');

    // Get all bot configs
    const { data: botConfigs, error: fetchError } = await serviceClient
      .from('bot_configs')
      .select('id, bot_token');

    if (fetchError) {
      console.error('Error fetching bot configs:', fetchError);
      throw fetchError;
    }

    if (!botConfigs || botConfigs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No bot configs to encrypt', encrypted: 0, skipped: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${botConfigs.length} bot configs to encrypt`);

    let encryptedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Encrypt each token
    for (const config of botConfigs) {
      try {
        // Check if already encrypted (encrypted tokens are base64 with specific length)
        // If token starts with a number (like Telegram tokens do), it's not encrypted
        if (/^\d+:/.test(config.bot_token)) {
          console.log(`Encrypting token for bot ${config.id}...`);
          const encryptedToken = await encryptToken(config.bot_token);

          const { error: updateError } = await serviceClient
            .from('bot_configs')
            .update({ bot_token: encryptedToken })
            .eq('id', config.id);

          if (updateError) {
            console.error(`Error updating bot ${config.id}:`, updateError);
            errors.push(`Bot ${config.id}: ${updateError.message}`);
          } else {
            encryptedCount++;
            console.log(`Successfully encrypted token for bot ${config.id}`);
          }
        } else {
          console.log(`Token for bot ${config.id} appears to be already encrypted, skipping`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error processing bot ${config.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Bot ${config.id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Encryption process completed',
        encrypted: encryptedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
