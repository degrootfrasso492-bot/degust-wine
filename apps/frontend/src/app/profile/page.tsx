'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Image from 'next/image';
import {
  Heart,
  Wine,
  Calendar,
  LogOut,
  User,
  ChevronRight,
  Loader2,
  LayoutDashboard,
  Home,
  Search,
  X,
  Library,
  Pencil,
  Camera,
  Check,
} from 'lucide-react';
import { api, uploadAvatar } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
  TastingNoteWithWine,
  PaginatedResponse,
  VisitedEvent,
  User as UserType,
} from '@/types/api';
import WineDetailModal from '@/components/profile/WineDetailModal';

type Tab = 'liked' | 'history' | 'events';

const PHASE_BADGE: Record<string, { label: string; className: string }> = {
  UPCOMING: { label: 'Скоро', className: 'bg-amber-100 text-amber-700' },
  OPEN: { label: 'Идёт сейчас', className: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Завершена', className: 'bg-gray-100 text-gray-500' },
};

const CATEGORY_LABEL: Record<string, string> = {
  RED: 'Красное',
  WHITE: 'Белое',
  ROSE: 'Розовое',
  SPARKLING: 'Игристое',
  FORTIFIED: 'Креплёное',
  SWEET: 'Сладкое',
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, clearAuth, updateUser, isAuthenticated, isLoading: authLoading } =
    useAuthStore();
  
  // Читаем tab из URL query параметров
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlTab = searchParams?.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    urlTab && ['liked', 'history', 'events'].includes(urlTab) ? urlTab : 'liked'
  );
  const [selectedNote, setSelectedNote] = useState<TastingNoteWithWine | null>(
    null,
  );

  // Редактирование имени и аватара.
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const persistProfile = async (patch: { name?: string; avatar?: string }) => {
    setProfileError('');
    const updated = await api.patch<UserType>('/auth/me', patch);
    updateUser(updated);
    return updated;
  };

  const handleAvatarChange = async (file: File | undefined) => {
    if (!file) return;
    setUploadingAvatar(true);
    setProfileError('');
    try {
      const { url } = await uploadAvatar(file);
      await persistProfile({ avatar: url });
    } catch {
      setProfileError('Не удалось загрузить аватар');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startEditName = () => {
    setNameValue(user?.name ?? '');
    setEditingName(true);
    setProfileError('');
  };

  const saveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) return;
    setSavingName(true);
    setProfileError('');
    try {
      await persistProfile({ name: trimmed });
      setEditingName(false);
    } catch {
      setProfileError('Не удалось сохранить имя');
    } finally {
      setSavingName(false);
    }
  };

  const { data: likedWines = [], isLoading: likedLoading } = useQuery<
    TastingNoteWithWine[]
  >({
    queryKey: ['profile', 'liked'],
    queryFn: () => api.get('/notes/me/liked'),
    enabled: isAuthenticated && activeTab === 'liked',
  });

  const history = useInfiniteQuery<PaginatedResponse<TastingNoteWithWine>>({
    queryKey: ['profile', 'history'],
    queryFn: ({ pageParam = 1 }) =>
      api.get(`/notes/me/history?page=${pageParam}&limit=30`),
    getNextPageParam: (last) =>
      last.page < Math.ceil(last.total / last.limit) ? last.page + 1 : undefined,
    initialPageParam: 1,
    enabled: isAuthenticated && activeTab === 'history',
  });

  const historyNotes = history.data?.pages.flatMap((p) => p.items) ?? [];

  const { data: events = [], isLoading: eventsLoading } = useQuery<
    VisitedEvent[]
  >({
    queryKey: ['profile', 'events'],
    queryFn: () => api.get('/notes/me/events'),
    enabled: isAuthenticated && activeTab === 'events',
  });

  const handleLogout = () => {
    clearAuth();
    router.replace('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-wine-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50">
      <div className="max-w-2xl mx-auto p-4 pb-16">
        <div className="flex items-center py-3 gap-3">
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

        {/* User card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex items-center gap-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              handleAvatarChange(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-14 h-14 rounded-full overflow-hidden bg-wine-100 flex items-center justify-center flex-shrink-0 group disabled:opacity-60"
            aria-label="Изменить аватар"
          >
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name ?? ''}
                width={56}
                height={56}
                className="object-cover"
              />
            ) : (
              <User size={28} className="text-wine-500" />
            )}
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <Camera size={18} className="text-white" />
              )}
            </span>
          </button>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  autoFocus
                  maxLength={100}
                  placeholder="Ваше имя"
                  className="flex-1 min-w-0 rounded-lg border border-wine-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-wine-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                />
                <button
                  onClick={saveName}
                  disabled={savingName || !nameValue.trim()}
                  className="p-1.5 rounded-lg bg-wine-500 text-white hover:bg-wine-700 transition-colors disabled:opacity-50"
                  aria-label="Сохранить имя"
                >
                  {savingName ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                  aria-label="Отменить"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditName}
                className="group flex items-center gap-1.5 max-w-full"
                title="Изменить имя"
              >
                <p className="font-semibold text-gray-900 truncate">
                  {user?.name ?? user?.email ?? user?.phone ?? 'Дегустатор'}
                </p>
                <Pencil
                  size={13}
                  className="text-gray-300 group-hover:text-wine-500 flex-shrink-0 transition-colors"
                />
              </button>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {user?.role === 'ADMIN' ? 'Админ' : 'Участник'}
            </p>
            {profileError && (
              <p className="text-[11px] text-red-500 mt-0.5">{profileError}</p>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Выйти"
          >
            <LogOut size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Админ-панель */}
        {user?.role === 'ADMIN' && (
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 bg-wine-500 text-white rounded-2xl py-3 mb-5 text-sm font-medium hover:bg-wine-700 transition-colors shadow-sm"
          >
            <LayoutDashboard size={16} />
            Админ-панель
          </Link>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 mb-5 border border-gray-100 shadow-sm">
          {(
            [
              { id: 'liked', label: 'Избранное', icon: Heart },
              { id: 'history', label: 'Все образцы', icon: Wine },
              { id: 'events', label: 'Дегустации', icon: Calendar },
            ] as { id: Tab; label: string; icon: React.ComponentType<{ size: number; className?: string }> }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-wine-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon
                size={15}
                className={
                  activeTab === id
                    ? 'fill-white text-white'
                    : id === 'liked'
                    ? 'text-gray-400'
                    : 'text-gray-400'
                }
              />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'liked' && (
          <LikedTab
            notes={likedWines}
            loading={likedLoading}
            onSelect={setSelectedNote}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            notes={historyNotes}
            loading={history.isLoading}
            hasMore={history.hasNextPage ?? false}
            loadingMore={history.isFetchingNextPage}
            onLoadMore={() => history.fetchNextPage()}
            onSelect={setSelectedNote}
          />
        )}
        {activeTab === 'events' && (
          <EventsTab events={events} loading={eventsLoading} />
        )}
      </div>

      {selectedNote && (
        <WineDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
        />
      )}
    </div>
  );
}

// ── Liked tab ────────────────────────────────────────────────────────────────

function LikedTab({
  notes,
  loading,
  onSelect,
}: {
  notes: TastingNoteWithWine[];
  loading: boolean;
  onSelect: (note: TastingNoteWithWine) => void;
}) {
  const [query, setQuery] = useState('');

  if (loading) return <TabLoader />;
  if (notes.length === 0)
    return (
      <EmptyState
        icon={<Heart size={40} className="text-gray-300" />}
        title="Нет избранных вин"
        subtitle="Лайкайте вина во время дегустации — они появятся здесь"
      />
    );

  const filtered = filterNotes(notes, query);

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Поиск по названию, производителю, дескрипторам…"
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={40} className="text-gray-300" />}
          title="Ничего не найдено"
          subtitle="Попробуйте изменить запрос"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <WineNoteCard key={note.id} note={note} onSelect={onSelect} />
          ))}
        </div>
      )}
    </>
  );
}

