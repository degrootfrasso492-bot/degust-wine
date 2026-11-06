import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AttributeAverage {
  attributeName: string;
  labelRu: string;
  maxVal: number;
  average: number;
}

export interface TopDescriptor {
  descriptorId: string;
  labelRu: string;
  count: number;
  type: 'AROMA' | 'FLAVOUR';
}

export interface WineAnalytics {
  wineId: string;
  orderIndex: number;
  title: string;
  blindLabel: string | null;
  photoUrl: string | null;
  category: string;
  producer: string | null;
  country: string | null;
  region: string | null;
  abv: number | null;
  composition: string | null;
  aging: string | null;
  methods: string | null;
  description: string | null;
  likeCount: number;
  noteCount: number;
  attributeAverages: AttributeAverage[];
  topAromaDescriptors: TopDescriptor[];
  topFlavourDescriptors: TopDescriptor[];
}

export interface EventAnalytics {
  eventId: string;
  totalParticipants: number;
  wines: WineAnalytics[];
  globalTopAroma: TopDescriptor[];
  globalTopFlavour: TopDescriptor[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    const [wines, scaleSet] = await Promise.all([
      this.prisma.wine.findMany({
        where: { eventId },
        include: {
          tastingNotes: {
            include: {
              scoreValues: true,
              descriptors: {
                include: { descriptor: true },
              },
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      }),
      this.prisma.eventAttributeSet.findUnique({
        where: { eventId },
        include: {
          scales: { include: { scale: true }, orderBy: { sortOrder: 'asc' } },
        },
      }),
    ]);

    const scales = (scaleSet?.scales ?? []).map((s) => s.scale);

    const participantIds = new Set<string>();
    wines.forEach((w) =>
      w.tastingNotes.forEach((n) => participantIds.add(n.userId)),
    );

    const globalAromaMap = new Map<string, { labelRu: string; count: number }>();
    const globalFlavourMap = new Map<
      string,
      { labelRu: string; count: number }
    >();

    const wineAnalytics: WineAnalytics[] = wines.map((wine) => {
      const notes = wine.tastingNotes;
      const likeCount = notes.filter((n) => n.isLiked).length;
      const noteCount = notes.length;

      // Average per attribute
      const attrSums: Record<string, number[]> = {};
      notes.forEach((note) => {
        note.scoreValues.forEach((sv) => {
          if (!attrSums[sv.attributeName]) attrSums[sv.attributeName] = [];
          attrSums[sv.attributeName].push(sv.score);
        });
      });

      const attributeAverages: AttributeAverage[] = scales.map((scale) => ({
        attributeName: scale.slug,
        labelRu: scale.labelRu,
        maxVal: scale.maxVal,
        average: attrSums[scale.slug]?.length
          ? parseFloat(
              (
                attrSums[scale.slug].reduce((a, b) => a + b, 0) /
                attrSums[scale.slug].length
              ).toFixed(2),
            )
          : 0,
      }));

      // Descriptor frequency per wine
      const aromaMap = new Map<string, { labelRu: string; count: number }>();
      const flavourMap = new Map<string, { labelRu: string; count: number }>();

      notes.forEach((note) => {
        note.descriptors.forEach((nd) => {
          const d = nd.descriptor;
          if (!d) return;
          const map = nd.type === 'AROMA' ? aromaMap : flavourMap;
          const globalMap =
            nd.type === 'AROMA' ? globalAromaMap : globalFlavourMap;

          const existing = map.get(d.id);
          map.set(d.id, {
            labelRu: d.labelRu,
            count: (existing?.count ?? 0) + 1,
          });

          const gExisting = globalMap.get(d.id);
          globalMap.set(d.id, {
            labelRu: d.labelRu,
            count: (gExisting?.count ?? 0) + 1,
          });
        });
      });

      const sortDesc = (
        map: Map<string, { labelRu: string; count: number }>,
        type: 'AROMA' | 'FLAVOUR',
      ): TopDescriptor[] =>
        Array.from(map.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([id, v]) => ({
            descriptorId: id,
            labelRu: v.labelRu,
            count: v.count,
            type,
          }));

      return {
        wineId: wine.id,
        orderIndex: wine.orderIndex,
        title: wine.title,
        blindLabel: wine.blindLabel,
        photoUrl: wine.photoUrl,
        category: wine.category,
        producer: wine.producer,
        country: wine.country,
        region: wine.region,
        abv: wine.abv,
        composition: wine.composition,
        aging: wine.aging,
        methods: wine.methods,
        description: wine.description,
        likeCount,
        noteCount,
        attributeAverages,
        topAromaDescriptors: sortDesc(aromaMap, 'AROMA'),
        topFlavourDescriptors: sortDesc(flavourMap, 'FLAVOUR'),
      };
    });

    // Sort by likes descending
    const sortedWines = [...wineAnalytics].sort(
      (a, b) => b.likeCount - a.likeCount,
    );

    const sortGlobal = (
      map: Map<string, { labelRu: string; count: number }>,
      type: 'AROMA' | 'FLAVOUR',
    ): TopDescriptor[] =>
      Array.from(map.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([id, v]) => ({
          descriptorId: id,
          labelRu: v.labelRu,
          count: v.count,
          type,
        }));

    return {
      eventId,
      totalParticipants: participantIds.size,
      wines: sortedWines,
      globalTopAroma: sortGlobal(globalAromaMap, 'AROMA'),
      globalTopFlavour: sortGlobal(globalFlavourMap, 'FLAVOUR'),
    };
  }

  async getWineRawMatrix(eventId: string) {
    const wines = await this.prisma.wine.findMany({
      where: { eventId },
      include: {
        tastingNotes: {
          include: {
            scoreValues: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    const participantMap = new Map<
      string,
      { id: string; name: string | null; email: string | null }
    >();

    wines.forEach((w) =>
      w.tastingNotes.forEach((n) => {
        if (!participantMap.has(n.userId)) {
          participantMap.set(n.userId, n.user);
        }
      }),
    );

    const participants = Array.from(participantMap.values());

    const matrix = participants.map((p) => {
      const row: Record<string, unknown> = {
        userId: p.id,
        userName: p.name || p.email || p.id,
      };
      wines.forEach((wine) => {
        const note = wine.tastingNotes.find((n) => n.userId === p.id);
        if (!note) {
          row[`wine_${wine.orderIndex + 1}`] = null;
          return;
        }
        const scores = note.scoreValues.map((sv) => sv.score);
        const avg =
          scores.length > 0
            ? parseFloat(
                (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
              )
            : null;
        row[`wine_${wine.orderIndex + 1}`] = avg;
        row[`wine_${wine.orderIndex + 1}_liked`] = note.isLiked;
      });
      return row;
    });

    const wineHeaders = wines.map((w) => ({
      index: w.orderIndex + 1,
      title: w.title,
      blindLabel: w.blindLabel,
    }));

    return { participants, wineHeaders, matrix };
  }
}
