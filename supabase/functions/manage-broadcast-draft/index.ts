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
    const { action, draft } = await req.json()

    if (action === 'create' || action === 'update') {
      if (!draft.bot_id || !draft.title || !draft.message) {
        return new Response(
          JSON.stringify({ error: 'bot_id, title et message sont requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const draftData = {
        bot_id: draft.bot_id,
        admin_id: userId,
        title: draft.title,
        message: draft.message,
        media_urls: draft.media_urls || null,
        button_ids: draft.button_ids || null,
        is_scheduled: draft.is_scheduled || false,
        scheduled_date: draft.scheduled_date || null,
        scheduled_time: draft.scheduled_time || null,
      }

      let result
      if (action === 'create') {
        result = await supabase
          .from('broadcast_drafts')
          .insert(draftData)
          .select()
          .single()
      } else {
        if (!draft.id) {
          return new Response(
            JSON.stringify({ error: 'ID du brouillon requis pour la mise à jour' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        result = await supabase
          .from('broadcast_drafts')
          .update(draftData)
          .eq('id', draft.id)
          .eq('admin_id', userId)
          .select()
          .single()
      }

      if (result.error) {
        console.error('Database error:', result.error)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la sauvegarde du brouillon' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, draft: result.data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      if (!draft.id) {
        return new Response(
          JSON.stringify({ error: 'ID du brouillon requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase
        .from('broadcast_drafts')
        .delete()
        .eq('id', draft.id)
        .eq('admin_id', userId)

      if (error) {
        console.error('Delete error:', error)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la suppression du brouillon' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Action invalide' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
