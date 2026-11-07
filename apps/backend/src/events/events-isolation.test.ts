import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Role } from '@prisma/client';
import { EventsController } from './events.controller';
import { EventPhase } from './event-phase';

const wine = {
  id: 'wine1',
  eventId: 'event1',
  orderIndex: 1,
  title: 'Château Secret',
  blindLabel: 'A',
  category: 'RED',
  abv: 13.5,
  producer: 'Hidden Producer',
  country: 'France',
  region: 'Bordeaux',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeController(phase: EventPhase, isBlind: boolean) {
  const eventsService = {
    getWinesByEvent: async () => [wine],
    getEventById: async () => ({ isBlind, phase, isClosed: phase === EventPhase.CLOSED }),
  };
  const eventPhase = { assertWinesVisible: async () => undefined };
  const scalesService = {};

  return new EventsController(
    eventsService as any,
    eventPhase as any,
    scalesService as any,
  );
}

describe('EventsController.getWines — изоляция слепой дегустации', () => {
  it('в фазе OPEN участник не получает producer/title/country', async () => {
    const controller = makeController(EventPhase.OPEN, true);
    const result = (await controller.getWines('event1', {
      role: Role.USER,
    })) as any[];

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'wine1');
    assert.equal(result[0].blindLabel, 'A');
    assert.equal('title' in result[0], false);
    assert.equal('producer' in result[0], false);
    assert.equal('country' in result[0], false);
  });

  it('ADMIN видит полные данные даже в слепой фазе', async () => {
    const controller = makeController(EventPhase.OPEN, true);
    const result = (await controller.getWines('event1', {
      role: Role.ADMIN,
    })) as any[];

    assert.equal(result[0].title, 'Château Secret');
    assert.equal(result[0].producer, 'Hidden Producer');
  });

  it('после CLOSED данные раскрываются всем', async () => {
    const controller = makeController(EventPhase.CLOSED, true);
    const result = (await controller.getWines('event1', {
      role: Role.USER,
    })) as any[];

    assert.equal(result[0].title, 'Château Secret');
    assert.equal(result[0].country, 'France');
  });
});
