// Encryption utilities using Web Crypto API with AES-256-GCM
// This is the server-side version for edge functions

const SALT = 'lovable-bot-secure-salt-2024'; // Static salt for key derivation

async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SALT),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptToken(token: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoder.encode(token)
    );

    const encryptedArray = new Uint8Array(encryptedContent);
    const combinedArray = new Uint8Array(iv.length + encryptedArray.length);
    combinedArray.set(iv);
    combinedArray.set(encryptedArray, iv.length);

    // Convert to base64
    const binaryString = Array.from(combinedArray)
      .map(byte => String.fromCharCode(byte))
      .join('');
    return btoa(binaryString);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt token');
  }
}

export async function decryptToken(encryptedData: string): Promise<string> {
  try {
    const decoder = new TextDecoder();
    const key = await getEncryptionKey();
    
    // Convert from base64
    const binaryString = atob(encryptedData);
    const combinedArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combinedArray[i] = binaryString.charCodeAt(i);
    }
    
    const iv = combinedArray.slice(0, 12);
    const encryptedContent = combinedArray.slice(12);

    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedContent
    );

    return decoder.decode(decryptedContent);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt token');
  }
}
