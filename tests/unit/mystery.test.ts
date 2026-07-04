import { describe, expect, it } from 'vitest';
import { applyCommand, makeRng } from '../../engine/index';
import type { GameState, Rng } from '../../engine/index';
import { content, newGame, fixedRng } from '../helpers';

/** Hero on cloister_wall (has a mystery slot), pool rigged to a known token. */
function rigged(tokens: string[], heroClass = 'warden'): GameState {
  const { state } = newGame({ heroClassIds: [heroClass] });
  const hero = state.heroes[0]!;
  hero.section = 'cloister_wall';
  hero.ap = 3;
  state.mysteryPools.tier1 = tokens;
  return state;
}

const inspect = (state: GameState, rng: Rng = makeRng(1)) => applyCommand(content(), state, { kind: 'Inspect', slotIdx: 0 }, rng);

describe('Inspect / mystery tokens', () => {
  it('heal token restores HP (clamped) and is consumed from the pool', () => {
    const state = rigged(['salve']);
    state.heroes[0]!.hp = 5; // warden max 8
    const res = inspect(state);
    expect(res.state.heroes[0]!.hp).toBe(7);
    expect(res.state.mysteryPools.tier1).toEqual([]);
    expect(res.state.cards['c0']!.usedSlots['cloister_wall:0']).toBe(true);
  });

  it('trap token damages the inspector', () => {
    const state = rigged(['dart_trap']);
    const hp = state.heroes[0]!.hp;
    const res = inspect(state);
    expect(res.state.heroes[0]!.hp).toBe(hp - 1);
  });

  it('ap token grants AP', () => {
    const state = rigged(['adrenaline']);
    const res = inspect(state);
    expect(res.state.heroes[0]!.ap).toBe(3 - 1 + 2);
  });

  it('clue token reveals a true solution aspect', () => {
    const state = rigged(['clue_scrap']);
    const res = inspect(state);
    const clues = res.state.clues;
    const revealed = Object.entries(clues);
    expect(revealed).toHaveLength(1);
    const [aspect, value] = revealed[0]!;
    expect(res.state.solution[aspect as 'who' | 'where' | 'how']).toBe(value);
  });

  it('rune token fires its symbol card (ambush spawns from the encounter pool)', () => {
    const state = rigged(['rune_ambush']);
    const before = Object.keys(state.enemies).length;
    const res = inspect(state, fixedRng([0.0]));
    expect(Object.keys(res.state.enemies).length).toBe(before + 1);
    expect(res.events.some((e) => e.kind === 'RuneTriggered')).toBe(true);
    expect(res.events.some((e) => e.kind === 'SymbolFired')).toBe(true);
  });

  it('a used slot cannot be inspected again', () => {
    const state = rigged(['salve', 'ration']);
    const res = inspect(state);
    expect(() => inspect(res.state)).toThrow(/already used/);
  });

  it('empty pools = declared grey fallback: slot spent, nothing found', () => {
    const state = rigged([]);
    const res = inspect(state);
    expect(res.events.some((e) => e.kind === 'TokenDrawn')).toBe(false);
    expect(res.state.cards['c0']!.usedSlots['cloister_wall:0']).toBe(true);
  });
});
