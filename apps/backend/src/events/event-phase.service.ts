import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventPhase, computeEventPhase } from './event-phase';

@Injectable()
export class EventPhaseService {
  constructor(private prisma: PrismaService) {}

  getPhase(event: {
    date: Date;
    isClosed: boolean;
    isManuallyOpen: boolean;
    timezone: string;
  }): EventPhase {
    return computeEventPhase(event);
  }

  async assertWineOpenForNotes(wineId: string): Promise<void> {
    const wine = await this.prisma.wine.findUnique({
      where: { id: wineId },
      select: {
        event: {
          select: { date: true, isClosed: true, isManuallyOpen: true, timezone: true },
        },
      },
    });
    if (!wine) throw new NotFoundException('Wine not found');

    const phase = this.getPhase(wine.event);
    if (phase !== EventPhase.OPEN) {
      throw new ForbiddenException({
        code: 'EVENT_NOT_OPEN',
        phase,
        message: 'Заметки можно вести только в день дегустации',
      });
    }
  }

  /** Вина видны участникам только с начала дегустации (фаза не UPCOMING). Админ видит всегда. */
  async assertWinesVisible(eventId: string, role: Role): Promise<void> {
    if (role === Role.ADMIN) return;
    const phase = await this.loadPhase(eventId);
    if (phase === EventPhase.UPCOMING) {
      throw new ForbiddenException({
        code: 'EVENT_NOT_STARTED',
        phase,
        message: 'Вина станут доступны в день дегустации',
      });
    }
  }

  /** Итоги видны участникам только после завершения дегустации (фаза CLOSED). Админ видит всегда. */
  async assertResultsVisible(eventId: string, role: Role): Promise<void> {
    if (role === Role.ADMIN) return;
    const phase = await this.loadPhase(eventId);
    if (phase !== EventPhase.CLOSED) {
      throw new ForbiddenException({
        code: 'EVENT_NOT_CLOSED',
        phase,
        message: 'Итоги будут доступны после завершения дегустации',
      });
    }
  }

  /** Фаза события по его id; бросает 404, если события нет. */
  async getPhaseByEventId(eventId: string): Promise<EventPhase> {
    return this.loadPhase(eventId);
  }

  private async loadPhase(eventId: string): Promise<EventPhase> {
    const event = await this.prisma.tastingEvent.findUnique({
      where: { id: eventId },
      select: { date: true, isClosed: true, isManuallyOpen: true, timezone: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    return this.getPhase(event);
  }
}
