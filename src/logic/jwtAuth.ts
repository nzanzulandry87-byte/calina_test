import type { User, UserRole } from '../types/index.ts';

export interface JwtPayload {
  sub: string; // User ID
  name: string;
  username: string;
  role: UserRole;
  iat: number; // Issued at timestamp (seconds)
  exp: number; // Expiration timestamp (seconds)
}

const JWT_SECRET = 'calina_pos_secret_key_2026_jwt_token_secure_key';

// Base64Url Encoding Helper
function base64UrlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Base64Url Decoding Helper
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
}

// Deterministic signature generator for client-side JWT token validation
function generateSignature(headerB64: string, payloadB64: string, secret: string): string {
  const data = `${headerB64}.${payloadB64}.${secret}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return base64UrlEncode(Math.abs(hash).toString(16));
}

/**
 * Generates a signed JWT Token for a user.
 * Default expiration: 24 hours (86400 seconds)
 */
export function generateJwtToken(user: User, expiresInSeconds = 86400): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = generateSignature(headerB64, payloadB64, JWT_SECRET);

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes a JWT token.
 * Returns payload if valid & non-expired, null if invalid or expired.
 */
export function verifyAndDecodeJwtToken(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;

  // Verify signature
  const expectedSignature = generateSignature(headerB64, payloadB64, JWT_SECRET);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payloadStr = base64UrlDecode(payloadB64);
    const payload: JwtPayload = JSON.parse(payloadStr);

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) {
      // Token expired
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}