// ── History tab ──────────────────────────────────────────────────────────────

function HistoryTab({
  notes,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelect,
}: {
  notes: TastingNoteWithWine[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelect: (note: TastingNoteWithWine) => void;
}) {
  const [query, setQuery] = useState('');

  if (loading) return <TabLoader />;
  if (notes.length === 0)
    return (
      <EmptyState
        icon={<Wine size={40} className="text-gray-300" />}
        title="Вы ещё не дегустировали"
        subtitle="Присоединяйтесь к мероприятию по QR-коду"
      />
    );

  const filtered = filterNotes(notes, query);

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Поиск по названию, производителю, дескрипторам…"
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={40} className="text-gray-300" />}
          title="Ничего не найдено"
          subtitle="Попробуйте изменить запрос"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <WineNoteCard key={note.id} note={note} onSelect={onSelect} />
          ))}
          {query === '' && hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-600 py-3 text-sm font-medium hover:bg-white transition-colors disabled:opacity-60"
            >
              {loadingMore ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Показать ещё'
              )}
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ── Events tab ───────────────────────────────────────────────────────────────

function EventsTab({
  events,
  loading,
}: {
  events: VisitedEvent[];
  loading: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  if (loading) return <TabLoader />;
  if (events.length === 0)
    return (
      <EmptyState
        icon={<Calendar size={40} className="text-gray-300" />}
        title="Нет посещённых дегустаций"
        subtitle="Отсканируйте QR-код с вашего стола, чтобы войти"
      />
    );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? events.filter((e) => e.title.toLowerCase().includes(q))
    : events;

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Поиск по названию дегустации…"
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={40} className="text-gray-300" />}
          title="Ничего не найдено"
          subtitle="Попробуйте изменить запрос"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => {
            const badge = PHASE_BADGE[event.phase] ?? PHASE_BADGE.CLOSED;
            return (
              <button
                key={event.id}
                onClick={() =>
                  router.push(
                    event.phase === 'CLOSED'
                      ? `/events/${event.id}/results`
                      : `/tasting/${event.id}`,
                  )
                }
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
              >
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
                    {event.wineCount > 0 && ` · ${event.wineCount} образцов`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Wine note card ────────────────────────────────────────────────────────────

function WineNoteCard({
  note,
  onSelect,
}: {
  note: TastingNoteWithWine;
  onSelect: (note: TastingNoteWithWine) => void;
}) {
  const wine = note.wine;
  const event = wine.event;

  const avgScore =
    note.scoreValues.length > 0
      ? note.scoreValues.reduce((s, v) => s + v.score, 0) / note.scoreValues.length
      : null;

  return (
    <button
      onClick={() => onSelect(note)}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Photo */}
        <div className="w-12 h-16 rounded-xl overflow-hidden bg-wine-50 flex items-center justify-center flex-shrink-0">
          {wine.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wine.photoUrl}
              alt={wine.title ?? ''}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-xl">🍷</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate text-sm">
                {wine.title ?? `Образец №${wine.orderIndex + 1}`}
              </p>
              {(wine.producer || wine.country) && (
                <p className="text-xs text-gray-400 truncate">
                  {[wine.producer, wine.country].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                {event.title}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {note.isLiked && (
                <Heart size={14} className="fill-wine-500 text-wine-500" />
              )}
              {avgScore !== null && (
                <span className="text-xs font-bold text-wine-500 bg-wine-50 px-1.5 py-0.5 rounded-full">
                  {avgScore.toFixed(1)}
                </span>
              )}
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>

          {note.comment && (
            <p className="text-xs text-gray-500 mt-2 italic line-clamp-2">
              «{note.comment}»
            </p>
          )}

          {note.descriptors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.descriptors.slice(0, 4).map((d) => (
                <span
                  key={d.descriptorId}
                  className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full"
                >
                  {d.descriptor?.labelRu ?? d.descriptorId}
                </span>
              ))}
              {note.descriptors.length > 4 && (
                <span className="text-[10px] text-gray-400">
                  +{note.descriptors.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-4">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wine-300"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Очистить"
        >
          <X size={14} className="text-gray-400" />
        </button>
      )}
    </div>
  );
}

/** Клиентская фильтрация заметок по вину и личным данным. */
function filterNotes(notes: TastingNoteWithWine[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return notes;

  return notes.filter((note) => {
    const wine = note.wine;
    const haystack = [
      wine.title,
      wine.blindLabel,
      wine.producer,
      wine.country,
      wine.region,
      wine.event.title,
      note.comment,
      ...note.descriptors.map((d) => d.descriptor?.labelRu ?? ''),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={28} className="animate-spin text-wine-400" />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <p className="font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}
