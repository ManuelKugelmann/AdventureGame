import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyCommand, createGame, legalCommands, makeRng, randomBot } from '../../engine/index';
import { content, DEFAULT_SETUP } from '../helpers';

/**
 * Contract between legalCommands and applyCommand: every enumerated command
 * must be accepted (no throw) at the state it was enumerated for. Walked
 * along random-bot trajectories so deep/odd states get covered too.
 */
describe('legalCommands ⊆ applyCommand-accepted', () => {
  it('every legal command applies cleanly at every visited state', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        const rng = makeRng(seed);
        const botRng = makeRng(seed ^ 0xfeed);
        let { state } = createGame(content(), { ...DEFAULT_SETUP, seed }, rng);
        let steps = 0;
        while (!state.outcome && steps < 400) {
          const legal = legalCommands(content(), state);
          expect(legal.length).toBeGreaterThan(0);
          // probe every legal command against a snapshot (fresh rng — outcome may differ, must not throw)
          for (const cmd of legal) {
            const probeRng = makeRng(seed ^ steps);
            expect(() => applyCommand(content(), state, cmd, probeRng), JSON.stringify(cmd)).not.toThrow();
          }
          // then advance along the bot trajectory with the real stream
          state = applyCommand(content(), state, randomBot(content(), state, botRng), rng).state;
          steps++;
        }
      }),
      { numRuns: 8 },
    );
  });
});
