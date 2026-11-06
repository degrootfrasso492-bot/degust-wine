'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api, setToken } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { User } from '@/types/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    // Токен во фрагменте читаем один раз (защита от двойного запуска в StrictMode).
    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      router.replace('/login');
      return;
    }

    const run = async () => {
      try {
        setToken(token);
        const user = await api.get<User>('/auth/me');
        useAuthStore.getState().setUser(user, token);
        router.replace('/');
      } catch {
        useAuthStore.getState().clearAuth();
        router.replace('/login?error=oauth');
      }
    };
    void run();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-wine-50 to-orange-50">
      <p className="text-sm text-gray-600">Авторизация…</p>
      <Loader2 size={24} className="animate-spin text-wine-500" />
    </div>
  );
}
