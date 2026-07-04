import { describe, expect, it } from 'vitest';
import { makeRng, rollDice } from '../../engine/index';
import { fixedRng, BLANK, HIT, SURGE } from '../helpers';

describe('seeded rng', () => {
  it('is deterministic per seed', () => {
    const a = makeRng(123);
    const b = makeRng(123);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('different seeds diverge', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const sameCount = Array.from({ length: 20 }, () => (a.next() === b.next() ? 1 : 0)).reduce<number>((x, y) => x + y, 0);
    expect(sameCount).toBeLessThan(20);
  });

  it('shuffle is a permutation', () => {
    const rng = makeRng(7);
    const items = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = rng.shuffle(items);
    expect([...shuffled].sort()).toEqual([...items].sort());
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']); // input untouched
  });

  it('int stays in range and pick throws on empty', () => {
    const rng = makeRng(9);
    for (let i = 0; i < 200; i++) {
      const v = rng.int(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
    expect(() => rng.pick([])).toThrow();
  });
});

describe('dice', () => {
  it('maps faces 3 blank / 2 hit / 1 surge; surge counts as hit', () => {
    const roll = rollDice(fixedRng([BLANK, HIT, SURGE]), 3);
    expect(roll.faces).toEqual(['blank', 'hit', 'surge']);
    expect(roll.hits).toBe(2);
    expect(roll.surges).toBe(1);
  });

  it('empirical hit rate ≈ 1/2 (3 of 6 faces)', () => {
    const rng = makeRng(1234);
    let hits = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) hits += rollDice(rng, 1).hits;
    expect(hits / n).toBeGreaterThan(0.46);
    expect(hits / n).toBeLessThan(0.54);
  });

  it('rejects negative count', () => {
    expect(() => rollDice(makeRng(1), -1)).toThrow();
  });
});
