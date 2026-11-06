'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { WineCategory, WineType } from '@/types/api';
import { WINE_TYPE_CATEGORIES, SPIRIT_TYPE_CATEGORIES } from '@/lib/constants';

export interface CatalogFilterState {
  type?: WineType;
  categories: WineCategory[];
  country: string;
}

interface CatalogFilterModalProps {
  countries: string[];
  initial: CatalogFilterState;
  onApply: (f: CatalogFilterState) => void;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<WineCategory, string> = {
  RED: 'Красное вино',
  WHITE: 'Белое вино',
  ROSE: 'Розовое вино',
  SPARKLING: 'Игристое вино',
  FORTIFIED: 'Креплёное вино',
  SWEET: 'Сладкое вино',
  VODKA: 'Водка',
  DISTILLATE: 'Дистиллят',
  COGNAC: 'Коньяк',
  WHISKY: 'Виски',
  TEQUILA: 'Текилла',
  GIN: 'Джин',
  LIQUEUR: 'Ликёр',
};

export default function CatalogFilterModal({
  countries,
  initial,
  onApply,
  onClose,
}: CatalogFilterModalProps) {
  const [type, setType] = useState<WineType | undefined>(initial.type);
  const [categories, setCategories] = useState<WineCategory[]>(
    initial.categories,
  );
  const [country, setCountry] = useState(initial.country);

  const toggleType = (t: WineType | undefined) => {
    setType(t);
    if (t) {
      const allowed =
        t === 'WINE' ? WINE_TYPE_CATEGORIES : SPIRIT_TYPE_CATEGORIES;
      setCategories((prev) => prev.filter((c) => allowed.includes(c)));
    }
  };

  const toggleCategory = (c: WineCategory) => {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const showWine = type !== 'SPIRIT';
  const showSpirit = type !== 'WINE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Фильтры</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Закрыть"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Тип */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Тип
            </p>
            <div className="flex gap-2">
              {(
                [
                  { value: undefined, label: 'Все' },
                  { value: 'WINE' as WineType, label: 'Вино' },
                  { value: 'SPIRIT' as WineType, label: 'Крепкий алкоголь' },
                ]
              ).map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => toggleType(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    type === opt.value
                      ? 'bg-wine-500 text-white border-wine-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Категория */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Категория
            </p>

            {showWine && (
              <CategoryGroup
                title="Вино"
                items={WINE_TYPE_CATEGORIES}
                selected={categories}
                onToggle={toggleCategory}
              />
            )}
            {showSpirit && (
              <CategoryGroup
                title="Крепкий алкоголь"
                items={SPIRIT_TYPE_CATEGORIES}
                selected={categories}
                onToggle={toggleCategory}
              />
            )}
          </div>

          {/* Страна */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Страна
            </p>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-300"
            >
              <option value="">Все страны</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white flex gap-2 p-4 border-t border-gray-100">
          <button
            onClick={() => {
              setType(undefined);
              setCategories([]);
              setCountry('');
            }}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Сбросить
          </button>
          <button
            onClick={() => onApply({ type, categories, country })}
            className="flex-1 py-2.5 rounded-xl bg-wine-500 text-white text-sm font-medium hover:bg-wine-700 transition-colors"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: WineCategory[];
  selected: WineCategory[];
  onToggle: (c: WineCategory) => void;
}) {
  return (
    <div className="mb-3">
      <p className="text-[11px] text-gray-400 font-medium mb-1.5">{title}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((c) => {
          const active = selected.includes(c);
          return (
            <button
              key={c}
              onClick={() => onToggle(c)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs text-left border transition-colors ${
                active
                  ? 'bg-wine-50 text-wine-700 border-wine-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                  active
                    ? 'bg-wine-500 border-wine-500'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {active && <Check size={12} className="text-white" />}
              </span>
              {CATEGORY_LABEL[c]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
