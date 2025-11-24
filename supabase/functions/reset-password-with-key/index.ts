import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encryptPassword } from '../_shared/encryption-password.ts';
import { hashRecoveryKey } from '../_shared/hash.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recovery_key, new_password } = await req.json();

    if (!recovery_key || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Clé de récupération et nouveau mot de passe requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valider le format du mot de passe
    if (new_password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 8 caractères' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Attempting to reset password with recovery key');
    console.log('Recovery key input (first 8 chars):', recovery_key.substring(0, 8) + '...');

    // Hasher la clé fournie pour la comparer avec celle en base
    const hashedKey = await hashRecoveryKey(recovery_key);
    console.log('Hashed key (first 16 chars):', hashedKey.substring(0, 16) + '...');

    // Vérifier la clé de récupération hashée
    const { data: keyData, error: keyError } = await supabaseClient
      .from('recovery_keys')
      .select('*')
      .eq('recovery_key', hashedKey)
      .eq('is_active', true)
      .is('used_at', null)
      .single();

    console.log('Database query result:', { found: !!keyData, error: keyError?.message });
    
    if (keyError || !keyData) {
      console.error('Key verification failed:', {
        error: keyError?.message,
        code: keyError?.code,
        details: keyError?.details,
      });
      
      // Vérifier si des clés existent pour debug
      const { data: allKeys, error: allKeysError } = await supabaseClient
        .from('recovery_keys')
        .select('id, user_id, is_active, used_at, created_at')
        .limit(5);
      
      console.log('All recovery keys in DB:', allKeys?.length || 0, 'keys found');
      
      return new Response(
        JSON.stringify({ error: 'Clé de récupération invalide ou déjà utilisée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que la clé n'est pas expirée (valide pendant 365 jours)
    const keyAge = Date.now() - new Date(keyData.created_at).getTime();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 365 jours
    
    if (keyAge > maxAge) {
      return new Response(
        JSON.stringify({ error: 'Clé de récupération expirée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chiffrer le nouveau mot de passe
    const passwordHash = await encryptPassword(new_password);

    // Mettre à jour le mot de passe de l'utilisateur
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', keyData.user_id);

    if (updateError) {
      console.error('Password update error:', updateError);
      throw updateError;
    }

    // Marquer la clé comme utilisée
    await supabaseClient
      .from('recovery_keys')
      .update({ 
        used_at: new Date().toISOString(),
        is_active: false 
      })
      .eq('id', keyData.id);

    console.log(`Password reset successfully for user: ${keyData.user_id}`);
    return new Response(
      JSON.stringify({ success: true, message: 'Mot de passe réinitialisé avec succès' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in reset-password-with-key:', error);
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
