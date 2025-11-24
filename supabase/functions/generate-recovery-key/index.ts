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

// Générer une clé de récupération unique (format: XXXX-XXXX-XXXX-XXXX-XXXX)
function generateRecoveryKey(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = 5;
  const segmentLength = 4;
  
  const key = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => 
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
  }).join('-');
  
  return key;
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

    // Désactiver les anciennes clés
    await supabaseClient
      .from('recovery_keys')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Générer une nouvelle clé unique
    let recoveryKey: string;
    let encryptedKey: string;
    let isUnique = false;
    
    while (!isUnique) {
      recoveryKey = generateRecoveryKey();
      encryptedKey = await encryptToken(recoveryKey);
      
      // Vérifier l'unicité de la clé cryptée
      const { data: existing } = await supabaseClient
        .from('recovery_keys')
        .select('id')
        .eq('recovery_key', encryptedKey)
        .single();
      
      if (!existing) {
        isUnique = true;
      }
    }

    // Insérer la nouvelle clé cryptée
    const { data: newKey, error } = await supabaseClient
      .from('recovery_keys')
      .insert({
        user_id: userId,
        recovery_key: encryptedKey!,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Recovery key generated for user: ${userId}`);
    // Retourner la clé en clair à l'utilisateur (une seule fois)
    return new Response(
      JSON.stringify({ success: true, recovery_key: recoveryKey! }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-recovery-key:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
