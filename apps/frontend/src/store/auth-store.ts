import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  initFromStorage: () => Promise<void>;
  updateUser: (user: User) => void;
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('degust_token');
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('degust_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user, token) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('degust_token', token);
      window.localStorage.setItem('degust_user', JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('degust_token');
      window.localStorage.removeItem('degust_user');
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  initFromStorage: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Оптимистично показываем кэш, но держим isLoading, пока не получим
    // свежего пользователя из /auth/me — важно, чтобы актуальная роль (ADMIN)
    // не была перезаписана устаревшим кэшем из localStorage.
    const cachedUser = getStoredUser();
    if (cachedUser) {
      set({ user: cachedUser, token, isAuthenticated: true, isLoading: true });
    }

    try {
      const freshUser = await api.get<User>('/auth/me');
      window.localStorage.setItem('degust_user', JSON.stringify(freshUser));
      set({ user: freshUser, token, isAuthenticated: true, isLoading: false });
    } catch {
      window.localStorage.removeItem('degust_token');
      window.localStorage.removeItem('degust_user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (user) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('degust_user', JSON.stringify(user));
    }
    set({ user });
  },
}));
