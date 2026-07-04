import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { greedyBot, randomBot, runBotGame } from '../../engine/index';
import { content } from '../helpers';

/**
 * Multi-hero stress (project.md open question #5): 4-hero parties with
 * cascading triggers must stay terminating and invariant-clean, and downed
 * heroes must never take another turn.
 */
describe('4-hero trigger ordering stress', () => {
  it('full parties terminate cleanly under both policies', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500_000 }), fc.boolean(), (seed, useGreedy) => {
        const r = runBotGame(
          content(),
          { scenarioId: 'silent_abbey', heroClassIds: ['warden', 'shadowfoot', 'lorekeeper', 'warden'], seed },
          useGreedy ? greedyBot : randomBot,
        );
        expect(r.state.outcome).toBeDefined();
        // no TurnStarted for a hero already downed at that moment
        const downed = new Set<number>();
        for (const ev of r.events) {
          if (ev.kind === 'HeroDowned') downed.add(ev.heroIdx);
          if (ev.kind === 'TurnStarted') expect(downed.has(ev.heroIdx)).toBe(false);
        }
      }),
      { numRuns: 12 },
    );
  });
});
