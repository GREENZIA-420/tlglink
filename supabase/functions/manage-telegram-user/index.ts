import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CustomJWT {
  user: {
    id: string;
  };
  expires_at: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    let session: CustomJWT
    try {
      session = JSON.parse(atob(token))
    } catch {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (session.expires_at < Date.now()) {
      return new Response(
        JSON.stringify({ error: 'Session expirée' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = session.user.id
    const { telegramUserId, isBanned } = await req.json()

    // Get the bot config for this user
    const { data: botConfig } = await supabase
      .from('bot_configs')
      .select('id')
      .eq('admin_id', userId)
      .maybeSingle()

    if (!botConfig) {
      return new Response(
        JSON.stringify({ error: 'Configuration du bot non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify that the telegram user belongs to this bot
    const { data: telegramUser } = await supabase
      .from('telegram_users')
      .select('id')
      .eq('id', telegramUserId)
      .eq('bot_id', botConfig.id)
      .maybeSingle()

    if (!telegramUser) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé ou accès non autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the ban status
    const { error: updateError } = await supabase
      .from('telegram_users')
      .update({
        is_banned: isBanned,
        banned_at: isBanned ? new Date().toISOString() : null,
        banned_by: isBanned ? userId : null,
      })
      .eq('id', telegramUserId)

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
