import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WineCategory, DescriptorType } from '@prisma/client';
import { EventPhase, computeEventPhase } from '../events/event-phase';

export interface CatalogAttributeAverage {
  attributeName: string;
  labelRu: string;
  maxVal: number;
  average: number;
}

export interface CatalogTopDescriptor {
  descriptorId: string;
  labelRu: string;
  count: number;
  type: DescriptorType;
}

export interface CatalogAppearance {
  eventId: string;
  title: string;
  date: string;
  likeCount: number;
}

export interface CatalogWine {
  key: string;
  title: string;
  photoUrl: string | null;
  category: WineCategory;
  producer: string | null;
  country: string | null;
  region: string | null;
  abv: number | null;
  composition: string | null;
  aging: string | null;
  methods: string | null;
  description: string | null;
  appearanceCount: number;
  likeCount: number;
  averageLikeCount: number;
  attributeAverages: CatalogAttributeAverage[];
  topAromaDescriptors: CatalogTopDescriptor[];
  topFlavourDescriptors: CatalogTopDescriptor[];
  appearances: CatalogAppearance[];
  latestDate: string;
}

export interface CatalogResponse {
  items: CatalogWine[];
  countries: string[];
  total: number;
}

export interface CatalogQuery {
  q?: string;
  type?: 'WINE' | 'SPIRIT';
  categories?: string; // comma-separated WineCategory
  country?: string;
  sort?: 'likes' | 'newest';
  order?: 'asc' | 'desc';
}

const WINE_CATEGORIES = new Set<WineCategory>([
  'RED',
  'WHITE',
  'ROSE',
  'SPARKLING',
  'FORTIFIED',
  'SWEET',
]);

const SPIRIT_CATEGORIES = new Set<WineCategory>([
  'VODKA',
  'DISTILLATE',
  'COGNAC',
  'WHISKY',
  'TEQUILA',
  'GIN',
  'LIQUEUR',
]);

type WineRow = {
  id: string;
  eventId: string;
  orderIndex: number;
  title: string;
  category: WineCategory;
  abv: number | null;
  composition: string | null;
  producer: string | null;
  country: string | null;
  region: string | null;
  aging: string | null;
  methods: string | null;
  description: string | null;
  photoUrl: string | null;
  event: { id: string; title: string; date: Date };
  tastingNotes: {
    isLiked: boolean;
    scoreValues: { attributeName: string; score: number }[];
    descriptors: {
      type: DescriptorType;
      descriptor: { id: string; labelRu: string } | null;
    }[];
  }[];
};

type ScaleRow = {
  slug: string;
  labelRu: string;
  maxVal: number;
  sortOrder: number;
};

/**
 * Сводный каталог алкоголя.
 *
 * Объединяет одинаковые вина/напитки из завершённых дегустаций (итоги видны
 * только после закрытия события), усредняя оценки и агрегируя лайки и
 * органолептику по всем вхождениям. Ключ объединения — нормализованное
 * название (lowercase + trim).
 */
