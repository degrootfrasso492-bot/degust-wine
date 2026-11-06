'use client';

import { TIMEZONES } from '@/lib/constants';
import ImageUpload from './ImageUpload';
import type { EventInput } from './admin-form-types';

interface EventFormProps {
  event: EventInput;
  onChange: (patch: Partial<EventInput>) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wine-300';

export default function EventForm({ event, onChange }: EventFormProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div>
        <label className="text-xs text-gray-500">Название дегустации</label>
        <input
          className={inputClass}
          value={event.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Слепая дегустация белых вин"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">Описание</label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={2}
          value={event.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Дата дегустации</label>
          <input
            className={inputClass}
            type="date"
            value={event.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Часовой пояс</label>
          <select
            className={inputClass}
            value={event.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">
          PIN-код доступа (необязательно)
        </label>
        <input
          className={inputClass}
          value={event.accessPin ?? ''}
          onChange={(e) => onChange({ accessPin: e.target.value })}
          placeholder="1234"
          inputMode="numeric"
          maxLength={6}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={event.isBlind}
          onChange={(e) => onChange({ isBlind: e.target.checked })}
          className="accent-wine-500"
        />
        Слепая дегустация (вина раскрываются после завершения)
      </label>

      <div>
        <label className="text-xs text-gray-500">Обложка</label>
        <ImageUpload
          value={event.coverUrl}
          onChange={(url) => onChange({ coverUrl: url })}
          label="Обложка"
        />
      </div>
    </div>
  );
}
