import { useState, useCallback } from 'react';
import api from '../lib/api';
import { setAuth, clearAuth, getToken, getUser } from '../lib/auth';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(getUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
      setUser(res.data.user);
      return res.data;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Login failed. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!getToken(),
    login,
    logout,
  };
}
