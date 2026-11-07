import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventPhase, computeEventPhase } from './event-phase';

const DATE = new Date('2026-11-12T00:00:00Z');
const base = { date: DATE, isClosed: false, isManuallyOpen: false, timezone: 'Europe/Moscow' };
const at = (iso: string) => new Date(iso);

describe('computeEventPhase', () => {
  it('Europe/Moscow: переходы по локальному дню', () => {
    assert.equal(computeEventPhase(base, at('2026-11-11T20:59:59Z')), EventPhase.UPCOMING);
    assert.equal(computeEventPhase(base, at('2026-11-11T21:00:00Z')), EventPhase.OPEN);
    assert.equal(computeEventPhase(base, at('2026-11-12T20:59:59Z')), EventPhase.OPEN);
    assert.equal(computeEventPhase(base, at('2026-11-12T21:00:00Z')), EventPhase.CLOSED);
  });

  it('Asia/Vladivostok: переходы по локальному дню', () => {
    const vvo = { ...base, timezone: 'Asia/Vladivostok' };
    assert.equal(computeEventPhase(vvo, at('2026-11-11T13:59:59Z')), EventPhase.UPCOMING);
    assert.equal(computeEventPhase(vvo, at('2026-11-11T14:00:00Z')), EventPhase.OPEN);
  });

  it('America/New_York: дата события не съезжает на предыдущий день (UTC-5)', () => {
    const ny = { ...base, timezone: 'America/New_York' };
    // 2026-11-12 00:00 EST = 05:00Z.
    assert.equal(computeEventPhase(ny, at('2026-11-12T04:59:59Z')), EventPhase.UPCOMING);
    assert.equal(computeEventPhase(ny, at('2026-11-12T05:00:00Z')), EventPhase.OPEN);
    assert.equal(computeEventPhase(ny, at('2026-11-13T04:59:59Z')), EventPhase.OPEN);
    assert.equal(computeEventPhase(ny, at('2026-11-13T05:00:00Z')), EventPhase.CLOSED);
  });

  it('isClosed в день события -> CLOSED', () => {
    assert.equal(
      computeEventPhase({ ...base, isClosed: true }, at('2026-11-12T10:00:00Z')),
      EventPhase.CLOSED,
    );
  });

  it('isClosed вместе с isManuallyOpen -> CLOSED', () => {
    assert.equal(
      computeEventPhase({ ...base, isClosed: true, isManuallyOpen: true }, at('2026-11-12T10:00:00Z')),
      EventPhase.CLOSED,
    );
  });

  it('isManuallyOpen при будущей дате -> OPEN', () => {
    assert.equal(
      computeEventPhase({ ...base, isManuallyOpen: true }, at('2026-11-10T10:00:00Z')),
      EventPhase.OPEN,
    );
  });

  it('isManuallyOpen при прошедшей дате -> OPEN', () => {
    assert.equal(
      computeEventPhase({ ...base, isManuallyOpen: true }, at('2026-11-20T10:00:00Z')),
      EventPhase.OPEN,
    );
  });

  it('невалидная timezone не бросает и ведёт себя как Europe/Moscow', () => {
    const bad = { ...base, timezone: 'Not/AZone' };
    const now = at('2026-11-11T20:59:59Z');
    assert.doesNotThrow(() => computeEventPhase(bad, now));
    assert.equal(computeEventPhase(bad, now), computeEventPhase(base, now));
    assert.equal(computeEventPhase(bad, at('2026-11-11T21:00:00Z')), EventPhase.OPEN);
    assert.equal(computeEventPhase(bad, at('2026-11-12T21:00:00Z')), EventPhase.CLOSED);
  });
});
