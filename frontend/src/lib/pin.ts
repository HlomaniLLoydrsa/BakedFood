const PIN_SESSION_KEY = 'droply_admin_verified';
const PIN_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

export function isPinVerified(): boolean {
  try {
    const raw = sessionStorage.getItem(PIN_SESSION_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    if (Date.now() - ts > PIN_EXPIRY_MS) {
      sessionStorage.removeItem(PIN_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setPinVerified(): void {
  sessionStorage.setItem(PIN_SESSION_KEY, JSON.stringify({ ts: Date.now() }));
}

export function clearPin(): void {
  sessionStorage.removeItem(PIN_SESSION_KEY);
}
