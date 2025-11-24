// Système JWT sécurisé avec signature HMAC-SHA256
// Ce fichier gère la création et vérification des tokens JWT signés

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

// Fonction pour encoder en base64url (pour JWT)
function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Fonction pour décoder base64url
function base64UrlDecode(data: string): string {
  // Remplacer les caractères URL-safe par les caractères standard
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  
  // Ajouter le padding si nécessaire
  const padding = base64.length % 4;
  if (padding > 0) {
    base64 += '='.repeat(4 - padding);
  }
  
  return atob(base64);
}

// Fonction pour créer une signature HMAC-SHA256
async function createSignature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  );

  // Convertir la signature en base64url
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  return signatureBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Créer un JWT signé
export async function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresInDays: number = 7): Promise<string> {
  const secret = Deno.env.get('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + (expiresInDays * 24 * 60 * 60),
  };

  // Créer le header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // Encoder header et payload en base64url
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  // Créer la signature
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await createSignature(message, secret);

  // Retourner le JWT complet
  return `${message}.${signature}`;
}

// Vérifier et décoder un JWT
export async function verifyJWT(token: string): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  const secret = Deno.env.get('JWT_SECRET');
  if (!secret) {
    return { valid: false, error: 'JWT_SECRET not configured' };
  }

  try {
    // Séparer le JWT en ses composants
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWT format' };
    }

    const [encodedHeader, encodedPayload, providedSignature] = parts;

    // Vérifier la signature
    const message = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await createSignature(message, secret);

    if (expectedSignature !== providedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Décoder le payload
    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: JWTPayload = JSON.parse(payloadJson);

    // Vérifier l'expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error('JWT verification error:', error);
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper pour extraire et vérifier le JWT depuis le header Authorization
export async function verifyAuthHeader(authHeader: string | null): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  if (!authHeader) {
    return { valid: false, error: 'No authorization header' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid authorization header format' };
  }

  const token = authHeader.replace('Bearer ', '');
  return await verifyJWT(token);
}
