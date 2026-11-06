'use client';

import Link from 'next/link';
import { Wine, Heart, ChevronRight } from 'lucide-react';
import { FeedEvent, EventPhase } from '@/types/api';

const PHASE_BADGE: Record<EventPhase, { label: string; className: string }> = {
  UPCOMING: { label: 'Скоро', className: 'bg-amber-100 text-amber-700' },
  OPEN: { label: 'Идёт сейчас', className: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Итоги', className: 'bg-gray-100 text-gray-500' },
};

function formatDate(date: string, timezone: string): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  try {
    return d.toLocaleDateString('ru-RU', { ...options, timeZone: timezone });
  } catch (e) {
    if (e instanceof RangeError) {
      return d.toLocaleDateString('ru-RU', options);
    }
    throw e;
  }
}

export function FeedEventCard({ event }: { event: FeedEvent }) {
  const href =
    event.phase === 'CLOSED'
      ? `/events/${event.id}/results`
      : `/tasting/${event.id}`;
  const badge = PHASE_BADGE[event.phase];
  const showTop = event.phase === 'CLOSED' && event.topWines.length > 0;

  return (
    <Link
      href={href}
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        {event.coverUrl ? (
          <img
            src={event.coverUrl}
            alt={event.title}
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-wine-100 to-orange-50 flex items-center justify-center flex-shrink-0">
            <Wine size={22} className="text-wine-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{event.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(event.date, event.timezone)}
            {event.wineCount > 0 && ` · ${event.wineCount} образцов`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
          <ChevronRight size={16} className="text-gray-300" />
        </div>
      </div>

      {showTop && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            Топ вин
          </p>
          {event.topWines.slice(0, 3).map((wine) => (
            <div key={wine.wineId} className="flex items-center gap-2">
              {wine.photoUrl ? (
                <img
                  src={wine.photoUrl}
                  alt={wine.title}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wine-100 to-orange-50 flex items-center justify-center flex-shrink-0">
                  <Wine size={14} className="text-wine-400" />
                </div>
              )}
              <p className="flex-1 min-w-0 text-xs text-gray-700 truncate">
                {wine.title}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                <Heart size={12} className="text-wine-500" />
                <span>{wine.likeCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
