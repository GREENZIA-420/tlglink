import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash function pour les mots de passe (à améliorer avec bcrypt pour la production)
function hashPassword(password: string): string {
  const hash = createHash('sha256').update(password).digest('hex');
  return typeof hash === 'string' ? hash : hash.toString('hex');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email et mot de passe requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Login attempt for:', email);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Chercher l'utilisateur
    const { data: user, error: fetchError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (fetchError || !user) {
      console.error('User not found or inactive:', email);
      return new Response(
        JSON.stringify({ error: 'Email ou mot de passe incorrect' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Vérifier le mot de passe avec le nouveau système (SHA-256)
    const passwordHash = hashPassword(password);
    let isPasswordValid = user.password_hash === passwordHash;
    let needsMigration = false;
    
    // Si le mot de passe ne correspond pas avec SHA-256, essayer avec l'ancien système AES-GCM
    if (!isPasswordValid) {
      try {
        // Importer la fonction de décryptage AES-GCM
        const { encryptPassword } = await import('../_shared/encryption-password.ts');
        const encryptedPassword = await encryptPassword(password);
        
        // Comparer avec le mot de passe chiffré stocké
        if (user.password_hash === encryptedPassword) {
          isPasswordValid = true;
          needsMigration = true;
          console.log('Password valid with old encryption, migration needed for:', email);
        }
      } catch (error) {
        console.error('Error checking old password format:', error);
      }
    }
    
    if (!isPasswordValid) {
      console.error('Invalid password for:', email);
      return new Response(
        JSON.stringify({ error: 'Email ou mot de passe incorrect' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Si le mot de passe nécessite une migration, le mettre à jour avec le nouveau hash
    if (needsMigration) {
      await supabaseClient
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', user.id);
      console.log('Password migrated to new hash format for:', email);
    }

    // Mettre à jour last_login_at
    await supabaseClient
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Créer une session simple (token JWT sera implémenté plus tard)
    const session = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      access_token: btoa(JSON.stringify({ userId: user.id, timestamp: Date.now() })),
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 jours
    };

    console.log('Login successful for:', email);

    return new Response(
      JSON.stringify({ session }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
