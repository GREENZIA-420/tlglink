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
    const { action, button, buttonId, botId } = await req.json()

    // Vérifier que l'utilisateur est bien l'admin du bot
    const { data: botConfig } = await supabase
      .from('bot_configs')
      .select('id')
      .eq('id', botId)
      .eq('admin_id', userId)
      .maybeSingle()

    if (!botConfig) {
      return new Response(
        JSON.stringify({ error: 'Bot non trouvé ou accès non autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result;

    switch (action) {
      case 'create':
        const { data: newButton, error: createError } = await supabase
          .from('bot_buttons')
          .insert({
            ...button,
            bot_id: botId,
            updated_by: userId,
          })
          .select()
          .single()

        if (createError) throw createError
        result = { button: newButton }
        break

      case 'update':
        const { error: updateError } = await supabase
          .from('bot_buttons')
          .update({
            ...button,
            updated_by: userId,
          })
          .eq('id', buttonId)
          .eq('bot_id', botId)

        if (updateError) throw updateError
        result = { success: true }
        break

      case 'delete':
        const { error: deleteError } = await supabase
          .from('bot_buttons')
          .delete()
          .eq('id', buttonId)
          .eq('bot_id', botId)

        if (deleteError) throw deleteError
        result = { success: true }
        break

      case 'toggle':
        const { error: toggleError } = await supabase
          .from('bot_buttons')
          .update({
            is_active: button.is_active,
            updated_by: userId,
          })
          .eq('id', buttonId)
          .eq('bot_id', botId)

        if (toggleError) throw toggleError
        result = { success: true }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Action invalide' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify(result),
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
