import { Controller, Sse, Param, MessageEvent } from '@nestjs/common';
import { Observable, map, filter } from 'rxjs';
import { EventsGateway } from './events.gateway';
import { Public } from '../auth/decorators/public.decorator';

@Controller('events')
export class EventsSseController {
  constructor(private gateway: EventsGateway) {}

  // @Public: EventSource на клиенте не умеет слать Authorization-заголовок,
  // поэтому обычный JwtAuthGuard делал стрим недостижимым (401 для всех).
  // Стрим отдаёт только сигнал EVENT_REVEAL (eventId + message), без данных
  // участников и вин, поэтому публичность здесь безопасна.
  @Public()
  @Sse(':eventId/stream')
  stream(@Param('eventId') eventId: string): Observable<MessageEvent> {
    return this.gateway.revealStream$.pipe(
      filter((event) => event.eventId === eventId),
      map((event) => ({
        data: { message: event.message, eventId: event.eventId },
      })),
    );
  }
}
