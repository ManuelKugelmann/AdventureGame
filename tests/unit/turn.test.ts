import { describe, expect, it } from 'vitest';
import { applyCommand, makeRng } from '../../engine/index';
import { content, newGame } from '../helpers';

describe('turn & round flow', () => {
  it('EndTurn passes to the next hero, then wraps into a new round with rotated start player', () => {
    const { state } = newGame(); // 2 heroes, round 1, start hero 0
    const rng = makeRng(99);
    const afterHero0 = applyCommand(content(), state, { kind: 'EndTurn' }, rng);
    expect(afterHero0.state.activeHeroIdx).toBe(1);
    expect(afterHero0.state.round).toBe(1);
    expect(afterHero0.state.heroes[1]!.ap).toBeGreaterThanOrEqual(3); // shadowfoot base 3

    const afterHero1 = applyCommand(content(), afterHero0.state, { kind: 'EndTurn' }, rng);
    expect(afterHero1.state.round).toBe(2);
    expect(afterHero1.state.startHeroIdx).toBe(1); // rotated
    expect(afterHero1.state.activeHeroIdx).toBe(1);
    expect(afterHero1.events.some((e) => e.kind === 'RoundEnded')).toBe(true);
    expect(afterHero1.events.some((e) => e.kind === 'StoryCardDrawn')).toBe(true);
  });

  it('story deck advances phases on exhaustion', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    state.phaseDecks[0] = ['s_quiet1']; // one card left in phase 0
    const rng = makeRng(3);
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, rng);
    expect(res.events.some((e) => e.kind === 'PhaseAdvanced' && e.toPhaseIdx === 1)).toBe(true);
    expect(res.state.phaseIdx).toBe(1);
  });

  it('doom clock ends the game at maxRounds', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    state.round = 16; // scenario maxRounds
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, makeRng(4));
    expect(res.state.outcome).toEqual({ kind: 'loss', detail: 'doom' });
  });

  it('de-escalation ladder ticks down on empty cards', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    // hero elsewhere: simulate an empty alerted card by placing hero on a second card
    state.cards['c9'] = {
      id: 'c9', defId: 'old_well', row: 1, col: 0, alert: 1, emptyRounds: 2,
      alertThreeRounds: 0, usedSlots: {}, blockedExits: [], exploredExits: {},
    };
    state.grid['1,0'] = 'c9';
    state.cards['c0']!.exploredExits[0] = 'c9';
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, makeRng(5));
    // c9 empty for 3rd round → 1→0
    expect(res.state.cards['c9']!.alert).toBe(0);
  });
});
