'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';

interface EventWaitingScreenProps {
  title: string;
  date: string;
  timezone: string;
  coverUrl?: string | null;
  wineCount: number;
}

function formatDate(date: string, timezone: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  const d = new Date(date);
  try {
    return d.toLocaleDateString('ru-RU', { ...options, timeZone: timezone });
  } catch (e) {
    if (e instanceof RangeError) {
      return d.toLocaleDateString('ru-RU', options);
    }
    throw e;
  }
}

export default function EventWaitingScreen({
  title,
  date,
  timezone,
  coverUrl,
  wineCount,
}: EventWaitingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wine-50 to-orange-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md overflow-hidden text-center">
        {coverUrl && (
          <img src={coverUrl} alt={title} className="w-full h-40 object-cover" />
        )}
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-wine-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={24} className="text-wine-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Дегустация ещё не началась
          </h1>
          <p className="text-sm font-medium text-wine-500 mb-4">{title}</p>
          <p className="text-sm text-gray-600 mb-2">
            Заметки можно вести только в день дегустации:{' '}
            {formatDate(date, timezone)}
          </p>
          <p className="text-sm text-gray-600 mb-4">Образцов: {wineCount}</p>
          <p className="text-xs text-gray-400 mb-6">
            Страница обновится сама, когда дегустация откроется
          </p>
          <Link
            href="/"
            className="inline-block text-sm font-medium text-wine-500 hover:underline"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
