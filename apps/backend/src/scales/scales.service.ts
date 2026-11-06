import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WineCategory } from '@prisma/client';

export interface SerializedScale {
  id: string;
  slug: string;
  labelRu: string;
  minVal: number;
  maxVal: number;
  sortOrder: number;
}

type ScaleRow = {
  id: string;
  slug: string;
  labelRu: string;
  minVal: number;
  maxVal: number;
  sortOrder: number;
};

@Injectable()
export class ScalesService {
  constructor(private prisma: PrismaService) {}

  private serialize(scale: ScaleRow): SerializedScale {
    return {
      id: scale.id,
      slug: scale.slug,
      labelRu: scale.labelRu,
      minVal: scale.minVal,
      maxVal: scale.maxVal,
      sortOrder: scale.sortOrder,
    };
  }

  /** Библиотека доступных шкал (справочник для админки). */
  async listScales(): Promise<SerializedScale[]> {
    const scales = await this.prisma.attributeScale.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return scales.map((s) => this.serialize(s));
  }

  /** Пресеты шкал по типу вина (справочник для админки). */
  async listPresets() {
    return this.prisma.attributePreset.findMany({
      include: {
        scales: { include: { scale: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  /** Шкалы конкретного события в порядке сортировки. */
  async getEventScales(eventId: string): Promise<SerializedScale[]> {
    const set = await this.prisma.eventAttributeSet.findUnique({
      where: { eventId },
      include: {
        scales: { include: { scale: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!set) return [];
    return set.scales.map((s) => this.serialize(s.scale));
  }

  /**
   * Инициализирует набор шкал события из пресета категории, если его ещё нет.
   * Позволяет «шкалы зависят от типа алкоголя» при создании первого вина.
   */
  async ensureEventScales(
    eventId: string,
    category: WineCategory,
  ): Promise<void> {
    const preset = await this.prisma.attributePreset.findUnique({
      where: { category },
      include: { scales: { orderBy: { sortOrder: 'asc' } } },
    });

    const scaleIds = preset
      ? preset.scales.map((s) => s.scaleId)
      : await this.prisma.attributeScale
          .findMany({ orderBy: { sortOrder: 'asc' } })
          .then((all) => all.map((s) => s.id));

    // upsert безопасен к гонке: если набор уже создан, update: {} ничего не меняет.
    await this.prisma.eventAttributeSet.upsert({
      where: { eventId },
      update: {},
      create: {
        eventId,
        scales: {
          create: scaleIds.map((scaleId, i) => ({ scaleId, sortOrder: i })),
        },
      },
    });
  }

  /** Заменяет набор шкал события (порядок задаётся переданным списком slug). */
  async setEventScales(
    eventId: string,
    scaleSlugs: string[],
  ): Promise<SerializedScale[]> {
    const event = await this.prisma.tastingEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const uniqueSlugs = [...new Set(scaleSlugs)];
    if (uniqueSlugs.length === 0) {
      throw new BadRequestException('Не указаны шкалы');
    }

    const scales = await this.prisma.attributeScale.findMany({
      where: { slug: { in: uniqueSlugs } },
    });
    if (scales.length !== uniqueSlugs.length) {
      throw new BadRequestException('Некоторые шкалы не найдены');
    }

    const orderedIds = uniqueSlugs.map(
      (slug) => scales.find((s) => s.slug === slug)!.id,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.eventAttributeSet.deleteMany({ where: { eventId } });
      const set = await tx.eventAttributeSet.create({ data: { eventId } });
      await tx.eventAttributeSetScale.createMany({
        data: orderedIds.map((scaleId, i) => ({
          setId: set.id,
          scaleId,
          sortOrder: i,
        })),
      });
    });

    return this.getEventScales(eventId);
  }
}
