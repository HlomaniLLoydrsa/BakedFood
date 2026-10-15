import { User } from '../types';

export function getToken(): string | null {
  return localStorage.getItem('droply_token');
}

export function getUser(): User | null {
  const raw = localStorage.getItem('droply_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem('droply_token', token);
  localStorage.setItem('droply_user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('droply_token');
  localStorage.removeItem('droply_user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
