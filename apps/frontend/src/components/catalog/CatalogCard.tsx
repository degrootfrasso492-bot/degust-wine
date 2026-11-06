'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { CatalogWine } from '@/types/api';
import ScoreBar from '@/components/results/ScoreBar';
import { WINE_CATEGORY_LABEL } from '@/lib/constants';

interface CatalogCardProps {
  wine: CatalogWine;
}

/** Среднее значение: целое — как есть, дробное — один знак после запятой. */
function formatAverage(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Склонение для «по N дегустациям» (дательный падеж после предлога «по»). */
function pluralTastings(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 === 1 && mod100 !== 11 ? 'дегустации' : 'дегустациям';
}

export default function CatalogCard({ wine }: CatalogCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-4">
        {/* Photo or placeholder */}
        <div className="flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-wine-100 to-orange-50 flex items-center justify-center">
          {wine.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wine.photoUrl}
              alt={wine.title || ''}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-2xl">🍷</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-block text-[10px] uppercase tracking-wide bg-wine-50 text-wine-700 px-1.5 py-0.5 rounded-full font-semibold">
                {WINE_CATEGORY_LABEL[wine.category] || wine.category}
              </span>
              <h3 className="font-bold text-gray-900 text-base leading-tight mt-0.5">
                {wine.title}
              </h3>
              {(wine.producer || wine.country) && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {[wine.producer, wine.country, wine.region]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 text-wine-500">
                <Heart size={14} className="fill-wine-500" />
                <span className="text-sm font-bold">
                  {formatAverage(wine.averageLikeCount)}
                </span>
              </div>
              <span className="text-[11px] text-gray-400">
                среднее по {wine.appearanceCount}{' '}
                {pluralTastings(wine.appearanceCount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Разворачивающийся список дегустаций (если вино встречалось не раз) */}
      {wine.appearanceCount > 1 && (
        <div className="border-t border-gray-50">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" />
              {wine.appearanceCount} дегустации
            </span>
            {expanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>

          {expanded && (
            <div className="px-4 pb-3 space-y-1">
              {wine.appearances.map((a) => (
                <Link
                  key={a.eventId}
                  href={`/events/${a.eventId}/results`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-wine-50 transition-colors"
                >
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0">
                    {new Date(a.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">
                    {a.title}
                  </span>
                  <span className="flex items-center gap-1 text-wine-500 text-xs flex-shrink-0">
                    <Heart size={11} className="fill-wine-500" />
                    {a.likeCount}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Описание и характеристики вина */}
      {(wine.description ||
        wine.abv != null ||
        wine.composition ||
        wine.aging ||
        wine.methods) && (
        <div className="px-4 pb-3">
          {wine.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {wine.description}
            </p>
          )}
          {(wine.abv != null ||
            wine.composition ||
            wine.aging ||
            wine.methods) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {wine.abv != null && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {wine.abv}% алк.
                </span>
              )}
              {wine.composition && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {wine.composition}
                </span>
              )}
              {wine.aging && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {wine.aging}
                </span>
              )}
              {wine.methods && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {wine.methods}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Score bars */}
      {wine.attributeAverages.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {wine.attributeAverages.map((attr) => (
            <ScoreBar
              key={attr.attributeName}
              label={attr.labelRu}
              value={attr.average}
              max={attr.maxVal}
            />
          ))}
        </div>
      )}

      {/* Descriptors */}
      {(wine.topAromaDescriptors.length > 0 ||
        wine.topFlavourDescriptors.length > 0) && (
        <div className="border-t border-gray-50 px-4 py-3">
          {wine.topAromaDescriptors.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
                Ароматы
              </p>
              <div className="flex flex-wrap gap-1">
                {wine.topAromaDescriptors.slice(0, 6).map((d) => (
                  <span
                    key={d.descriptorId}
                    className="text-[11px] bg-wine-50 text-wine-700 px-2 py-0.5 rounded-full"
                  >
                    {d.labelRu}
                    {d.count > 1 && (
                      <span className="ml-0.5 text-wine-400">×{d.count}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          {wine.topFlavourDescriptors.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
                Вкусы
              </p>
              <div className="flex flex-wrap gap-1">
                {wine.topFlavourDescriptors.slice(0, 6).map((d) => (
                  <span
                    key={d.descriptorId}
                    className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full"
                  >
                    {d.labelRu}
                    {d.count > 1 && (
                      <span className="ml-0.5 text-orange-400">×{d.count}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
