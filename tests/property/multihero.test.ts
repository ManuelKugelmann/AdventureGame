import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { greedyBot, randomBot, runBotGame } from '../../engine/index';
import { content } from '../helpers';

const CLASSES = ['warden', 'shadowfoot', 'lorekeeper'] as const;
/** party of the given size, cycling the available classes (duplicates allowed) */
const partyOf = (n: number): string[] => Array.from({ length: n }, (_, i) => CLASSES[i % CLASSES.length]!);

/**
 * Multi-hero stress (project.md open question #5): parties from solo up to the
 * 6-player prototype cap, with cascading triggers, must stay terminating and
 * invariant-clean, and downed heroes must never take another turn.
 */
describe('multi-hero trigger ordering stress (1-6 players)', () => {
  it('parties of every size terminate cleanly under both bot policies', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 1, max: 6 }),
        fc.boolean(),
        (seed, partySize, useGreedy) => {
          const r = runBotGame(
            content(),
            { scenarioId: 'silent_abbey', heroClassIds: partyOf(partySize), seed },
            useGreedy ? greedyBot : randomBot,
          );
          expect(r.state.outcome).toBeDefined();
          expect(r.state.heroes).toHaveLength(partySize);
          // no TurnStarted for a hero already downed at that moment
          const downed = new Set<number>();
          for (const ev of r.events) {
            if (ev.kind === 'HeroDowned') downed.add(ev.heroIdx);
            if (ev.kind === 'TurnStarted') expect(downed.has(ev.heroIdx)).toBe(false);
          }
        },
      ),
      { numRuns: 24 },
    );
  });

  it('rejects a party larger than the 6-player cap', () => {
    expect(() =>
      runBotGame(content(), { scenarioId: 'silent_abbey', heroClassIds: partyOf(7), seed: 1 }, greedyBot),
    ).toThrow();
  });
});
