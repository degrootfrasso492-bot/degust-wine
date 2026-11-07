'use client';

import { Heart, Users } from 'lucide-react';
import { WineAnalytics } from '@/types/api';
import ScoreBar from './ScoreBar';

interface WineResultCardProps {
  wine: WineAnalytics;
  rank: number;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const CATEGORY_LABEL: Record<string, string> = {
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

export default function WineResultCard({ wine, rank }: WineResultCardProps) {
  const medal = MEDAL[rank];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Photo or placeholder */}
        <div className="flex-shrink-0 w-14 h-18 sm:w-16 sm:h-20 rounded-xl overflow-hidden bg-gradient-to-br from-wine-100 to-orange-50 flex items-center justify-center">
          {wine.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wine.photoUrl}
              alt={wine.title || ''}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-2xl">🍷</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                {medal ? (
                  <span className="text-lg leading-none flex-shrink-0">{medal}</span>
                ) : (
                  <span className="text-sm font-bold text-gray-400 flex-shrink-0">
                    #{rank}
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-wide bg-wine-50 text-wine-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {CATEGORY_LABEL[wine.category] || wine.category}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">
                {wine.title || wine.blindLabel || `Образец №${wine.orderIndex + 1}`}
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
            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 text-wine-500">
                <Heart size={14} className="fill-wine-500" />
                <span className="text-sm font-bold">{wine.likeCount}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <Users size={12} />
                <span className="text-xs">{wine.noteCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
