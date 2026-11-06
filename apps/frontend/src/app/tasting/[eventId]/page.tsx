'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Home, Library } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getWineType } from '@/lib/constants';
import { useTastingStore } from '@/store/tasting-store';
import { WsetDescriptor, TastingNote, EventCard } from '@/types/api';
import WineCard from '@/components/tasting/WineCard';
import EventWaitingScreen from '@/components/tasting/EventWaitingScreen';
import { useAuthStore } from '@/store/auth-store';

export default function TastingPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const activeWineIndex = useTastingStore((s) => s.activeWineIndex);
  const setWines = useTastingStore((s) => s.setWines);
  const setActiveWineIndex = useTastingStore((s) => s.setActiveWineIndex);
  const isRevealed = useTastingStore((s) => s.isRevealed);
  const triggerReveal = useTastingStore((s) => s.triggerReveal);
  const notes = useTastingStore((s) => s.notes);
  const updateNote = useTastingStore((s) => s.updateNote);

  const { data: card } = useQuery<EventCard>({
    queryKey: ['event-card', eventId],
    queryFn: () => api.get(`/events/${eventId}`),
    // react-query v5: callback receives the query object
    refetchInterval: (query) =>
      query.state.data?.event.phase === 'UPCOMING' ? 30000 : false,
  });

  const event = card?.event;

  // Вина берём из публичной карточки: эндпоинт /wines требует авторизации,
  // а карточка из ленты должна открываться гостю без ошибок.
  const wines = card?.wines ?? [];

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: existingNotes = [] } = useQuery<TastingNote[]>({
    queryKey: ['notes-batch', eventId],
    queryFn: async () => {
      if (!wines.length || !isAuthenticated) return [];
      const results = await Promise.allSettled(
        wines.map((w) => api.get<TastingNote>(`/notes/wine/${w.id}`)),
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<TastingNote> =>
            r.status === 'fulfilled' && r.value !== null,
        )
        .map((r) => r.value);
    },
    enabled: wines.length > 0 && isAuthenticated,
  });

  const { data: wineTree = [] } = useQuery<WsetDescriptor[]>({
    queryKey: ['wset', 'WINE'],
    queryFn: () => api.get('/wset/descriptors?wineType=WINE'),
  });

  const { data: spiritTree = [] } = useQuery<WsetDescriptor[]>({
    queryKey: ['wset', 'SPIRIT'],
    queryFn: () => api.get('/wset/descriptors?wineType=SPIRIT'),
  });

  useEffect(() => {
    if (wines.length > 0) {
      setWines(wines);
    }
  }, [wines, setWines]);

  // Гидрируем стор сохранёнными заметками: счётчик «оценено» и индикаторы
  // на точках должны отражать ранее сохранённые выборы при возврате.
  useEffect(() => {
    for (const n of existingNotes) {
      updateNote(n.wineId, n);
    }
  }, [existingNotes, updateNote]);

  useEffect(() => {
    if (event?.phase === 'CLOSED') {
      router.replace(`/events/${eventId}/results`);
    }
  }, [event, eventId, router]);

  useEffect(() => {
    if (!eventId) return;

    const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/events/${eventId}/stream`;
    const sse = new EventSource(sseUrl);

    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.message === 'EVENT_REVEAL') {
          triggerReveal();
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => sse.close();
  }, [eventId, triggerReveal]);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wine-50 to-orange-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-wine-100 animate-pulse mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Загрузка дегустации...</p>
        </div>
      </div>
    );
  }

  if (event.phase === 'CLOSED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wine-50 to-orange-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-wine-100 animate-pulse mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Загрузка дегустации...</p>
        </div>
      </div>
    );
  }

  if (event.phase === 'UPCOMING') {
    return (
      <EventWaitingScreen
        title={event.title}
        date={event.date}
        timezone={event.timezone}
        coverUrl={event.coverUrl}
        wineCount={event.wineCount}
      />
    );
  }

  if (wines.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wine-50 to-orange-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-wine-100 animate-pulse mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Загрузка дегустации...</p>
        </div>
      </div>
    );
  }

  const currentWine = wines[activeWineIndex];
  const descriptorTree =
    getWineType(currentWine.category) === 'SPIRIT' ? spiritTree : wineTree;
  const canPrev = activeWineIndex > 0;
  const canNext = activeWineIndex < wines.length - 1;
  const totalNoted = wines.filter((w) => {
    const n = notes[w.id];
    return n && (n.scoreValues?.length || n.descriptors?.length || n.isLiked);
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50 pb-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center pt-4 gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <Home size={18} />
            Главная
          </Link>
          <Link
            href="/catalog"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <Library size={18} />
            Каталог
          </Link>
        </div>

        <div className="text-center pt-4 pb-4">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {event.title}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(event.date).toLocaleDateString('ru-RU')} ·{' '}
            {totalNoted}/{wines.length} оценено
          </p>
        </div>

        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setActiveWineIndex(activeWineIndex - 1)}
            disabled={!canPrev}
            className="p-2 rounded-full hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Предыдущий"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>

          <div className="flex gap-1.5">
            {wines.map((w, i) => {
              const hasNote = !!(
                notes[w.id] &&
                ((notes[w.id].scoreValues?.length ?? 0) > 0 ||
                  (notes[w.id].descriptors?.length ?? 0) > 0 ||
                  notes[w.id].isLiked)
              );
              const isActive = i === activeWineIndex;

              return (
                <button
                  key={w.id}
                  onClick={() => setActiveWineIndex(i)}
                  aria-label={`Образец ${i + 1}`}
                  className={`relative flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'w-10 h-10 bg-wine-500 text-white shadow-md scale-110'
                      : 'w-9 h-9 bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {i + 1}
                  {hasNote && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                      <Check size={7} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveWineIndex(activeWineIndex + 1)}
            disabled={!canNext}
            className="p-2 rounded-full hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Следующий"
          >
            <ChevronRight size={24} className="text-gray-600" />
          </button>
        </div>

        <WineCard
          key={currentWine.id}
          wine={currentWine}
          note={
            notes[currentWine.id] ??
            existingNotes.find((n) => n.wineId === currentWine.id)
          }
          descriptorTree={descriptorTree}
          isRevealed={isRevealed}
          scales={event.scales ?? []}
          readOnly={!isAuthenticated}
        />

        {canNext && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Следующий: Образец {activeWineIndex + 2}
          </p>
        )}
        {!canNext && totalNoted === wines.length && (
          <p className="text-center text-xs text-green-600 font-medium mt-4">
            Все образцы оценены ✓
          </p>
        )}
      </div>
    </div>
  );
}
