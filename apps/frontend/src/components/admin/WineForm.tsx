'use client';

import { Trash2 } from 'lucide-react';
import { WINE_CATEGORIES, WINE_CATEGORY_LABEL } from '@/lib/constants';
import ImageUpload from './ImageUpload';
import type { WineInput } from './admin-form-types';

interface WineFormProps {
  wine: WineInput;
  index: number;
  onChange: (patch: Partial<WineInput>) => void;
  onRemove: () => void;
  removable: boolean;
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wine-300';

export default function WineForm({
  wine,
  index,
  onChange,
  onRemove,
  removable,
}: WineFormProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm text-gray-700">
          Образец №{index + 1}
        </p>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Удалить образец"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-500">Название</label>
          <input
            className={inputClass}
            value={wine.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Например: Шардоне, Калифорния"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Слепая метка</label>
          <input
            className={inputClass}
            value={wine.blindLabel ?? ''}
            onChange={(e) => onChange({ blindLabel: e.target.value })}
            placeholder="Образец №1"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Категория</label>
          <select
            className={inputClass}
            value={wine.category}
            onChange={(e) =>
              onChange({ category: e.target.value as WineInput['category'] })
            }
          >
            {WINE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {WINE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500">Крепость, %</label>
          <input
            className={inputClass}
            type="number"
            step="0.1"
            value={wine.abv ?? ''}
            onChange={(e) => onChange({ abv: e.target.value })}
            placeholder="13.5"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Состав</label>
          <input
            className={inputClass}
            value={wine.composition ?? ''}
            onChange={(e) => onChange({ composition: e.target.value })}
            placeholder="100% Шардоне"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Производитель</label>
          <input
            className={inputClass}
            value={wine.producer ?? ''}
            onChange={(e) => onChange({ producer: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Страна</label>
          <input
            className={inputClass}
            value={wine.country ?? ''}
            onChange={(e) => onChange({ country: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Регион</label>
          <input
            className={inputClass}
            value={wine.region ?? ''}
            onChange={(e) => onChange({ region: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Выдержка</label>
          <input
            className={inputClass}
            value={wine.aging ?? ''}
            onChange={(e) => onChange({ aging: e.target.value })}
            placeholder="6 мес. в дубе"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Методы производства</label>
          <input
            className={inputClass}
            value={wine.methods ?? ''}
            onChange={(e) => onChange({ methods: e.target.value })}
            placeholder="Ферментация в стали"
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs text-gray-500">Описание</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={wine.description ?? ''}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs text-gray-500">Фото</label>
          <ImageUpload
            value={wine.photoUrl}
            onChange={(url) => onChange({ photoUrl: url })}
            aspect="bottle"
            label="Фото вина"
          />
        </div>
      </div>
    </div>
  );
}
