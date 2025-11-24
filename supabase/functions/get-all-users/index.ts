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

    // Vérifier que l'utilisateur est super admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!userData || userData.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - super admin requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer tous les utilisateurs avec leurs bots
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        bot_configs (
          id,
          bot_name,
          is_active,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Users error:', usersError)
      throw usersError
    }

    // Compter les utilisateurs Telegram pour chaque bot
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        if (user.bot_configs && user.bot_configs.length > 0) {
          const { count } = await supabase
            .from('telegram_users')
            .select('*', { count: 'exact', head: true })
            .eq('bot_id', user.bot_configs[0].id)
          
          return {
            ...user,
            telegram_users_count: count || 0
          }
        }
        return {
          ...user,
          telegram_users_count: 0
        }
      })
    )

    return new Response(
      JSON.stringify({ users: usersWithStats }),
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
