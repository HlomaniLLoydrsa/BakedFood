/// <reference types="vite/client" />
import axios from 'axios';

// - Local dev:    Vite proxies /api → localhost:3001
// - Netlify prod: netlify.toml redirects /api → /.netlify/functions/api
// Both cases just use /api as the base — no env var needed.
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.response?.data?.message || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
