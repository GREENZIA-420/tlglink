import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionPayload {
  user: {
    id: string;
  };
  expires_at: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    let session: SessionPayload;
    try {
      session = JSON.parse(atob(token));
    } catch {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.expires_at < Date.now()) {
      return new Response(
        JSON.stringify({ error: 'Session expirée' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { action, botConfig } = await req.json();
    console.log(`Processing action: ${action} for user: ${userId}`);

    if (action === 'create' || action === 'update') {
      const baseData = {
        bot_name: botConfig.bot_name,
        admin_id: userId,
        is_active: botConfig.is_active ?? true,
      };

      let result;

      if (action === 'create') {
        if (!botConfig.bot_token || typeof botConfig.bot_token !== 'string' || !botConfig.bot_token.trim()) {
          throw new Error('Bot token is required');
        }

        const encryptedToken = await encryptToken(botConfig.bot_token);
        const configData = {
          ...baseData,
          bot_token: encryptedToken,
        };

        result = await supabaseClient
          .from('bot_configs')
          .insert(configData)
          .select()
          .single();

        if (result.error) {
          console.error('Database error:', result.error);
          throw result.error;
        }

        // Générer et mettre à jour le webhook_url avec le bot_id
        const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-webhook?bot_id=${result.data.id}`;
        const updateResult = await supabaseClient
          .from('bot_configs')
          .update({ webhook_url: webhookUrl })
          .eq('id', result.data.id)
          .select()
          .single();

        if (updateResult.error) {
          console.error('Webhook URL update error:', updateResult.error);
          throw updateResult.error;
        }

        result = updateResult;
      } else {
        if (!botConfig.id) {
          throw new Error('Bot ID is required for update');
        }

        const updateData: Record<string, unknown> = { ...baseData };

        if (typeof botConfig.bot_token === 'string' && botConfig.bot_token.trim() !== '') {
          const encryptedToken = await encryptToken(botConfig.bot_token);
          updateData.bot_token = encryptedToken;
        }

        result = await supabaseClient
          .from('bot_configs')
          .update(updateData)
          .eq('id', botConfig.id)
          .eq('admin_id', userId)
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
        .eq('admin_id', userId);

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
    const status =
      errorMessage === 'Unauthorized' ||
      errorMessage === 'Token invalide' ||
      errorMessage === 'Session expirée'
        ? 401
        : 400;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
