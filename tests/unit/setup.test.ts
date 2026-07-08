import { describe, expect, it } from 'vitest';
import { createGame, makeRng } from '../../engine/index';
import { content, DEFAULT_SETUP, newGame } from '../helpers';

describe('createGame', () => {
  it('is deterministic for the same seed', () => {
    const a = createGame(content(), DEFAULT_SETUP, makeRng(DEFAULT_SETUP.seed));
    const b = createGame(content(), DEFAULT_SETUP, makeRng(DEFAULT_SETUP.seed));
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
  });

  it('places the start card, heroes at entry, first turn started', () => {
    const { state } = newGame();
    expect(state.cards['c0']?.defId).toBe('abbey_gate');
    for (const hero of state.heroes) {
      expect(hero.cardId).toBe('c0');
      expect(hero.section).toBe('gate_yard');
      expect(hero.detected).toBe(true); // heroes start in the open
    }
    expect(state.round).toBe(1);
    expect(state.activeHeroIdx).toBe(0);
    expect(state.heroes[0]!.ap).toBeGreaterThanOrEqual(2); // apBase + roll ≥ base
    expect(state.outcome).toBeUndefined();
  });

  it('picks a solution from the candidate lists', () => {
    const { state } = newGame();
    const scenario = content().scenarios['silent_abbey']!;
    expect(scenario.solution.who).toContain(state.solution.who);
    expect(scenario.solution.where).toContain(state.solution.where);
    expect(scenario.solution.how).toContain(state.solution.how);
  });

  it('rejects unknown scenario / hero class', () => {
    expect(() => createGame(content(), { ...DEFAULT_SETUP, scenarioId: 'nope' }, makeRng(1))).toThrow();
    expect(() => createGame(content(), { ...DEFAULT_SETUP, heroClassIds: ['nope'] }, makeRng(1))).toThrow();
  });
});
