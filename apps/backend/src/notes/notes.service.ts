import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertNoteDto } from './dto/note.dto';
import { EventPhaseService } from '../events/event-phase.service';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private eventPhase: EventPhaseService,
  ) {}

  async upsertNote(userId: string, dto: UpsertNoteDto) {
    await this.eventPhase.assertWineOpenForNotes(dto.wineId);

    // id события нужен, чтобы зафиксировать посещение в EventParticipant.
    const wine = await this.prisma.wine.findUnique({
      where: { id: dto.wineId },
      select: { eventId: true },
    });
    if (!wine) throw new NotFoundException('Wine not found');

    // Оценки валидируются по набору шкал события (характеристики, заданные админом).
    if (dto.scores && dto.scores.length > 0) {
      await this.assertScoresValid(wine.eventId, dto.scores);
    }

    return this.prisma.$transaction(async (tx) => {
      // Посещение засчитывается уже при первой заметке, даже если участник
      // не присоединялся по QR-коду.
      await tx.eventParticipant.upsert({
        where: { eventId_userId: { eventId: wine.eventId, userId } },
        update: {},
        create: { eventId: wine.eventId, userId },
      });

      const note = await tx.tastingNote.upsert({
        where: {
          userId_wineId: {
            userId,
            wineId: dto.wineId,
          },
        },
        update: {
          isLiked: dto.isLiked ?? undefined,
          comment: dto.comment ?? undefined,
        },
        create: {
          userId,
          wineId: dto.wineId,
          isLiked: dto.isLiked ?? false,
          comment: dto.comment,
        },
      });

      if (dto.scores && dto.scores.length > 0) {
        await tx.noteScoreValue.deleteMany({
          where: { noteId: note.id },
        });
        await tx.noteScoreValue.createMany({
          data: dto.scores.map((s) => ({
            noteId: note.id,
            attributeName: s.attributeName,
            score: s.score,
          })),
        });
      }

      if (dto.descriptors && dto.descriptors.length > 0) {
        await tx.noteDescriptor.deleteMany({
          where: { noteId: note.id },
        });
        await tx.noteDescriptor.createMany({
          data: dto.descriptors.map((d) => ({
            noteId: note.id,
            descriptorId: d.descriptorId,
            type: d.type,
          })),
        });
      }

      return tx.tastingNote.findUnique({
        where: { id: note.id },
        include: {
          scoreValues: true,
          descriptors: {
            include: { descriptor: true },
          },
        },
      });
    });
  }

  /**
   * Проверяет, что переданные оценки относятся к шкалам события и лежат
   * в допустимом диапазоне (min/max шкалы). Неизвестная характеристика
   * или выход за границы отклоняется с 400.
   */
  private async assertScoresValid(
    eventId: string,
    scores: { attributeName: string; score: number }[],
  ): Promise<void> {
    const set = await this.prisma.eventAttributeSet.findUnique({
      where: { eventId },
      include: { scales: { include: { scale: true } } },
    });

    const allowed = new Map(
      (set?.scales ?? []).map((s) => [s.scale.slug, s.scale]),
    );

    for (const { attributeName, score } of scores) {
      const scale = allowed.get(attributeName);
      if (!scale) {
        throw new BadRequestException(
          `Неизвестная характеристика: ${attributeName}`,
        );
      }
      if (score < scale.minVal || score > scale.maxVal) {
        throw new BadRequestException(
          `Оценка «${scale.labelRu}» вне диапазона ${scale.minVal}–${scale.maxVal}`,
        );
      }
    }
  }

  async getNoteByWine(userId: string, wineId: string) {
    return this.prisma.tastingNote.findUnique({
      where: {
        userId_wineId: {
          userId,
          wineId,
        },
      },
      include: {
        scoreValues: true,
        descriptors: {
          include: { descriptor: true },
        },
      },
    });
  }

  async getUserLikedWines(userId: string) {
    return this.prisma.tastingNote.findMany({
      where: {
        userId,
        isLiked: true,
      },
      include: {
        scoreValues: true,
        descriptors: {
          include: { descriptor: true },
        },
        wine: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
                isClosed: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getUserNotesHistory(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.tastingNote.findMany({
        where: { userId },
        include: {
          scoreValues: true,
          descriptors: {
            include: { descriptor: true },
          },
          wine: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                  isClosed: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tastingNote.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Раздел «Дегустации» в личном кабинете.
   *
   * Список строится по посещениям (EventParticipant), а не по заметкам:
   * посещение без заведённой заметки тоже должно засчитываться.
   * Дегустации, где у пользователя есть заметки, но не было присоединения,
   * добавляются из второго источника.
   */
  async getUserEvents(userId: string) {
    const eventSelect = {
      id: true,
      title: true,
      date: true,
      timezone: true,
      coverUrl: true,
      isClosed: true,
      isManuallyOpen: true,
      _count: { select: { wines: true } },
    } as const;

    const [participations, notedEvents] = await Promise.all([
      this.prisma.eventParticipant.findMany({
        where: { userId },
        select: { event: { select: eventSelect } },
      }),
      this.prisma.tastingNote.findMany({
        where: { userId },
        select: { wine: { select: { event: { select: eventSelect } } } },
      }),
    ]);

    const eventsMap = new Map<
      string,
      {
        id: string;
        title: string;
        date: Date;
        timezone: string;
        coverUrl: string | null;
        isClosed: boolean;
        isManuallyOpen: boolean;
        wineCount: number;
      }
    >();

    const collect = (event: {
      id: string;
      title: string;
      date: Date;
      timezone: string;
      coverUrl: string | null;
      isClosed: boolean;
      isManuallyOpen: boolean;
      _count: { wines: number };
    }) => {
      if (eventsMap.has(event.id)) return;
      eventsMap.set(event.id, {
        id: event.id,
        title: event.title,
        date: event.date,
        timezone: event.timezone,
        coverUrl: event.coverUrl,
        isClosed: event.isClosed,
        isManuallyOpen: event.isManuallyOpen,
        wineCount: event._count.wines,
      });
    };

    participations.forEach((p) => collect(p.event));
    notedEvents.forEach((n) => collect(n.wine.event));

    return Array.from(eventsMap.values())
      .map((event) => ({
        ...event,
        phase: this.eventPhase.getPhase(event),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
