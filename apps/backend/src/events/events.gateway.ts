import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface RevealEvent {
  eventId: string;
  message: string;
}

@Injectable()
export class EventsGateway {
  private revealSubject = new Subject<RevealEvent>();

  get revealStream$() {
    return this.revealSubject.asObservable();
  }

  emitReveal(eventId: string) {
    this.revealSubject.next({
      eventId,
      message: 'EVENT_REVEAL',
    });
  }
}
