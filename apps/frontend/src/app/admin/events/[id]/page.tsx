'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Library,
  Loader2,
  Plus,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useRequireAdmin } from '@/hooks/use-require-admin';
import EventForm from '@/components/admin/EventForm';
import WineForm from '@/components/admin/WineForm';
import {
  emptyWine,
  EventInput,
  WineInput,
} from '@/components/admin/admin-form-types';
import type {
  AttributeScale,
  EventCard,
  ScalePreset,
  Wine,
} from '@/types/api';

function toEventDate(date: string): string {
  return `${date}T12:00:00.000Z`;
}

function wineToInput(w: Wine): WineInput {
  return {
    title: w.title ?? '',
    blindLabel: w.blindLabel ?? '',
    category: w.category,
    abv: w.abv != null ? String(w.abv) : '',
    composition: w.composition ?? '',
    producer: w.producer ?? '',
    country: w.country ?? '',
    region: w.region ?? '',
    aging: w.aging ?? '',
    methods: w.methods ?? '',
    description: w.description ?? '',
    photoUrl: w.photoUrl ?? null,
  };
}

function wineToPayload(w: WineInput): Record<string, unknown> {
  return {
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
  };
}

interface WineDraft {
  id?: string;
  wine: WineInput;
}

export default function AdminEventPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const eventId = params.id as string;
  const { isLoading: authLoading, isAdmin } = useRequireAdmin();

  const { data: card, isLoading } = useQuery<EventCard>({
    queryKey: ['event-card', eventId],
    queryFn: () => api.get(`/events/${eventId}`),
    enabled: isAdmin,
  });

  const { data: scalesLibrary = [] } = useQuery<AttributeScale[]>({
    queryKey: ['scales'],
    queryFn: () => api.get('/scales'),
    enabled: isAdmin,
  });

  const { data: presets = [] } = useQuery<ScalePreset[]>({
    queryKey: ['scales', 'presets'],
    queryFn: () => api.get('/scales/presets'),
    enabled: isAdmin,
  });

  const summary = card?.event;
  const existingWines = card?.wines ?? [];
  const currentScales = summary?.scales ?? [];

  const [eventForm, setEventForm] = useState<EventInput | null>(null);
  const [wineDrafts, setWineDrafts] = useState<WineDraft[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [newPin, setNewPin] = useState('');
  const [qr, setQr] = useState<{ qrCode: string; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Инициализация форм из загруженной карточки.
  useEffect(() => {
    if (!summary) return;
    setEventForm({
      title: summary.title,
      description: summary.description ?? '',
      date: new Date(summary.date).toISOString().slice(0, 10),
      timezone: summary.timezone,
      isBlind: summary.isBlind,
      accessPin: '',
      coverUrl: summary.coverUrl,
    });
    setWineDrafts(existingWines.map((w) => ({ id: w.id, wine: wineToInput(w) })));
    setSelectedSlugs(currentScales.map((s) => s.slug));
  }, [summary, existingWines, currentScales]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['event-card', eventId] });

  if (authLoading || !isAdmin || isLoading || !summary || !eventForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-wine-500" />
      </div>
    );
  }

  const nextOrderIndex =
    Math.max(-1, ...existingWines.map((w) => w.orderIndex)) + 1;

  const saveEvent = async () => {
    setSaving(true);
    try {
      await api.patch(`/events/${eventId}`, {
        title: eventForm.title.trim(),
        description: eventForm.description || undefined,
        date: toEventDate(eventForm.date),
        timezone: eventForm.timezone,
        isBlind: eventForm.isBlind,
        coverUrl: eventForm.coverUrl || undefined,
        // accessPin не трогаем здесь — управляется отдельно.
      });
      flash('Событие сохранено');
      refresh();
    } catch {
      flash('Не удалось сохранить событие');
    } finally {
      setSaving(false);
    }
  };

  const savePin = async () => {
    setSaving(true);
    try {
      await api.patch(`/events/${eventId}`, { accessPin: newPin });
      setNewPin('');
      flash(newPin ? 'PIN установлен' : 'PIN снят');
    } catch {
      flash('Не удалось изменить PIN');
    } finally {
      setSaving(false);
    }
  };

  const updateWine = (i: number, patch: Partial<WineInput>) => {
    setWineDrafts((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, wine: { ...d.wine, ...patch } } : d)),
    );
  };

  const saveWine = async (i: number) => {
    const draft = wineDrafts[i];
    if (!draft.wine.title.trim()) {
      flash('Укажите название вина');
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await api.patch(`/events/${eventId}/wines/${draft.id}`, wineToPayload(draft.wine));
      } else {
        await api.post(`/events/${eventId}/wines`, {
          ...wineToPayload(draft.wine),
          orderIndex: nextOrderIndex,
        });
      }
      flash('Вино сохранено');
      refresh();
    } catch {
      flash('Не удалось сохранить вино');
    } finally {
      setSaving(false);
    }
  };

  const deleteWine = async (i: number) => {
    const draft = wineDrafts[i];
    if (!draft.id) {
      setWineDrafts((prev) => prev.filter((_, idx) => idx !== i));
      return;
    }
    if (!window.confirm('Удалить это вино и все заметки по нему?')) return;
    setSaving(true);
    try {
      await api.delete(`/events/${eventId}/wines/${draft.id}`);
      flash('Вино удалено');
      refresh();
    } catch {
      flash('Не удалось удалить вино');
    } finally {
      setSaving(false);
    }
  };

  const addWine = () =>
    setWineDrafts((prev) => [...prev, { wine: emptyWine() }]);

  const saveScales = async () => {
    setSaving(true);
    try {
      await api.put(`/events/${eventId}/scales`, { scaleSlugs: selectedSlugs });
      flash('Характеристики сохранены');
      refresh();
    } catch {
      flash('Не удалось сохранить характеристики');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (slugCategory: string) => {
    const preset = presets.find((p) => p.category === slugCategory);
    if (preset) setSelectedSlugs(preset.scales.map((s) => s.scale.slug));
  };

  const loadQr = async () => {
    try {
      const res = await api.get<{ qrCode: string; url: string }>(
        `/events/${eventId}/qrcode`,
      );
      setQr(res);
    } catch {
      flash('Не удалось сгенерировать QR');
    }
  };

  const closeEvent = async () => {
    if (!window.confirm('Завершить дегустацию? После завершения заметки будут недоступны.')) return;
    setSaving(true);
    try {
      await api.patch(`/events/${eventId}`, { isClosed: true });
      flash('Дегустация завершена');
      refresh();
    } catch {
      flash('Не удалось завершить дегустацию');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!window.confirm('Удалить дегустацию целиком? Действие необратимо.')) return;
    setSaving(true);
    try {
      await api.delete(`/events/${eventId}`);
      router.replace('/admin');
    } catch {
      flash('Не удалось удалить дегустацию');
      setSaving(false);
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
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {summary.title}
          </h1>
        </div>

        {message && (
          <div className="mb-4 bg-green-50 text-green-700 text-sm rounded-xl px-4 py-2.5">
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* Событие */}
          <section>
            <p className="font-semibold text-gray-700 mb-2">Событие</p>
            <EventForm
              event={eventForm}
              onChange={(patch) =>
                setEventForm((prev) => (prev ? { ...prev, ...patch } : prev))
              }
            />
            <button
              onClick={saveEvent}
              disabled={saving}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-wine-500 text-white rounded-xl py-3 font-medium hover:bg-wine-700 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Сохранить событие
            </button>
          </section>

          {/* PIN */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-semibold text-gray-700 mb-2">PIN-код доступа</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wine-300"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Новый PIN (пусто — снять)"
                inputMode="numeric"
                maxLength={6}
              />
              <button
                onClick={savePin}
                disabled={saving}
                className="px-4 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                Сохранить
              </button>
            </div>
          </section>

          {/* Вина */}
          <section>
            <p className="font-semibold text-gray-700 mb-2">
              Вина ({wineDrafts.length})
            </p>
            <div className="space-y-3">
              {wineDrafts.map((draft, i) => (
                <div key={draft.id ?? `new-${i}`}>
                  <WineForm
                    wine={draft.wine}
                    index={i}
                    onChange={(patch) => updateWine(i, patch)}
                    onRemove={() => deleteWine(i)}
                    removable
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveWine(i)}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-wine-500 text-white py-2 text-sm font-medium hover:bg-wine-700 transition-colors disabled:opacity-60"
                    >
                      <Check size={14} /> Сохранить вино
                    </button>
                    {draft.id && (
                      <button
                        onClick={() => deleteWine(i)}
                        disabled={saving}
                        className="px-3 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-60"
                        aria-label="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addWine}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-wine-300 text-wine-700 py-3 text-sm font-medium hover:bg-wine-50 transition-colors"
            >
              <Plus size={16} /> Добавить вино
            </button>
          </section>

          {/* Характеристики (шкалы) */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-semibold text-gray-700 mb-3">
              Характеристики для оценки
            </p>

            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-wine-300"
              defaultValue=""
              onChange={(e) => e.target.value && applyPreset(e.target.value)}
            >
              <option value="" disabled>
                Применить пресет по типу вина…
              </option>
              {presets.map((p) => (
                <option key={p.id} value={p.category}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2 mb-4">
              {scalesLibrary.map((scale) => {
                const checked = selectedSlugs.includes(scale.slug);
                return (
                  <button
                    key={scale.id}
                    onClick={() =>
                      setSelectedSlugs((prev) =>
                        checked
                          ? prev.filter((s) => s !== scale.slug)
                          : [...prev, scale.slug],
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      checked
                        ? 'bg-wine-500 text-white border-wine-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-wine-300'
                    }`}
                  >
                    {scale.labelRu}
                  </button>
                );
              })}
            </div>

            <button
              onClick={saveScales}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl py-3 font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Сохранить характеристики
            </button>
          </section>

          {/* QR */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-semibold text-gray-700 mb-3">
              QR-код входа участников
            </p>
            {qr ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.qrCode} alt="QR" className="w-48 h-48" />
                <p className="text-xs text-gray-400 break-all text-center">
                  {qr.url}
                </p>
                <button
                  onClick={() => setQr(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                >
                  <X size={12} /> Скрыть
                </button>
              </div>
            ) : (
              <button
                onClick={loadQr}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-wine-300 text-wine-700 py-3 text-sm font-medium hover:bg-wine-50 transition-colors disabled:opacity-60"
              >
                <QrCode size={16} /> Показать QR-код
              </button>
            )}
          </section>

          {/* Опасная зона */}
          <section className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 space-y-3">
            <p className="font-semibold text-red-600">Действия</p>
            {!summary.isClosed ? (
              <button
                onClick={closeEvent}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white py-3 text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                Завершить дегустацию
              </button>
            ) : (
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    await api.patch(`/events/${eventId}`, { isClosed: false });
                    flash('Дегустация открыта заново');
                    refresh();
                  } catch {
                    flash('Не удалось открыть дегустацию');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 text-white py-3 text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-60"
              >
                Открыть дегустацию заново
              </button>
            )}
            <button
              onClick={deleteEvent}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500 text-white py-3 text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              <Trash2 size={16} /> Удалить дегустацию
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
