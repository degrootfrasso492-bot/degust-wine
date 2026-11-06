'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

/**
 * Защита административных маршрутов: если пользователь не ADMIN,
 * редирект на /login. Возвращает статус для рендера лоадера.
 */
export function useRequireAdmin() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();
  const isAdmin = isAuthenticated && user?.role === 'ADMIN';

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/login');
    }
  }, [isLoading, isAdmin, router]);

  return { isLoading, isAdmin, user };
}
