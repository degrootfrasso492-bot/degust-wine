import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { User } from '@/types/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  initFromStorage: () => Promise<void>;
  updateUser: (user: User) => void;
}

function getCachedUser(): User | null {
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
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      // JWT в localStorage не храним: он живёт только в httpOnly-cookie.
      // Кэш профиля нужен лишь для мгновенного UI до ответа /auth/me.
      window.localStorage.setItem('degust_user', JSON.stringify(user));
    }
    set({ user, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('degust_user');
    }
    // Гасим и серверную cookie, иначе после «выхода» сессия останется живой.
    void api.post('/auth/logout').catch(() => undefined);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  initFromStorage: async () => {
    // Токен недоступен из JS, поэтому наличие сессии проверяем запросом
    // /auth/me (браузер сам приложит httpOnly-cookie).
    const cachedUser = getCachedUser();
    if (cachedUser) {
      set({ user: cachedUser, isAuthenticated: true, isLoading: true });
    }

    try {
      const freshUser = await api.get<User>('/auth/me');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('degust_user', JSON.stringify(freshUser));
      }
      set({ user: freshUser, isAuthenticated: true, isLoading: false });
    } catch {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('degust_user');
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (user) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('degust_user', JSON.stringify(user));
    }
    set({ user });
  },
}));
