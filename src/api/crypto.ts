const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function hmacSign(data: string, secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(data));
}

export async function createToken(userId: string, email: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };

  const headerEncoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadEncoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  
  const signature = await hmacSign(signatureInput, JWT_SECRET);
  const signatureEncoded = base64UrlEncode(signature);

  return `${signatureInput}.${signatureEncoded}`;
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const [headerEncoded, payloadEncoded, signatureEncoded] = token.split('.');
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    
    const expectedSignature = await hmacSign(signatureInput, JWT_SECRET);
    const expectedSignatureEncoded = base64UrlEncode(expectedSignature);

    if (signatureEncoded !== expectedSignatureEncoded) {
      return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadEncoded)));
    
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordData = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  
  const combined = new Uint8Array(salt.length + hash.byteLength);
  combined.set(salt);
  combined.set(new Uint8Array(hash), salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const storedHash = combined.slice(16);
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedHash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(derivedHash))) === 
         btoa(String.fromCharCode(...storedHash));
}

export function generateId(): string {
  return crypto.randomUUID();
}
