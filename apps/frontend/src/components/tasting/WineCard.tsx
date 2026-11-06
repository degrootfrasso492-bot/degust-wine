'use client';

import { useState, useEffect } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import {
  Wine,
  WsetDescriptor,
  TastingNote,
  AttributeScale,
  DescriptorType,
} from '@/types/api';
import AttributeSlider from './AttributeSlider';
import WheelDrawer from '../wset-wheel/WheelDrawer';
import { useDebouncedSave } from '@/hooks/use-debounced-save';
import { useTastingStore } from '@/store/tasting-store';

interface WineCardProps {
  wine: Wine;
  note?: Partial<TastingNote>;
  /** Единое дерево дескрипторов (вино или крепкое — по типу образца). */
  descriptorTree: WsetDescriptor[];
  isRevealed: boolean;
  /** Шкалы события (одинаковые для всех вин). */
  scales: AttributeScale[];
  /** Гость смотрит вино, но не может вносить заметки и лайки. */
  readOnly?: boolean;
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

export default function WineCard({
  wine,
  note,
  descriptorTree,
  isRevealed,
  scales,
  readOnly = false,
}: WineCardProps) {
  const [wheelOpen, setWheelOpen] = useState(false);
  const [flipped, setFlipped] = useState(isRevealed);
  const [showPulse, setShowPulse] = useState(false);

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(
      (note?.scoreValues || []).map((s) => [s.attributeName, s.score]),
    ),
  );
  const [aromaDescriptorIds, setAromaDescriptorIds] = useState<string[]>(
    (note?.descriptors || [])
      .filter((d) => d.type === 'AROMA')
      .map((d) => d.descriptorId),
  );
  const [flavourDescriptorIds, setFlavourDescriptorIds] = useState<string[]>(
    (note?.descriptors || [])
      .filter((d) => d.type === 'FLAVOUR')
      .map((d) => d.descriptorId),
  );
  const [isLiked, setIsLiked] = useState(note?.isLiked ?? false);
  const [comment, setComment] = useState(note?.comment ?? '');

  const { save } = useDebouncedSave(500);
  const syncStatus = useTastingStore((s) => s.syncStatus[wine.id] || 'idle');
  const updateNote = useTastingStore((s) => s.updateNote);

  // Сохранённые заметки подгружаются асинхронно (после возврата на уже
  // открытую дегустацию). Синхронизируем локальное состояние, когда note
  // приходит позже первичного рендера.
  useEffect(() => {
    setScores(
      Object.fromEntries(
        (note?.scoreValues || []).map((s) => [s.attributeName, s.score]),
      ),
    );
    setAromaDescriptorIds(
      (note?.descriptors || [])
        .filter((d) => d.type === 'AROMA')
        .map((d) => d.descriptorId),
    );
    setFlavourDescriptorIds(
      (note?.descriptors || [])
        .filter((d) => d.type === 'FLAVOUR')
        .map((d) => d.descriptorId),
    );
    setIsLiked(note?.isLiked ?? false);
    setComment(note?.comment ?? '');
  }, [note]);

