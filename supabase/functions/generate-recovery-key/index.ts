import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { hashRecoveryKey } from '../_shared/hash.ts';

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

    // Supprimer les anciennes clés
    await supabaseClient
      .from('recovery_keys')
      .delete()
      .eq('user_id', userId);

    // Générer une nouvelle clé unique
    let recoveryKey: string;
    let hashedKey: string;
    let isUnique = false;
    
    while (!isUnique) {
      recoveryKey = generateRecoveryKey();
      hashedKey = await hashRecoveryKey(recoveryKey);
      
      // Vérifier l'unicité du hash
      const { data: existing } = await supabaseClient
        .from('recovery_keys')
        .select('id')
        .eq('recovery_key', hashedKey)
        .single();
      
      if (!existing) {
        isUnique = true;
      }
    }

    // Insérer la nouvelle clé hashée
    const { data: newKey, error } = await supabaseClient
      .from('recovery_keys')
      .insert({
        user_id: userId,
        recovery_key: hashedKey!,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Recovery key generated for user: ${userId}`);
    console.log('Generated key (first 8 chars):', recoveryKey!.substring(0, 8) + '...');
    console.log('Hashed key (first 16 chars):', hashedKey!.substring(0, 16) + '...');
    
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
