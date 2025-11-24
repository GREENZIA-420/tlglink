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

    const adminUserId = verification.payload.userId
    const { targetUserId, isBanned } = await req.json()

    // Vérifier que l'utilisateur est super admin
    const { data: adminData } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single()

    if (!adminData || adminData.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - super admin requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Empêcher de se bannir soi-même
    if (targetUserId === adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Impossible de se bannir soi-même' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Désactiver l'utilisateur
    const { error: userError } = await supabase
      .from('users')
      .update({ is_active: !isBanned })
      .eq('id', targetUserId)

    if (userError) {
      console.error('User update error:', userError)
      throw userError
    }

    // Désactiver tous les bots de l'utilisateur
    const { error: botError } = await supabase
      .from('bot_configs')
      .update({ is_active: !isBanned })
      .eq('admin_id', targetUserId)

    if (botError) {
      console.error('Bot update error:', botError)
      throw botError
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
