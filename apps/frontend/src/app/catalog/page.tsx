'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
  Home,
  Wine,
  X,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import {
  CatalogResponse,
  WineCategory,
  WineType,
  CatalogSort,
} from '@/types/api';
import CatalogCard from '@/components/catalog/CatalogCard';
import CatalogFilterModal, {
  CatalogFilterState,
} from '@/components/catalog/CatalogFilterModal';

export default function CatalogPage() {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CatalogSort>('likes');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const [type, setType] = useState<WineType | undefined>(undefined);
  const [categories, setCategories] = useState<WineCategory[]>([]);
  const [country, setCountry] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Дебаунс поиска.
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput.trim()), 300);
    return () => clearTimeout(t);
  }, [queryInput]);

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('sort', sort);
  params.set('order', order);
  if (type) params.set('type', type);
  if (categories.length) params.set('categories', categories.join(','));
  if (country) params.set('country', country);
  // Backend paginates; каталог небольшой, грузим максимальную страницу,
  // чтобы не менять привычное поведение списка.
  params.set('page', '1');
  params.set('limit', '100');

  const { data, isLoading, isError } = useQuery<CatalogResponse>({
    queryKey: ['catalog', params.toString()],
    queryFn: () => api.get(`/catalog?${params.toString()}`),
  });

  const activeFilterCount =
    (type ? 1 : 0) + categories.length + (country ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50">
      <div className="max-w-2xl mx-auto p-4 pb-16">
        {/* Header */}
        <div className="flex items-center py-4 gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <Home size={18} />
            Главная
          </Link>
          <h1 className="font-bold text-gray-900 text-lg">Каталог</h1>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Поиск по названию, производителю, стране…"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wine-300"
          />
          {queryInput && (
            <button
              onClick={() => setQueryInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Очистить"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Sort + filter */}
        <div className="flex items-center gap-2 mb-4">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CatalogSort)}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-wine-300"
          >
            <option value="likes">По лайкам</option>
            <option value="newest">По новизне</option>
          </select>

          <button
            onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label={
              order === 'desc' ? 'По убыванию' : 'По возрастанию'
            }
            title={order === 'desc' ? 'По убыванию' : 'По возрастанию'}
          >
            {order === 'desc' ? (
              <ArrowDown size={18} />
            ) : (
              <ArrowUp size={18} />
            )}
          </button>

          <button
            onClick={() => setFilterOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal size={16} />
            Фильтр
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-wine-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {type && (
              <Chip
                label={type === 'WINE' ? 'Вино' : 'Крепкий алкоголь'}
                onClear={() => setType(undefined)}
              />
            )}
            {categories.map((c) => (
              <Chip
                key={c}
                label={CATEGORY_SHORT[c] ?? c}
                onClear={() =>
                  setCategories((prev) => prev.filter((x) => x !== c))
                }
              />
            ))}
            {country && (
              <Chip label={country} onClear={() => setCountry('')} />
            )}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <p className="text-gray-400 text-sm text-center py-10">
            Не удалось загрузить каталог
          </p>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-4">
              <Wine size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">Ничего не найдено</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Попробуйте изменить запрос или сбросить фильтры
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((wine) => (
              <CatalogCard key={wine.key} wine={wine} />
            ))}
          </div>
        )}
      </div>

      {filterOpen && (
        <CatalogFilterModal
          countries={data?.countries ?? []}
          initial={{ type, categories, country }}
          onApply={(f) => {
            setType(f.type);
            setCategories(f.categories);
            setCountry(f.country);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full hover:bg-gray-50 transition-colors"
    >
      {label}
      <X size={12} className="text-gray-400" />
    </button>
  );
}

const CATEGORY_SHORT: Record<WineCategory, string> = {
  RED: 'Красное',
  WHITE: 'Белое',
  ROSE: 'Розовое',
  SPARKLING: 'Игристое',
  FORTIFIED: 'Креплёное',
  SWEET: 'Сладкое',
  VODKA: 'Водка',
  DISTILLATE: 'Дистиллят',
  COGNAC: 'Коньяк',
  WHISKY: 'Виски',
  TEQUILA: 'Текилла',
  GIN: 'Джин',
  LIQUEUR: 'Ликёр',
};
