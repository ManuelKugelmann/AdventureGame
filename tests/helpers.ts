import type { ContentDB, GameState, Rng, Setup } from '../engine/index';
import { createGame, makeRng } from '../engine/index';
import { loadContent } from '../tools/loadContent';

let cached: ContentDB | undefined;
export function content(): ContentDB {
  cached ??= loadContent();
  return cached;
}

export const DEFAULT_SETUP: Setup = { scenarioId: 'silent_abbey', heroClassIds: ['warden', 'shadowfoot'], seed: 42 };

/**
 * Fixture-creation entry point: hands tests a MUTABLE deep copy of a fresh game
 * so they may hand-craft edge-case setups (`state.round = 16`, inject a card…).
 * This is the only sanctioned thaw — `createGame`/`applyCommand` freeze their
 * output (config.debug.freezeState), so any state produced during *execution*
 * (an applyCommand result) stays frozen and mutating it throws. Deep-modify the
 * setup here, never at execution.
 */
export function newGame(setup: Partial<Setup> = {}): { state: GameState; rng: Rng } {
  const full = { ...DEFAULT_SETUP, ...setup };
  const rng = makeRng(full.seed);
  const { state } = createGame(content(), full, rng);
  return { state: structuredClone(state), rng };
}

/**
 * Rng stub: next() yields the queued values (cycling). Lets tests force
 * exact dice faces: with 6 sides, next()<0.5 → blank, <0.834 → hit, else surge.
 */
export function fixedRng(values: number[]): Rng {
  if (values.length === 0) throw new Error('fixedRng needs values');
  let i = 0;
  const next = (): number => {
    const v = values[i % values.length];
    i++;
    if (v === undefined || v < 0 || v >= 1) throw new Error('fixedRng values must be in [0,1)');
    return v;
  };
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(items: readonly T[]): T => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('fixedRng.pick empty');
      return item;
    },
    shuffle: <T>(items: readonly T[]): T[] => [...items],
    chancePct: (pct: number) => next() * 100 < pct,
  };
}

export const BLANK = 0.0; // die face: blank (faces 0-2 of 6)
export const HIT = 0.6; // die face: hit (faces 3-4)
export const SURGE = 0.99; // die face: surge (face 5)
