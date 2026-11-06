import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { CreateWineDto, UpdateWineDto } from './dto/wine.dto';
import { EventsGateway } from './events.gateway';
import { EventPhaseService } from './event-phase.service';
import { EventPhase } from './event-phase';
import { WineSerializer } from './wine.serializer';
import { Role } from '@prisma/client';
import { FEED_MAX_LIMIT, FeedEvent, FeedWineRow, pickTopWines } from './event-feed';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuthService } from '../auth/auth.service';
import { ScalesService } from '../scales/scales.service';
import { nanoid } from 'nanoid';
import * as QRCode from 'qrcode';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private gateway: EventsGateway,
    private authService: AuthService,
    private eventPhase: EventPhaseService,
    private analyticsService: AnalyticsService,
    private scalesService: ScalesService,
  ) {}

  private withPhase<T extends { date: Date; isClosed: boolean; isManuallyOpen: boolean; timezone: string }>(
    event: T,
  ): T & { phase: EventPhase } {
    return { ...event, phase: this.eventPhase.getPhase(event) };
  }

  async createEvent(creatorId: string, dto: CreateEventDto) {
    const qrSlug = nanoid(10);
    const event = await this.prisma.tastingEvent.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        qrSlug,
        creatorId,
      },
    });
    return this.withPhase(event);
  }

  async getEvents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.tastingEvent.findMany({
        skip,
        take: limit,
        include: { wines: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tastingEvent.count(),
    ]);
    return { items: items.map((e) => this.withPhase(e)), total, page, limit };
  }

  async getEventById(id: string) {
    const event = await this.prisma.tastingEvent.findUnique({
      where: { id },
      include: { wines: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    return this.withPhase(event);
  }

  /**
   * Публичная карточка события для ленты и поиска.
   *
   * В отличие от остальных маршрутов, здесь 403 не выбрасывается: гость и
   * участник в фазе UPCOMING получают карточку с пустым списком вин, чтобы
   * страница открывалась без ошибки. ADMIN видит всё.
   */
  async getEventCard(id: string, role: Role = Role.USER) {
    const event = await this.prisma.tastingEvent.findUnique({
      where: { id },
      include: {
        wines: { orderBy: { orderIndex: 'asc' } },
        attributeSet: {
          include: {
            scales: { include: { scale: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
        _count: { select: { wines: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    const phase = this.eventPhase.getPhase(event);
    const { wines, _count, attributeSet, ...rest } = event;
    const scales = (attributeSet?.scales ?? []).map((s) => s.scale);

    // Вина скрыты до начала дегустации для всех, кроме админа:
    // эквивалент assertWinesVisible, но без исключения.
    const winesHidden = phase === EventPhase.UPCOMING && role !== Role.ADMIN;
    const eventWithPhase = { ...rest, phase };

    // Итоги (топ-вина по лайкам, средние оценки, топ-10 дескрипторов)
    // видны всем после завершения дегустации; до завершения — только админу.
    const resultsVisible =
      phase === EventPhase.CLOSED || role === Role.ADMIN;
    const results = resultsVisible
      ? await this.analyticsService.getEventAnalytics(id)
      : null;

    return {
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        timezone: event.timezone,
        coverUrl: event.coverUrl,
        isBlind: event.isBlind,
        phase,
        isManuallyOpen: event.isManuallyOpen,
        isClosed: event.isClosed,
        creatorId: event.creatorId,
        wineCount: _count.wines,
        scales,
      },
      wines: winesHidden
        ? []
        : wines.map((wine) => WineSerializer.toPublicDto(wine, eventWithPhase, role)),
      results,
    };
  }

  async getPublicEvent(id: string) {
    const event = await this.prisma.tastingEvent.findUnique({
      where: { id },
      include: { _count: { select: { wines: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      timezone: event.timezone,
      coverUrl: event.coverUrl,
      isBlind: event.isBlind,
      phase: this.eventPhase.getPhase(event),
      wineCount: event._count.wines,
      serverTime: new Date().toISOString(),
    };
  }

  async getFeed(page = 1, limit = 20): Promise<{
    items: FeedEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit >= 1 ? Math.min(Math.floor(limit), FEED_MAX_LIMIT) : 20;
    const skip = (safePage - 1) * safeLimit;

    const [events, total] = await Promise.all([
      this.prisma.tastingEvent.findMany({
        skip,
        take: safeLimit,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          title: true,
          date: true,
          timezone: true,
          coverUrl: true,
          isClosed: true,
          isManuallyOpen: true,
          _count: { select: { wines: true } },
        },
      }),
      this.prisma.tastingEvent.count(),
    ]);

    const closedEventIds = events
      .filter((e) => this.eventPhase.getPhase(e) === EventPhase.CLOSED)
      .map((e) => e.id);

    const winesByEvent = new Map<string, FeedWineRow[]>();
    const likeCounts = new Map<string, number>();

    if (closedEventIds.length > 0) {
      const [wines, likeGroups] = await Promise.all([
        this.prisma.wine.findMany({
          where: { eventId: { in: closedEventIds } },
          select: { id: true, eventId: true, title: true, photoUrl: true, category: true, orderIndex: true },
        }),
        this.prisma.tastingNote.groupBy({
          by: ['wineId'],
          where: { isLiked: true, wine: { eventId: { in: closedEventIds } } },
          _count: { _all: true },
        }),
      ]);

      for (const wine of wines) {
        const list = winesByEvent.get(wine.eventId) ?? [];
        list.push(wine);
        winesByEvent.set(wine.eventId, list);
      }
      for (const group of likeGroups) {
        likeCounts.set(group.wineId, group._count._all);
      }
    }

    const items: FeedEvent[] = events.map((e) => {
      const phase = this.eventPhase.getPhase(e);
      return {
        id: e.id,
        title: e.title,
        date: e.date,
        timezone: e.timezone,
        coverUrl: e.coverUrl,
        phase,
        wineCount: e._count.wines,
        topWines:
          phase === EventPhase.CLOSED
            ? pickTopWines(winesByEvent.get(e.id) ?? [], likeCounts)
            : [],
      };
    });

    return { items, total, page: safePage, limit: safeLimit };
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    const data = dto.date !== undefined ? { ...dto, date: new Date(dto.date) } : dto;
    const event = await this.prisma.tastingEvent.update({
      where: { id },
      data,
    });

    if (dto.isClosed === true) {
      this.gateway.emitReveal(id);
    }

    return this.withPhase(event);
  }

  async deleteEvent(id: string) {
    return this.prisma.tastingEvent.delete({ where: { id } });
  }

  /**
   * Присоединение к событию по QR-слагу.
   *
   * userId приходит только для авторизованного пользователя. Гость (userId
   * отсутствует) присоединяется без записи участника и без ошибки.
   */
  async joinByQrSlug(qrSlug: string, pin?: string, userId?: string) {
    const event = await this.prisma.tastingEvent.findUnique({
      where: { qrSlug },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.accessPin && event.accessPin !== pin) {
      throw new ForbiddenException('Invalid PIN');
    }

    if (userId) {
      // Повторное присоединение не должно создавать дубль — ключ (eventId, userId).
      await this.prisma.eventParticipant.upsert({
        where: { eventId_userId: { eventId: event.id, userId } },
        update: {},
        create: { eventId: event.id, userId },
      });
    }

    return this.withPhase(event);
  }

  async generateQrCode(id: string) {
    const event = await this.prisma.tastingEvent.findUnique({
      where: { id },
    });
    if (!event) throw new NotFoundException('Event not found');
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${event.qrSlug}`;
    const qrBase64 = await QRCode.toDataURL(url);
    return { qrCode: qrBase64, url };
  }

  async createWine(eventId: string, dto: CreateWineDto) {
    const wine = await this.prisma.wine.create({
      data: {
        ...dto,
        eventId,
      },
    });

    // Шкалы события инициализируются из пресета типа первого вина, если ещё не заданы.
    await this.scalesService.ensureEventScales(eventId, dto.category);

    return wine;
  }

  async getWinesByEvent(eventId: string) {
    return this.prisma.wine.findMany({
      where: { eventId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async updateWine(eventId: string, wineId: string, dto: UpdateWineDto) {
    return this.prisma.wine.update({
      where: { id: wineId, eventId },
      data: dto,
    });
  }

  async deleteWine(eventId: string, wineId: string) {
    return this.prisma.wine.delete({
      where: { id: wineId, eventId },
    });
  }
}
