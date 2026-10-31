/// <reference types="vite/client" />
import axios from 'axios';
import { getAdminToken, clearAdminToken } from './pin';

// - Local dev:    Vite proxies /api → localhost:3001
// - Netlify prod: netlify.toml redirects /api → /.netlify/functions/api
// Both cases just use /api as the base — no env var needed.
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the admin JWT (if present) to every request.
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server rejects the token (401), drop it and bounce to the admin gate.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAdminToken();
      // Only redirect when we're inside the admin area, so public pages that
      // happen to hit a protected endpoint don't yank the customer away.
      if (window.location.pathname.startsWith('/admin')) {
        window.location.assign('/admin');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.response?.data?.message || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
