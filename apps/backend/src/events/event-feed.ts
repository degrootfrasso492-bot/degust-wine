import type { WineCategory } from '@prisma/client';
import type { EventPhase } from './event-phase';

export const FEED_TOP_WINES_LIMIT = 3;
export const FEED_DEFAULT_LIMIT = 20;
export const FEED_MAX_LIMIT = 50;

export type FeedWineRow = {
  id: string;
  title: string;
  photoUrl: string | null;
  category: WineCategory;
  orderIndex: number;
};

export type FeedTopWine = {
  wineId: string;
  title: string;
  photoUrl: string | null;
  category: WineCategory;
  likeCount: number;
};

export type FeedEvent = {
  id: string;
  title: string;
  date: Date;
  timezone: string;
  coverUrl: string | null;
  phase: EventPhase;
  wineCount: number;
  topWines: FeedTopWine[];
};

/**
 * Выбирает топ вин по лайкам. Вина с 0 лайков отбрасываются.
 * Сортировка: likeCount по убыванию, при равенстве orderIndex по возрастанию.
 */
export function pickTopWines(
  wines: {
    id: string;
    title: string;
    photoUrl: string | null;
    category: WineCategory;
    orderIndex: number;
  }[],
  likeCounts: Map<string, number>,
  limit = FEED_TOP_WINES_LIMIT,
): FeedTopWine[] {
  return wines
    .map((wine) => ({ wine, likeCount: likeCounts.get(wine.id) ?? 0 }))
    .filter((x) => x.likeCount > 0)
    .sort((a, b) => b.likeCount - a.likeCount || a.wine.orderIndex - b.wine.orderIndex)
    .slice(0, limit)
    .map(({ wine, likeCount }) => ({
      wineId: wine.id,
      title: wine.title,
      photoUrl: wine.photoUrl,
      category: wine.category,
      likeCount,
    }));
}
