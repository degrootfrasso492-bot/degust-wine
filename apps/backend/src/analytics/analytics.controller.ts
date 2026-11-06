import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { EventPhaseService } from '../events/event-phase.service';
import { EventPhase } from '../events/event-phase';

/**
 * Итоги дегустации.
 *
 * Правила видимости (решение владельца продукта):
 *  - фаза CLOSED — итоги видны всем, включая гостя без входа;
 *  - фазы OPEN/UPCOMING — итоги видны только администратору;
 *  - сырые заметки и матрица участников — только администратору.
 */
@Controller('analytics')
@UseGuards(RolesGuard)
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private eventPhase: EventPhaseService,
  ) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('events/:eventId')
  async getEventAnalytics(
    @Param('eventId') eventId: string,
    @CurrentUser() user?: any,
  ) {
    const role: Role = user?.role ?? Role.USER;

    if (role !== Role.ADMIN) {
      const phase = await this.eventPhase.getPhaseByEventId(eventId);
      if (phase !== EventPhase.CLOSED) {
        // Дегустация ещё не завершена — итогов пока нет.
        return null;
      }
    }

    return this.analyticsService.getEventAnalytics(eventId);
  }

  @Get('events/:eventId/matrix')
  @Roles(Role.ADMIN)
  getEventMatrix(@Param('eventId') eventId: string) {
    return this.analyticsService.getWineRawMatrix(eventId);
  }
}
