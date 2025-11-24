// Fonction pour chiffrer un mot de passe
export async function encryptPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  const salt = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-change-in-production';
  const saltData = encoder.encode(salt);
  
  // Dériver une clé à partir du salt
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    saltData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  
  // Générer un IV aléatoire
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Chiffrer les données
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    data
  );
  
  // Combiner IV + données chiffrées
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  // Encoder en base64
  return btoa(String.fromCharCode(...combined));
}

// Fonction pour déchiffrer un mot de passe chiffré avec encryptPassword
export async function decryptPassword(encryptedPassword: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const salt = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-change-in-production';
  const saltData = encoder.encode(salt);

  // Dériver la même clé que pour le chiffrement
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    saltData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  );

  // Décoder le base64 en tableau d'octets
  const combined = Uint8Array.from(
    atob(encryptedPassword),
    (char) => char.charCodeAt(0)
  );

  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encryptedData
  );

  return decoder.decode(new Uint8Array(decryptedData));
}
