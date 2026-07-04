import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  createGame,
  foldEvents,
  greedyBot,
  makeRng,
  randomBot,
  replaySave,
} from '../../engine/index';
import type { Command, GameEvent } from '../../engine/index';
import { content, DEFAULT_SETUP } from '../helpers';

/** Drive a full bot game, keeping the initial state and per-command events. */
function drive(seed: number, useGreedy: boolean) {
  const setup = { ...DEFAULT_SETUP, seed };
  const rng = makeRng(seed);
  const botRng = makeRng(seed ^ 0xbeef);
  const g0 = createGame(content(), setup, rng);
  const initial = structuredClone(g0.state);
  let state = g0.state;
  const cmdEvents: GameEvent[] = [];
  const commands: Command[] = [];
  const policy = useGreedy ? greedyBot : randomBot;
  while (!state.outcome && commands.length < 5000) {
    const cmd = policy(content(), state, botRng);
    const res = applyCommand(content(), state, cmd, rng);
    state = res.state;
    commands.push(cmd);
    cmdEvents.push(...res.events);
  }
  return { setup, initial, final: state, cmdEvents, commands };
}

describe('event-sourcing properties', () => {
  it('replay(events) ≡ state — folding the event log over the initial state reproduces the final state', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100_000 }), fc.boolean(), (seed, useGreedy) => {
        const { initial, final, cmdEvents } = drive(seed, useGreedy);
        expect(foldEvents(initial, cmdEvents)).toEqual(final);
      }),
      { numRuns: 15 },
    );
  });

  it('replaySave(setup, commands) reproduces the final state exactly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100_000 }), (seed) => {
        const { setup, final, commands } = drive(seed, true);
        const replayed = replaySave(content(), { version: 1, setup, commands });
        expect(replayed.state).toEqual(final);
      }),
      { numRuns: 10 },
    );
  });

  it('games terminate with an outcome and respect hard invariants throughout', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), fc.boolean(), (seed, useGreedy) => {
        const { final } = drive(seed, useGreedy);
        expect(final.outcome).toBeDefined();
        for (const hero of final.heroes) expect(hero.ap).toBeGreaterThanOrEqual(0);
        for (const card of Object.values(final.cards)) {
          expect(card.alert).toBeGreaterThanOrEqual(0);
          expect(card.alert).toBeLessThanOrEqual(3);
        }
      }),
      { numRuns: 25 },
    );
  });
});
