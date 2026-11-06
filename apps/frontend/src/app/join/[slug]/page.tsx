'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Lock, Wine } from 'lucide-react';
import { api, setToken } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { TastingEvent, User } from '@/types/api';

export default function JoinPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { isLoading, setUser } = useAuthStore();

  const [pin, setPin] = useState('');
  const [needsPin, setNeedsPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setEvent] = useState<TastingEvent | null>(null);

  const tryJoin = async (pinValue?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = pinValue
        ? `/events/join/${slug}?pin=${encodeURIComponent(pinValue)}`
        : `/events/join/${slug}`;
      const result = await api.get<{
        event: TastingEvent;
        guest?: { accessToken: string; user: User };
      }>(url);

      if (result.guest) {
        setToken(result.guest.accessToken);
        setUser(result.guest.user, result.guest.accessToken);
      }

      setEvent(result.event);
      router.replace(`/tasting/${result.event.id}`);
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 403) {
        setNeedsPin(true);
        if (pinValue) setError('Неверный PIN-код');
      } else {
        setError('Мероприятие не найдено или недоступно');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      tryJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (loading && !needsPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wine-50 to-orange-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-wine-500 mx-auto mb-3" />
          <p className="text-gray-600">Подключение к дегустации...</p>
        </div>
      </div>
    );
  }

  if (needsPin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xs">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-wine-500 mb-3">
              <Lock className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Введите PIN</h1>
            <p className="text-sm text-gray-500 mt-1">
              Дегустация защищена кодом доступа
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              tryJoin(pin);
            }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4"
          >
            <input
              type="text"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              maxLength={6}
              className="w-full text-center text-2xl tracking-widest rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-wine-300"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full bg-wine-500 text-white rounded-xl py-3 font-medium hover:bg-wine-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Войти в дегустацию'
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-4 mt-4">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-wine-500 transition-colors"
            >
              Главная
            </Link>
            <Link
              href="/catalog"
              className="text-sm text-gray-500 hover:text-wine-500 transition-colors"
            >
              Каталог
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Wine size={48} className="text-wine-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Не удалось подключиться
          </h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <a
              href="/"
              className="inline-block bg-wine-500 text-white rounded-xl px-6 py-3 font-medium hover:bg-wine-700 transition-colors"
            >
              На главную
            </a>
            <a
              href="/catalog"
              className="inline-block border-2 border-wine-300 text-wine-700 rounded-xl px-6 py-3 font-medium hover:bg-wine-50 transition-colors"
            >
              Каталог
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
