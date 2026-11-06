'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Heart } from 'lucide-react';
import { api } from '@/lib/api-client';
import {
  TastingNoteWithWine,
  EventAnalytics,
  WineAnalytics,
} from '@/types/api';
import ScoreBar from '@/components/results/ScoreBar';

interface WineDetailModalProps {
  note: TastingNoteWithWine;
  onClose: () => void;
}

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

export default function WineDetailModal({ note, onClose }: WineDetailModalProps) {
  const wine = note.wine;

  // Блокируем прокрутку фона, пока модалка открыта.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Закрытие по Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Усреднённые оценки и вкусоароматика видны только по завершённым
  // дегустациям (иначе бэкенд вернёт null).
  const { data: analytics } = useQuery<EventAnalytics | null>({
    queryKey: ['wine-analytics', wine.eventId],
    queryFn: () => api.get(`/analytics/events/${wine.eventId}`),
  });

  const wineAnalytics: WineAnalytics | undefined = analytics?.wines.find(
    (w) => w.wineId === wine.id,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      {/* Карточка */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Закрыть */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
          aria-label="Закрыть"
        >
          <X size={20} className="text-gray-500" />
        </button>

        {/* Шапка: фото + название + категория + производитель */}
        <div className="flex items-start gap-4 p-4 pb-3 pr-14">
          <div className="flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-wine-100 to-orange-50 flex items-center justify-center">
            {wine.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={wine.photoUrl}
                alt={wine.title ?? ''}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-3xl">🍷</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] uppercase tracking-wide bg-wine-50 text-wine-700 px-1.5 py-0.5 rounded-full font-semibold">
                {CATEGORY_LABEL[wine.category] || wine.category}
              </span>
            </div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">
              {wine.title || wine.blindLabel || `Образец №${wine.orderIndex + 1}`}
            </h2>
            {(wine.producer || wine.country) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[wine.producer, wine.country, wine.region]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1 truncate">
              {wine.event.title}
            </p>
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

        {/* Усреднённые оценки (зал) */}
        {wineAnalytics && wineAnalytics.attributeAverages.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">
              Усреднённые оценки
            </p>
            <div className="space-y-2">
              {wineAnalytics.attributeAverages.map((attr) => (
                <ScoreBar
                  key={attr.attributeName}
                  label={attr.labelRu}
                  value={attr.average}
                  max={attr.maxVal}
                />
              ))}
            </div>
          </div>
        )}

        {/* Вкусоароматика (зал) */}
        {wineAnalytics &&
          (wineAnalytics.topAromaDescriptors.length > 0 ||
            wineAnalytics.topFlavourDescriptors.length > 0) && (
            <div className="px-4 pb-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">
                Вкусоароматика
              </p>
              {wineAnalytics.topAromaDescriptors.length > 0 && (
                <div className="mb-2">
                  <p className="text-[11px] text-gray-500 font-medium mb-1">
                    Ароматы
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {wineAnalytics.topAromaDescriptors.slice(0, 8).map((d) => (
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
              {wineAnalytics.topFlavourDescriptors.length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-500 font-medium mb-1">
                    Вкусы
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {wineAnalytics.topFlavourDescriptors.slice(0, 8).map((d) => (
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

        {/* Личные заметки */}
        {(note.isLiked ||
          note.comment ||
          note.scoreValues.length > 0 ||
          note.descriptors.length > 0) && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Мои заметки
              </p>
              {note.isLiked && (
                <Heart size={12} className="fill-wine-500 text-wine-500" />
              )}
            </div>

            {note.comment && (
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                «{note.comment}»
              </p>
            )}

            {note.scoreValues.length > 0 && (
              <div className="space-y-2 mb-3">
                {note.scoreValues.map((sv) => {
                  const scale = wineAnalytics?.attributeAverages.find(
                    (a) => a.attributeName === sv.attributeName,
                  );
                  return (
                    <ScoreBar
                      key={sv.attributeName}
                      label={scale?.labelRu ?? sv.attributeName}
                      value={sv.score}
                      max={scale?.maxVal ?? 5}
                    />
                  );
                })}
              </div>
            )}

            {note.descriptors.length > 0 && (
              <div className="space-y-2">
                {note.descriptors.filter((d) => d.type === 'AROMA').length >
                  0 && (
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium mb-1">
                      Ароматы
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {note.descriptors
                        .filter((d) => d.type === 'AROMA')
                        .map((d) => (
                          <span
                            key={`aroma-${d.descriptorId}`}
                            className="text-[11px] bg-wine-50 text-wine-700 px-2 py-0.5 rounded-full"
                          >
                            {d.descriptor?.labelRu ?? d.descriptorId}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                {note.descriptors.filter((d) => d.type === 'FLAVOUR').length >
                  0 && (
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium mb-1">
                      Вкусы
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {note.descriptors
                        .filter((d) => d.type === 'FLAVOUR')
                        .map((d) => (
                          <span
                            key={`flavour-${d.descriptorId}`}
                            className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full"
                          >
                            {d.descriptor?.labelRu ?? d.descriptorId}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
