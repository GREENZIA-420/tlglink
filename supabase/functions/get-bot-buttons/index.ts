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

    // Get bot config first
    const { data: botConfig, error: configError } = await supabase
      .from('bot_configs')
      .select('id')
      .eq('admin_id', userId)
      .maybeSingle()

    if (configError) {
      console.error('Error fetching bot config:', configError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération de la configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!botConfig) {
      return new Response(
        JSON.stringify({ buttons: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get buttons for this bot
    const { data: buttons, error: buttonsError } = await supabase
      .from('bot_buttons')
      .select('*')
      .eq('bot_id', botConfig.id)
      .order('position', { ascending: true })

    if (buttonsError) {
      console.error('Error fetching buttons:', buttonsError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des boutons' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ buttons: buttons || [] }),
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
