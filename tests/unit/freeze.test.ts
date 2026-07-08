import { describe, expect, it } from 'vitest';
import { applyCommand, createGame, makeRng } from '../../engine/index';
import { content, DEFAULT_SETUP, newGame } from '../helpers';

// The guard is live for the whole test run (engine default). Fixture setup is
// thawed by the newGame helper; anything produced at execution stays frozen.
describe('deepFreeze state guard', () => {
  it('freezes the state returned by createGame, deeply', () => {
    const { state } = createGame(content(), DEFAULT_SETUP, makeRng(1));
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.cards)).toBe(true); // nested, not just the root
    expect(() => {
      (state as { round: number }).round = 99;
    }).toThrow();
  });

  it('freezes the state returned by applyCommand (execution is immutable)', () => {
    const { state, rng } = newGame({ heroClassIds: ['warden'] });
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, rng);
    expect(Object.isFrozen(res.state)).toBe(true);
    expect(() => {
      (res.state as { round: number }).round = 99;
    }).toThrow();
  });

  it('newGame hands tests a mutable fixture (the only sanctioned thaw)', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    expect(Object.isFrozen(state)).toBe(false);
    (state as { round: number }).round = 5;
    expect(state.round).toBe(5);
  });
});
