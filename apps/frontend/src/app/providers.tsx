'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: 1,
          },
        },
      }),
  );

  const initFromStorage = useAuthStore((s) => s.initFromStorage);

  // Проверяем httpOnly-cookie сессии через /auth/me один раз при монтировании.
  // Это гарантирует isLoading → false и user до любых page-level auth guard.
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
