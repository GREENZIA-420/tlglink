import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'
import { verifyAuthHeader } from '../_shared/jwt.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Vérifier et décoder le JWT signé
    const authHeader = req.headers.get('Authorization')
    const verification = await verifyAuthHeader(authHeader)
    
    if (!verification.valid || !verification.payload) {
      console.error('Auth verification failed:', verification.error)
      return new Response(
        JSON.stringify({ error: verification.error || 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = verification.payload.userId
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
