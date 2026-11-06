import { Module } from '@nestjs/common';
import { EventPhaseService } from './event-phase.service';

/**
 * Отдельный модуль для EventPhaseService, чтобы разорвать циклическую
 * зависимость: EventsModule -> AnalyticsModule -> EventsModule.
 */
@Module({
  providers: [EventPhaseService],
  exports: [EventPhaseService],
})
export class EventPhaseModule {}
