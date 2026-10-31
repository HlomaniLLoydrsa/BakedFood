// Admin session is a JWT returned by POST /api/pin/login. We keep it in
// sessionStorage (cleared when the tab closes) and attach it to every API
// request via an axios interceptor (see lib/api.ts).
const TOKEN_KEY = 'droply_admin_token';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isPinVerified(): boolean {
  return !!getAdminToken();
}
