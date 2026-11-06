import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EventPhaseService } from './event-phase.service';

type EventRow = {
  date: Date;
  isClosed: boolean;
  isManuallyOpen: boolean;
  timezone: string;
};

const UPCOMING_EVENT: EventRow = {
  date: new Date('2999-01-01T00:00:00Z'),
  isClosed: false,
  isManuallyOpen: false,
  timezone: 'Europe/Moscow',
};
const OPEN_EVENT: EventRow = { ...UPCOMING_EVENT, isManuallyOpen: true };
const CLOSED_EVENT: EventRow = { ...UPCOMING_EVENT, isClosed: true };

function makeService(event: EventRow | null) {
  const calls: unknown[] = [];
  const fakePrisma = {
    tastingEvent: {
      findUnique: async (args: unknown) => {
        calls.push(args);
        return event;
      },
    },
  };
  const service = new EventPhaseService(fakePrisma as any);
  return { service, calls };
}

async function assertForbidden(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof ForbiddenException, 'expected ForbiddenException');
    const response = err.getResponse() as { code: string };
    assert.equal(response.code, code);
    return true;
  });
}

describe('EventPhaseService.assertWinesVisible', () => {
  it('UPCOMING + USER -> EVENT_NOT_STARTED', async () => {
    const { service } = makeService(UPCOMING_EVENT);
    await assertForbidden(service.assertWinesVisible('e1', Role.USER), 'EVENT_NOT_STARTED');
  });

  it('OPEN + USER -> не бросает', async () => {
    const { service } = makeService(OPEN_EVENT);
    await service.assertWinesVisible('e1', Role.USER);
  });

  it('CLOSED + USER -> не бросает', async () => {
    const { service } = makeService(CLOSED_EVENT);
    await service.assertWinesVisible('e1', Role.USER);
  });

  it('UPCOMING + ADMIN -> не бросает и БД не вызывается', async () => {
    const { service, calls } = makeService(UPCOMING_EVENT);
    await service.assertWinesVisible('e1', Role.ADMIN);
    assert.equal(calls.length, 0);
  });

  it('событие не найдено -> NotFoundException', async () => {
    const { service } = makeService(null);
    await assert.rejects(
      service.assertWinesVisible('missing', Role.USER),
      (err: unknown) => {
        assert.ok(err instanceof NotFoundException);
        return true;
      },
    );
  });
});

describe('EventPhaseService.assertResultsVisible', () => {
  it('UPCOMING + USER -> EVENT_NOT_CLOSED', async () => {
    const { service } = makeService(UPCOMING_EVENT);
    await assertForbidden(service.assertResultsVisible('e1', Role.USER), 'EVENT_NOT_CLOSED');
  });

  it('OPEN + USER -> EVENT_NOT_CLOSED', async () => {
    const { service } = makeService(OPEN_EVENT);
    await assertForbidden(service.assertResultsVisible('e1', Role.USER), 'EVENT_NOT_CLOSED');
  });

  it('CLOSED + USER -> не бросает', async () => {
    const { service } = makeService(CLOSED_EVENT);
    await service.assertResultsVisible('e1', Role.USER);
  });

  it('OPEN + ADMIN -> не бросает', async () => {
    const { service } = makeService(OPEN_EVENT);
    await service.assertResultsVisible('e1', Role.ADMIN);
  });

  it('событие не найдено -> NotFoundException', async () => {
    const { service } = makeService(null);
    await assert.rejects(
      service.assertResultsVisible('missing', Role.USER),
      (err: unknown) => {
        assert.ok(err instanceof NotFoundException);
        return true;
      },
    );
  });
});
