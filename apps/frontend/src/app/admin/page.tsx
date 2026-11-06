'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Plus, Wine, Library } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useRequireAdmin } from '@/hooks/use-require-admin';
import { PaginatedResponse, TastingEvent } from '@/types/api';

const PHASE_BADGE: Record<string, { label: string; className: string }> = {
  UPCOMING: { label: 'Скоро', className: 'bg-amber-100 text-amber-700' },
  OPEN: { label: 'Идёт сейчас', className: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Завершена', className: 'bg-gray-100 text-gray-500' },
};

export default function AdminPage() {
  const { isLoading: authLoading, isAdmin } = useRequireAdmin();

  const { data, isLoading } = useQuery<PaginatedResponse<TastingEvent>>({
    queryKey: ['admin', 'events'],
    queryFn: () => api.get('/events?limit=100'),
    enabled: isAdmin,
  });

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-wine-500" />
      </div>
    );
  }

  const events = data?.items ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50">
      <div className="max-w-3xl mx-auto p-4 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-5 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-white transition-colors flex-shrink-0"
              aria-label="На главную"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <Link
              href="/catalog"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors whitespace-nowrap"
            >
              <Library size={16} className="flex-shrink-0" />
              Каталог
            </Link>
            <h1 className="text-xl font-bold text-gray-900">
              Администрирование
            </h1>
          </div>
          <Link
            href="/admin/events/new"
            className="flex items-center gap-2 bg-wine-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-wine-700 transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Plus size={16} className="flex-shrink-0" />
            <span className="hidden sm:inline">Создать дегустацию</span>
            <span className="sm:hidden">Создать</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-wine-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <Wine size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Пока нет дегустаций. Создайте первую.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const badge = PHASE_BADGE[event.phase ?? 'UPCOMING'] ?? PHASE_BADGE.UPCOMING;
              return (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-wine-100 to-orange-50 flex items-center justify-center flex-shrink-0">
                    <Wine size={22} className="text-wine-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {' · '}
                      {event.wines?.length ?? 0} образцов
                    </p>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
