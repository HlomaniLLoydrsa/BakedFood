import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

// Resolve a valid expiry. Env values can arrive malformed (e.g. quotes kept
// literally in a hosting dashboard: `"7d"` instead of 7d), which makes
// jwt.sign throw. Sanitise and fall back to a safe default so login never
// 500s because of a bad env var.
function resolveExpiresIn(): string | number {
  const raw = (process.env.JWT_EXPIRES_IN || '').trim().replace(/^["']|["']$/g, '');
  if (!raw) return '7d';
  // A plain number string = seconds.
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  // A timespan like 7d / 20h / 60m / 30s.
  if (/^\d+\s*(ms|s|m|h|d|w|y)$/i.test(raw)) return raw;
  // Anything else is invalid — use the default rather than throwing.
  return '7d';
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: resolveExpiresIn() } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