  useEffect(() => {
    if (isRevealed && !flipped) {
      const t = setTimeout(() => {
        setFlipped(true);
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 2200);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isRevealed, flipped]);

  const triggerSave = (overrides: Partial<{
    scores: Record<string, number>;
    aromaDescriptorIds: string[];
    flavourDescriptorIds: string[];
    isLiked: boolean;
    comment: string;
  }> = {}) => {
    const nextScores = overrides.scores ?? scores;
    const nextAroma = overrides.aromaDescriptorIds ?? aromaDescriptorIds;
    const nextFlavour = overrides.flavourDescriptorIds ?? flavourDescriptorIds;
    const nextLiked = overrides.isLiked ?? isLiked;
    const nextComment = overrides.comment ?? comment;

    const descriptors = [
      ...nextAroma.map((descriptorId) => ({
        descriptorId,
        type: 'AROMA' as const,
      })),
      ...nextFlavour.map((descriptorId) => ({
        descriptorId,
        type: 'FLAVOUR' as const,
      })),
    ];

    // Держим стор в актуальном состоянии, чтобы счётчик «оценено» и
    // индикаторы на точках обновлялись сразу, без перезагрузки.
    updateNote(wine.id, {
      isLiked: nextLiked,
      comment: nextComment,
      scoreValues: Object.entries(nextScores).map(([attributeName, score]) => ({
        attributeName,
        score,
      })),
      descriptors,
    });

    save(wine.id, {
      wineId: wine.id,
      isLiked: nextLiked,
      comment: nextComment,
      scores: Object.entries(nextScores).map(([attributeName, score]) => ({
        attributeName,
        score,
      })),
      descriptors,
    });
  };

  const handleScoreChange = (name: string, value: number) => {
    const next = { ...scores, [name]: value };
    setScores(next);
    triggerSave({ scores: next });
  };

  const handleToggleDescriptor = (
    descriptor: WsetDescriptor,
    type: DescriptorType,
  ) => {
    const isAroma = type === 'AROMA';
    const current = isAroma ? aromaDescriptorIds : flavourDescriptorIds;
    const next = current.includes(descriptor.id)
      ? current.filter((id) => id !== descriptor.id)
      : [...current, descriptor.id];

    if (isAroma) {
      setAromaDescriptorIds(next);
      triggerSave({ aromaDescriptorIds: next });
    } else {
      setFlavourDescriptorIds(next);
      triggerSave({ flavourDescriptorIds: next });
    }
  };

  const handleLikeToggle = () => {
    const next = !isLiked;
    setIsLiked(next);
    triggerSave({ isLiked: next });
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    triggerSave({ comment: value });
  };

  const form = (
    <CardForm
      wine={wine}
      scales={scales}
      scores={scores}
      aromaDescriptorIds={aromaDescriptorIds}
      flavourDescriptorIds={flavourDescriptorIds}
      comment={comment}
      syncStatus={syncStatus}
      onScoreChange={handleScoreChange}
      onToggleDescriptor={handleToggleDescriptor}
      onCommentChange={handleCommentChange}
      onOpenWheel={() => setWheelOpen(true)}
      descriptorTree={descriptorTree}
      wheelOpen={wheelOpen}
      onCloseWheel={() => setWheelOpen(false)}
      readOnly={readOnly}
    />
  );

  // Не слепая дегустация (или админ, или уже раскрытая): показываем карточку
  // вина сразу — фото, название, описание, крепость, выдержка и т.д.
  if (wine.title) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <WineInfoHeader
          wine={wine}
          isLiked={isLiked}
          onLikeToggle={handleLikeToggle}
          readOnly={readOnly}
        />
        <WineDetails wine={wine} />
        {form}
      </div>
    );
  }

  // Слепая дегустация: лицевая сторона — только метка, оборот — раскрытие.
  return (
    <div className={`flip-container ${showPulse ? 'reveal-pulse' : ''}`}>
      <div className={`flip-card rounded-2xl ${flipped ? 'is-flipped' : ''}`}>
        <div className="flip-card-front rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <BlindFront
            wine={wine}
            isLiked={isLiked}
            onLikeToggle={handleLikeToggle}
            readOnly={readOnly}
          />
          {form}
        </div>

        <div className="flip-card-back rounded-2xl border border-wine-300 bg-white shadow-md p-5">
          <WineInfoHeader
            wine={wine}
            isLiked={isLiked}
            onLikeToggle={handleLikeToggle}
            readOnly={readOnly}
            revealed
          />
          <WineDetails wine={wine} />
          {form}
        </div>
      </div>
    </div>
  );
}

