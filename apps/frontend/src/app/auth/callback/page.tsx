'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { User } from '@/types/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    // Защита от двойного запуска в StrictMode.
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        // JWT уже в httpOnly-cookie, установленной backend при callback.
        const user = await api.get<User>('/auth/me');
        useAuthStore.getState().setUser(user);
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
