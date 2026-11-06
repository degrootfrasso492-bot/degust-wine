import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickTopWines } from './event-feed';

const wine = (id: string, orderIndex: number, title = `Wine ${id}`) => ({
  id,
  title,
  photoUrl: null,
  category: 'RED' as const,
  orderIndex,
});

describe('pickTopWines', () => {
  it('сортирует по количеству лайков по убыванию', () => {
    const wines = [wine('a', 1), wine('b', 2), wine('c', 3)];
    const likes = new Map([
      ['a', 1],
      ['b', 5],
      ['c', 3],
    ]);
    const top = pickTopWines(wines, likes);
    assert.deepEqual(
      top.map((w) => [w.wineId, w.likeCount]),
      [
        ['b', 5],
        ['c', 3],
        ['a', 1],
      ],
    );
  });

  it('при равном числе лайков тай-брейк по orderIndex по возрастанию', () => {
    const wines = [wine('x', 5), wine('y', 2), wine('z', 9)];
    const likes = new Map([
      ['x', 2],
      ['y', 2],
      ['z', 2],
    ]);
    const top = pickTopWines(wines, likes);
    assert.deepEqual(
      top.map((w) => w.wineId),
      ['y', 'x', 'z'],
    );
  });

  it('отсекает вина с 0 лайками и вина без записи в карте', () => {
    const wines = [wine('a', 1), wine('b', 2), wine('c', 3)];
    const likes = new Map([['b', 0]]);
    assert.deepEqual(pickTopWines(wines, likes), []);

    const partial = pickTopWines(wines, new Map([['c', 1]]));
    assert.deepEqual(partial.map((w) => w.wineId), ['c']);
  });

  it('возвращает не более 3 вин по умолчанию', () => {
    const wines = [1, 2, 3, 4, 5].map((i) => wine(`w${i}`, i));
    const likes = new Map(wines.map((w, i) => [w.id, 10 - i]));
    const top = pickTopWines(wines, likes);
    assert.equal(top.length, 3);
    assert.deepEqual(
      top.map((w) => w.wineId),
      ['w1', 'w2', 'w3'],
    );
  });

  it('пустой вход возвращает пустой массив', () => {
    assert.deepEqual(pickTopWines([], new Map()), []);
  });

  it('переносит поля вина и likeCount в результат', () => {
    const top = pickTopWines(
      [{ id: 'a', title: 'Merlot', photoUrl: 'http://p', category: 'RED', orderIndex: 0 }],
      new Map([['a', 4]]),
    );
    assert.deepEqual(top, [
      { wineId: 'a', title: 'Merlot', photoUrl: 'http://p', category: 'RED', likeCount: 4 },
    ]);
  });
});