@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getCatalog(query: CatalogQuery): Promise<CatalogResponse> {
    const events = await this.prisma.tastingEvent.findMany({
      select: {
        id: true,
        date: true,
        isClosed: true,
        isManuallyOpen: true,
        timezone: true,
      },
    });

    const closedEventIds = events
      .filter((e) => computeEventPhase(e) === EventPhase.CLOSED)
      .map((e) => e.id);

    if (closedEventIds.length === 0) {
      return { items: [], countries: [], total: 0 };
    }

    const [wines, scales] = await Promise.all([
      this.prisma.wine.findMany({
        where: { eventId: { in: closedEventIds } },
        include: {
          event: { select: { id: true, title: true, date: true } },
          tastingNotes: {
            include: {
              scoreValues: true,
              descriptors: { include: { descriptor: true } },
            },
          },
        },
        orderBy: { title: 'asc' },
      }),
      this.prisma.attributeScale.findMany({
        select: { slug: true, labelRu: true, maxVal: true, sortOrder: true },
      }),
    ]);

    const scaleBySlug = new Map<string, ScaleRow>(
      scales.map((s) => [s.slug, s]),
    );

    // Группировка по нормализованному названию.
    const groups = new Map<string, WineRow[]>();
    for (const wine of wines as WineRow[]) {
      const key = wine.title.trim().toLowerCase();
      const list = groups.get(key) ?? [];
      list.push(wine);
      groups.set(key, list);
    }

    const items: CatalogWine[] = [...groups.entries()].map(([key, rows]) =>
      this.buildItem(key, rows, scaleBySlug),
    );

    const filtered = this.applyFilters(items, query);
    this.applySort(filtered, query);

    const countries = [
      ...new Set(
        items.map((i) => i.country).filter((c): c is string => Boolean(c)),
      ),
    ].sort((a, b) => a.localeCompare(b, 'ru'));

    return { items: filtered, countries, total: filtered.length };
  }

  private buildItem(
    key: string,
    rows: WineRow[],
    scaleBySlug: Map<string, ScaleRow>,
  ): CatalogWine {
    // Самые свежие дегустации первыми.
    const sorted = [...rows].sort(
      (a, b) => b.event.date.getTime() - a.event.date.getTime(),
    );
    const primary = sorted[0];

    const appearances: CatalogAppearance[] = sorted.map((w) => ({
      eventId: w.eventId,
      title: w.event.title,
      date: w.event.date.toISOString(),
      likeCount: w.tastingNotes.filter((n) => n.isLiked).length,
    }));

    const likeCount = rows.reduce(
      (sum, w) => sum + w.tastingNotes.filter((n) => n.isLiked).length,
      0,
    );

    // Средний лайк на одну дегустацию — метрика для сортировки и отображения.
    const averageLikeCount = parseFloat((likeCount / rows.length).toFixed(2));

    // Усреднённые оценки по всем вхождениям.
    const attrSums = new Map<string, number[]>();
    rows.forEach((w) =>
      w.tastingNotes.forEach((n) =>
        n.scoreValues.forEach((sv) => {
          const arr = attrSums.get(sv.attributeName) ?? [];
          arr.push(sv.score);
          attrSums.set(sv.attributeName, arr);
        }),
      ),
    );

    const attributeAverages: CatalogAttributeAverage[] = [
      ...attrSums.entries(),
    ]
      .map(([slug, scores]) => {
        const scale = scaleBySlug.get(slug);
        return {
          attributeName: slug,
          labelRu: scale?.labelRu ?? slug,
          maxVal: scale?.maxVal ?? 5,
          average: parseFloat(
            (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
          ),
        };
      })
      .sort((a, b) => {
        const sa = scaleBySlug.get(a.attributeName)?.sortOrder ?? 0;
        const sb = scaleBySlug.get(b.attributeName)?.sortOrder ?? 0;
        return sa - sb;
      });

    // Агрегированная органолептика.
    const aromaMap = new Map<string, { labelRu: string; count: number }>();
    const flavourMap = new Map<string, { labelRu: string; count: number }>();
    rows.forEach((w) =>
      w.tastingNotes.forEach((n) =>
        n.descriptors.forEach((nd) => {
          const d = nd.descriptor;
          if (!d) return;
          const map = nd.type === 'AROMA' ? aromaMap : flavourMap;
          const existing = map.get(d.id);
          map.set(d.id, {
            labelRu: d.labelRu,
            count: (existing?.count ?? 0) + 1,
          });
        }),
      ),
    );

    const sortTop = (
      map: Map<string, { labelRu: string; count: number }>,
      type: DescriptorType,
    ): CatalogTopDescriptor[] =>
      [...map.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([id, v]) => ({
          descriptorId: id,
          labelRu: v.labelRu,
          count: v.count,
          type,
        }));

    // Первое непустое значение среди вхождений (от свежих к старым).
    const pick = <T,>(getter: (w: WineRow) => T | null | undefined): T | null => {
      for (const w of sorted) {
        const v = getter(w);
        if (v !== null && v !== undefined && v !== '') return v;
      }
      return null;
    };

    return {
      key,
      title: primary.title,
      photoUrl: pick((w) => w.photoUrl),
      category: primary.category,
      producer: pick((w) => w.producer),
      country: pick((w) => w.country),
      region: pick((w) => w.region),
      abv: pick((w) => w.abv),
      composition: pick((w) => w.composition),
      aging: pick((w) => w.aging),
      methods: pick((w) => w.methods),
      description: pick((w) => w.description),
      appearanceCount: rows.length,
      likeCount,
      averageLikeCount,
      attributeAverages,
      topAromaDescriptors: sortTop(aromaMap, 'AROMA'),
      topFlavourDescriptors: sortTop(flavourMap, 'FLAVOUR'),
      appearances,
      latestDate: sorted[0].event.date.toISOString(),
    };
  }

  private applyFilters(items: CatalogWine[], query: CatalogQuery): CatalogWine[] {
    let result = items;

    if (query.type === 'WINE') {
      result = result.filter((i) => WINE_CATEGORIES.has(i.category));
    } else if (query.type === 'SPIRIT') {
      result = result.filter((i) => SPIRIT_CATEGORIES.has(i.category));
    }

    if (query.categories) {
      const set = new Set(
        query.categories
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      );
      if (set.size > 0) {
        result = result.filter((i) => set.has(i.category));
      }
    }

    if (query.country) {
      const c = query.country.trim().toLowerCase();
      result = result.filter((i) => (i.country ?? '').toLowerCase() === c);
    }

    const q = query.q?.trim().toLowerCase();
    if (q) {
      result = result.filter((i) =>
        [i.title, i.producer, i.country, i.region, i.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }

    return result;
  }

  private applySort(items: CatalogWine[], query: CatalogQuery): void {
    const byNewest = query.sort === 'newest';
    const desc = query.order !== 'asc'; // по умолчанию — убывание

    items.sort((a, b) => {
      if (byNewest) {
        const cmp = a.latestDate.localeCompare(b.latestDate);
        return desc ? -cmp : cmp;
      }
      const diff = b.averageLikeCount - a.averageLikeCount;
      return desc ? diff : -diff;
    });
  }
}