/** Шапка вина: фото, название, категория, производитель. */
function WineInfoHeader({
  wine,
  isLiked,
  onLikeToggle,
  readOnly,
  revealed = false,
}: {
  wine: Wine;
  isLiked: boolean;
  onLikeToggle: () => void;
  readOnly?: boolean;
  revealed?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      {wine.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={wine.photoUrl}
          alt={wine.title ?? ''}
          className="w-16 h-20 rounded-xl object-cover flex-shrink-0 bg-wine-50"
        />
      ) : (
        <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-wine-100 to-orange-50 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🍷</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {revealed && (
            <span className="text-xs bg-wine-500 text-white px-2 py-0.5 rounded-full font-semibold">
              Раскрыто
            </span>
          )}
          <span className="text-xs text-gray-400">
            {CATEGORY_LABEL[wine.category] ?? wine.category}
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 leading-tight">
          {wine.title || `Образец №${wine.orderIndex + 1}`}
        </h2>
        {(wine.producer || wine.country) && (
          <p className="text-sm text-gray-500 mt-0.5">
            {[wine.producer, wine.country, wine.region].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <button
        onClick={onLikeToggle}
        disabled={readOnly}
        className="p-2 rounded-full hover:bg-wine-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        aria-label="Лайк"
      >
        <Heart
          size={24}
          className={isLiked ? 'fill-wine-500 text-wine-500' : 'text-gray-300'}
        />
      </button>
    </div>
  );
}

/** Описание и характеристики вина: крепость, состав, выдержка, методы. */
function WineDetails({ wine }: { wine: Wine }) {
  return (
    <>
      {wine.description && (
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          {wine.description}
        </p>
      )}

      {(wine.abv || wine.composition || wine.aging || wine.methods) && (
        <div className="flex flex-wrap gap-2 mb-4">
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
    </>
  );
}

/** Лицевая сторона слепой дегустации: только метка образца. */
function BlindFront({
  wine,
  isLiked,
  onLikeToggle,
  readOnly,
}: {
  wine: Wine;
  isLiked: boolean;
  onLikeToggle: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <span className="text-xs uppercase tracking-wide text-wine-500 font-semibold">
          Образец {wine.orderIndex + 1}
        </span>
        <h2 className="text-xl font-bold text-gray-900 mt-0.5">
          {wine.blindLabel || `Образец №${wine.orderIndex + 1}`}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {CATEGORY_LABEL[wine.category] ?? wine.category}
        </p>
      </div>
      <button
        onClick={onLikeToggle}
        disabled={readOnly}
        className="p-2 rounded-full hover:bg-wine-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Лайк"
      >
        <Heart
          size={24}
          className={isLiked ? 'fill-wine-500 text-wine-500' : 'text-gray-300'}
        />
      </button>
    </div>
  );
}

interface CardFormProps {
  wine: Wine;
  scales: AttributeScale[];
  scores: Record<string, number>;
  aromaDescriptorIds: string[];
  flavourDescriptorIds: string[];
  comment: string;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  onScoreChange: (name: string, value: number) => void;
  onToggleDescriptor: (d: WsetDescriptor, type: DescriptorType) => void;
  onCommentChange: (v: string) => void;
  onOpenWheel: () => void;
  descriptorTree: WsetDescriptor[];
  wheelOpen: boolean;
  onCloseWheel: () => void;
  readOnly?: boolean;
}

function CardForm({
  wine,
  scales,
  scores,
  aromaDescriptorIds,
  flavourDescriptorIds,
  comment,
  syncStatus,
  onScoreChange,
  onToggleDescriptor,
  onCommentChange,
  onOpenWheel,
  descriptorTree,
  wheelOpen,
  onCloseWheel,
  readOnly,
}: CardFormProps) {
  const totalDescriptors = aromaDescriptorIds.length + flavourDescriptorIds.length;

  return (
    <>
      <div className="mb-4">
        {scales.map((attr) => (
          <AttributeSlider
            key={attr.id}
            label={attr.labelRu}
            min={attr.minVal}
            max={attr.maxVal}
            value={scores[attr.slug] ?? null}
            onChange={(v) => onScoreChange(attr.slug, v)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {readOnly ? (
        <p className="w-full flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 font-medium py-3">
          Войдите, чтобы оценить образец
        </p>
      ) : (
        <button
          onClick={onOpenWheel}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-wine-300 text-wine-700 font-medium py-3 hover:bg-wine-50 transition-colors"
        >
          <Sparkles size={18} />
          Вкусоароматика
          {totalDescriptors > 0 && (
            <span className="text-xs bg-wine-500 text-white rounded-full px-2 py-0.5">
              {totalDescriptors}
            </span>
          )}
        </button>
      )}

      <textarea
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Личные заметки..."
        disabled={readOnly}
        className="w-full mt-4 rounded-lg border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-wine-300 disabled:bg-gray-50 disabled:text-gray-400"
        rows={2}
      />

      <div className="flex items-center justify-end mt-2 text-xs text-gray-400 gap-1">
        {syncStatus === 'saving' && <span>Сохранение...</span>}
        {syncStatus === 'saved' && <span className="text-green-600">✓ Сохранено</span>}
        {syncStatus === 'error' && <span className="text-red-500">Ошибка сохранения</span>}
      </div>

      <WheelDrawer
        open={wheelOpen}
        onClose={onCloseWheel}
        tree={descriptorTree}
        aromaDescriptorIds={aromaDescriptorIds}
        flavourDescriptorIds={flavourDescriptorIds}
        onToggleDescriptor={onToggleDescriptor}
      />
    </>
  );
}
