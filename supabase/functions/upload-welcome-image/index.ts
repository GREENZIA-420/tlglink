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
    const formData = await req.formData()
    const file = formData.get('file') as File
    const botId = formData.get('botId') as string

    if (!file || !botId) {
      return new Response(
        JSON.stringify({ error: 'Fichier ou botId manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Upload le fichier
    const fileExt = file.name.split('.').pop()
    const fileName = `welcome-${botId}-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('welcome-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('welcome-images')
      .getPublicUrl(fileName)

    return new Response(
      JSON.stringify({ url: publicUrl }),
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
