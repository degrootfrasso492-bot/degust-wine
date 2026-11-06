'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Wine, LogIn, User, QrCode, Heart, ChevronRight, LayoutDashboard, Library } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { FeedPage } from '@/types/api';
import { FeedEventCard } from '@/components/feed/FeedEventCard';

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = isAuthenticated && user?.role === 'ADMIN';

  const {
    data: feed,
    isLoading,
    isError,
  } = useQuery<FeedPage>({
    queryKey: ['events', 'feed'],
    queryFn: () => api.get<FeedPage>('/events/feed?limit=20'),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50">
      <div className="max-w-2xl mx-auto p-4 pb-16">
        {/* Nav */}
        <nav className="flex items-center justify-between py-4 mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Wine size={24} className="text-wine-500 flex-shrink-0" />
            <span className="font-bold text-xl text-wine-700 truncate">Drinx-edu</span>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
            <Link
              href="/catalog"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <Library size={15} className="flex-shrink-0" />
              <span className="hidden sm:inline">Каталог</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-wine-500 text-white text-sm font-medium hover:bg-wine-700 transition-colors whitespace-nowrap"
              >
                <LayoutDashboard size={15} className="flex-shrink-0" />
                <span className="hidden sm:inline">Админ-панель</span>
              </Link>
            )}
            {isAuthenticated ? (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User size={15} className="flex-shrink-0" />
                <span className="max-w-[100px] sm:max-w-none truncate">{user?.name ?? 'Профиль'}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-wine-500 text-white text-sm font-medium hover:bg-wine-700 transition-colors whitespace-nowrap"
              >
                <LogIn size={15} className="flex-shrink-0" />
                Войти
              </Link>
            )}
          </div>
        </nav>

        {/* Hero - not authenticated */}
        {!isAuthenticated && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-wine-500 to-wine-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-wine-500/30">
              <Wine size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Дегустационные заметки
            </h1>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Оценивайте вина по методике WSET, добавляйте дескрипторы и
              сравнивайте с залом
            </p>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 flex items-center justify-center gap-2 bg-wine-500 text-white rounded-xl py-3 font-medium hover:bg-wine-700 transition-colors"
              >
                <LogIn size={16} />
                Войти
              </Link>
              <Link
                href="/join"
                className="flex-1 flex items-center justify-center gap-2 border-2 border-wine-300 text-wine-700 rounded-xl py-3 font-medium hover:bg-wine-50 transition-colors"
              >
                <QrCode size={16} />
                По QR-коду
              </Link>
            </div>
          </div>
        )}

        {/* User: navigate to profile */}
        {isAuthenticated && user?.role !== 'ADMIN' && (
          <div className="space-y-3 mb-6">
            <Link
              href="/profile"
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-wine-100 flex items-center justify-center">
                <Heart size={22} className="text-wine-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Избранные вина</p>
                <p className="text-xs text-gray-400">
                  Лайкнутые образцы и заметки
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </Link>
            <Link
              href="/profile?tab=events"
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                <Wine size={22} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Мои дегустации</p>
                <p className="text-xs text-gray-400">
                  История посещённых мероприятий
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </Link>
          </div>
        )}

        {/* Feed - visible to everyone */}
        <h2 className="font-semibold text-gray-700 mb-3">Дегустации</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <p className="text-gray-400 text-sm text-center py-6">
            Не удалось загрузить ленту
          </p>
        ) : !feed || feed.items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-gray-400 text-sm">Пока нет дегустаций</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.items.map((event) => (
              <FeedEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
