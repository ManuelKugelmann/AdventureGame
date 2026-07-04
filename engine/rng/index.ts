import { config } from '../config';

/** Deterministic seeded PRNG. The engine receives an Rng — never Math.random. */
export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [0, n) */
  int(n: number): number;
  pick<T>(items: readonly T[]): T;
  /** Fisher-Yates, returns a new array */
  shuffle<T>(items: readonly T[]): T[];
  /** chance in percent 0-100 */
  chancePct(pct: number): boolean;
}

/** mulberry32 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(n: number): number {
      if (n <= 0) throw new Error(`rng.int(${n}): n must be > 0`);
      return Math.floor(next() * n);
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('rng.pick on empty array');
      // invariant: index is in [0, length)
      return items[Math.floor(next() * items.length)]!;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        // invariant: i and j are in [0, length)
        const tmp = out[i]!;
        out[i] = out[j]!;
        out[j] = tmp;
      }
      return out;
    },
    chancePct(pct: number): boolean {
      if (pct < 0 || pct > 100) throw new Error(`chancePct(${pct}) out of range`);
      return next() * 100 < pct;
    },
  };
}

export type DieFace = 'blank' | 'hit' | 'surge';

export interface DiceRoll {
  faces: DieFace[];
  hits: number; // hits + surges (a surge counts as a hit)
  surges: number;
}

/** d6: 3 blank / 2 hit / 1 surge. 0 hits on any roll = auto-fail (callers check hits === 0). */
export function rollDice(rng: Rng, count: number): DiceRoll {
  if (count < 0) throw new Error(`rollDice count ${count} < 0`);
  const { blankFaces, hitFaces, surgeFaces } = config.dice;
  const sides = blankFaces + hitFaces + surgeFaces;
  const faces: DieFace[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng.int(sides);
    faces.push(r < blankFaces ? 'blank' : r < blankFaces + hitFaces ? 'hit' : 'surge');
  }
  const surges = faces.filter((f) => f === 'surge').length;
  const hits = faces.filter((f) => f === 'hit').length + surges;
  return { faces, hits, surges };
}
