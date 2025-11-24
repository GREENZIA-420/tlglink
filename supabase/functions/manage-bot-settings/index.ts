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
    const { settings, botId } = await req.json()

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

    // Traiter chaque setting
    for (const setting of settings) {
      // Vérifier si le setting existe
      const { data: existing } = await supabase
        .from('bot_settings')
        .select('id')
        .eq('key', setting.key)
        .eq('bot_id', botId)
        .maybeSingle()

      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from('bot_settings')
          .update({ 
            value: setting.value,
            updated_by: userId 
          })
          .eq('key', setting.key)
          .eq('bot_id', botId)

        if (error) {
          console.error('Update error:', error)
          throw error
        }
      } else {
        // Créer
        const { error } = await supabase
          .from('bot_settings')
          .insert({
            key: setting.key,
            value: setting.value,
            bot_id: botId,
            updated_by: userId,
          })

        if (error) {
          console.error('Insert error:', error)
          throw error
        }
      }
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
