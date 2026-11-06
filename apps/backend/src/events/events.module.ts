import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventsSseController } from './events-sse.controller';
import { EventsGateway } from './events.gateway';
import { EventPhaseService } from './event-phase.service';
import { EventPhaseModule } from './event-phase.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ScalesModule } from '../scales/scales.module';

@Module({
  imports: [AuthModule, EventPhaseModule, AnalyticsModule, ScalesModule],
  providers: [EventsService, EventsGateway],
  controllers: [EventsController, EventsSseController],
  exports: [EventsService, EventsGateway],
})
export class EventsModule {}
