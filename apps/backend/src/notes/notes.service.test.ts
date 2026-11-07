import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { DescriptorType } from '@prisma/client';
import { NotesService } from './notes.service';

interface ScoreRow {
  id: string;
  attributeName: string;
  score: number;
}
interface DescriptorRow {
  id: string;
  descriptorId: string;
  type: DescriptorType;
}

function makeService(options?: {
  scores?: ScoreRow[];
  descriptors?: DescriptorRow[];
  scales?: { slug: string; minVal: number; maxVal: number; labelRu: string }[];
}) {
  const calls = {
    scoreUpdate: [] as unknown[],
    scoreDelete: [] as unknown[],
    scoreCreate: [] as unknown[],
    descriptorDelete: [] as unknown[],
    descriptorCreate: [] as unknown[],
  };

  const tx = {
    eventParticipant: { upsert: async () => ({}) },
    tastingNote: {
      upsert: async () => ({ id: 'note1' }),
      findUnique: async () => ({ id: 'note1' }),
    },
    noteScoreValue: {
      findMany: async () => options?.scores ?? [],
      update: async (args: unknown) => {
        calls.scoreUpdate.push(args);
      },
      deleteMany: async (args: unknown) => {
        calls.scoreDelete.push(args);
      },
      createMany: async (args: unknown) => {
        calls.scoreCreate.push(args);
      },
    },
    noteDescriptor: {
      findMany: async () => options?.descriptors ?? [],
      deleteMany: async (args: unknown) => {
        calls.descriptorDelete.push(args);
      },
      createMany: async (args: unknown) => {
        calls.descriptorCreate.push(args);
      },
    },
  };

  const prisma = {
    wine: { findUnique: async () => ({ eventId: 'event1' }) },
    eventAttributeSet: {
      findUnique: async () => ({
        scales: (options?.scales ?? [
          { slug: 'acidity', minVal: 0, maxVal: 5, labelRu: 'Кислотность' },
        ]).map((scale) => ({ scale })),
      }),
    },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
  };

  const eventPhase = {
    assertWineOpenForNotes: async () => undefined,
  };

  return {
    service: new NotesService(prisma as any, eventPhase as any),
    calls,
  };
}

describe('NotesService.upsertNote', () => {
  it('обновляет только изменившуюся оценку, не пересоздавая строки', async () => {
    const { service, calls } = makeService({
      scores: [{ id: 's1', attributeName: 'acidity', score: 2 }],
    });

    await service.upsertNote('user1', {
      wineId: 'wine1',
      scores: [{ attributeName: 'acidity', score: 4 }],
    } as any);

    assert.deepEqual(calls.scoreUpdate, [
      { where: { id: 's1' }, data: { score: 4 } },
    ]);
    assert.equal(calls.scoreDelete.length, 0);
    assert.equal(calls.scoreCreate.length, 0);
  });

  it('удаляет только пропавшие оценки', async () => {
    const { service, calls } = makeService({
      scores: [
        { id: 's1', attributeName: 'acidity', score: 3 },
        { id: 's2', attributeName: 'tannin', score: 2 },
      ],
    });

    await service.upsertNote('user1', {
      wineId: 'wine1',
      scores: [{ attributeName: 'acidity', score: 3 }],
    } as any);

    assert.deepEqual(calls.scoreDelete, [
      { where: { id: { in: ['s2'] } } },
    ]);
    assert.equal(calls.scoreUpdate.length, 0);
    assert.equal(calls.scoreCreate.length, 0);
  });

  it('добавляет только новые оценки', async () => {
    const { service, calls } = makeService({ scores: [] });

    await service.upsertNote('user1', {
      wineId: 'wine1',
      scores: [{ attributeName: 'acidity', score: 5 }],
    } as any);

    assert.deepEqual(calls.scoreCreate, [
      {
        data: [{ noteId: 'note1', attributeName: 'acidity', score: 5 }],
      },
    ]);
  });

  it('не трогает неизменившиеся дескрипторы и добавляет новые', async () => {
    const { service, calls } = makeService({
      descriptors: [
        { id: 'd1', descriptorId: 'cherry', type: DescriptorType.AROMA },
      ],
    });

    await service.upsertNote('user1', {
      wineId: 'wine1',
      descriptors: [
        { descriptorId: 'cherry', type: DescriptorType.AROMA },
        { descriptorId: 'vanilla', type: DescriptorType.FLAVOUR },
      ],
    } as any);

    assert.equal(calls.descriptorDelete.length, 0);
    assert.deepEqual(calls.descriptorCreate, [
      {
        data: [
          {
            noteId: 'note1',
            descriptorId: 'vanilla',
            type: DescriptorType.FLAVOUR,
          },
        ],
      },
    ]);
  });

  it('отклоняет оценку вне диапазона шкалы', async () => {
    const { service, calls } = makeService();

    await assert.rejects(
      service.upsertNote('user1', {
        wineId: 'wine1',
        scores: [{ attributeName: 'acidity', score: 99 }],
      } as any),
      BadRequestException,
    );
    assert.equal(calls.scoreCreate.length, 0);
  });
});
