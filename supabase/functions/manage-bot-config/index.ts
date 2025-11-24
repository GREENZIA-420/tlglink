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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

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
      throw new Error('Unauthorized');
    }

    const { action, botConfig } = await req.json();
    console.log(`Processing action: ${action} for user: ${user.id}`);

    if (action === 'create' || action === 'update') {
      if (!botConfig.bot_token) {
        throw new Error('Bot token is required');
      }

      // Encrypt the token
      const encryptedToken = await encryptToken(botConfig.bot_token);

      const configData = {
        bot_name: botConfig.bot_name,
        bot_token: encryptedToken,
        admin_id: user.id,
        is_active: botConfig.is_active ?? true,
      };

      let result;
      if (action === 'create') {
        result = await supabaseClient
          .from('bot_configs')
          .insert(configData)
          .select()
          .single();
      } else {
        if (!botConfig.id) {
          throw new Error('Bot ID is required for update');
        }
        result = await supabaseClient
          .from('bot_configs')
          .update(configData)
          .eq('id', botConfig.id)
          .eq('admin_id', user.id)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      console.log(`Bot config ${action}d successfully:`, result.data.id);
      return new Response(
        JSON.stringify({ success: true, data: result.data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      if (!botConfig.id) {
        throw new Error('Bot ID is required for delete');
      }

      const { error } = await supabaseClient
        .from('bot_configs')
        .delete()
        .eq('id', botConfig.id)
        .eq('admin_id', user.id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log(`Bot config deleted successfully:`, botConfig.id);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in manage-bot-config:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: errorMessage === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
