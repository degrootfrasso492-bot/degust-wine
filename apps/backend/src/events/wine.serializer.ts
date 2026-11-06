import { Role } from '@prisma/client';
import { EventPhase } from './event-phase';

export class WineSerializer {
  static toPublicDto(wine: any, event: any, userRole: Role) {
    const isBlindActive = event.isBlind && event.phase !== EventPhase.CLOSED && userRole !== Role.ADMIN;

    if (!isBlindActive) {
      return wine;
    }

    return {
      id: wine.id,
      eventId: wine.eventId,
      orderIndex: wine.orderIndex,
      blindLabel: wine.blindLabel,
      category: wine.category,
      abv: wine.abv,
      createdAt: wine.createdAt,
      updatedAt: wine.updatedAt,
    };
  }
}
