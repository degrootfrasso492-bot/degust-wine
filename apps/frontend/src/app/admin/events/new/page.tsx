'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Library } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useRequireAdmin } from '@/hooks/use-require-admin';
import EventForm from '@/components/admin/EventForm';
import WineForm from '@/components/admin/WineForm';
import {
  emptyWine,
  EventInput,
  WineInput,
} from '@/components/admin/admin-form-types';
import type { TastingEvent, Wine } from '@/types/api';

/** Дата хранится как полдень UTC, чтобы локальный день совпадал для всех поясов ±12ч. */
function toEventDate(date: string): string {
  return `${date}T12:00:00.000Z`;
}

export default function NewEventPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAdmin } = useRequireAdmin();

  const [event, setEvent] = useState<EventInput>({
    title: '',
    description: '',
    date: '',
    timezone: 'Europe/Moscow',
    isBlind: false,
    accessPin: '',
    coverUrl: null,
  });
  const [wines, setWines] = useState<WineInput[]>([emptyWine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-wine-500" />
      </div>
    );
  }

  const updateWine = (i: number, patch: Partial<WineInput>) => {
    setWines((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  };

  const addWine = () => setWines((prev) => [...prev, emptyWine()]);
  const removeWine = (i: number) =>
    setWines((prev) => prev.filter((_, idx) => idx !== i));

  const toWinePayload = (w: WineInput): Record<string, unknown> => ({
    title: w.title,
    blindLabel: w.blindLabel || undefined,
    category: w.category,
    abv: w.abv !== '' && w.abv !== undefined ? Number(w.abv) : undefined,
    composition: w.composition || undefined,
    producer: w.producer || undefined,
    country: w.country || undefined,
    region: w.region || undefined,
    aging: w.aging || undefined,
    methods: w.methods || undefined,
    description: w.description || undefined,
    photoUrl: w.photoUrl || undefined,
  });

  const handleSubmit = async () => {
    setError('');
    if (!event.title.trim()) {
      setError('Укажите название дегустации');
      return;
    }
    if (!event.date) {
      setError('Укажите дату дегустации');
      return;
    }
    const validWines = wines.filter((w) => w.title.trim());
    if (validWines.length === 0) {
      setError('Добавьте хотя бы одно вино');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.post<TastingEvent>('/events', {
        title: event.title.trim(),
        description: event.description || undefined,
        date: toEventDate(event.date),
        timezone: event.timezone,
        isBlind: event.isBlind,
        accessPin: event.accessPin || undefined,
        coverUrl: event.coverUrl || undefined,
      });

      for (let i = 0; i < validWines.length; i++) {
        await api.post<Wine>(`/events/${created.id}/wines`, {
          ...toWinePayload(validWines[i]),
          orderIndex: i,
        });
      }

      router.replace(`/admin/events/${created.id}`);
    } catch (e) {
      setError('Не удалось создать дегустацию. Проверьте данные.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50">
      <div className="max-w-3xl mx-auto p-4 pb-16">
        <div className="flex items-center gap-3 py-5">
          <Link
            href="/admin"
            className="p-2 rounded-full hover:bg-white transition-colors"
            aria-label="Назад"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <Link
            href="/catalog"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <Library size={16} />
            Каталог
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Новая дегустация</h1>
        </div>

        <div className="space-y-4">
          <EventForm
            event={event}
            onChange={(patch) => setEvent((prev) => ({ ...prev, ...patch }))}
          />

          <div>
            <p className="font-semibold text-gray-700 mb-2">Вина</p>
            <div className="space-y-3">
              {wines.map((wine, i) => (
                <WineForm
                  key={i}
                  wine={wine}
                  index={i}
                  onChange={(patch) => updateWine(i, patch)}
                  onRemove={() => removeWine(i)}
                  removable={wines.length > 1}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addWine}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-wine-300 text-wine-700 py-3 text-sm font-medium hover:bg-wine-50 transition-colors"
            >
              <Plus size={16} />
              Добавить вино
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-wine-500 text-white rounded-xl py-3.5 font-medium hover:bg-wine-700 transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              'Создать дегустацию'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
