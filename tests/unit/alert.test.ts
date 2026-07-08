import { describe, expect, it } from 'vitest';
import { applyCommand, config, makeRng } from '../../engine/index';
import type { GameState } from '../../engine/index';
import { content, fixedRng, newGame } from '../helpers';

/** Two linked cards: c0 (start) and an injected neighbor c9 (old_well). */
function linkedPair(): GameState {
  const { state } = newGame({ heroClassIds: ['warden'] });
  state.cards['c9'] = {
    id: 'c9', defId: 'old_well', row: 1, col: 0, alert: 0, emptyRounds: 0,
    alertThreeRounds: 0, usedSlots: {}, blockedExits: [], exploredExits: {}, sprungAmbushes: [], openedExits: [],
  };
  state.grid['1,0'] = 'c9';
  state.cards['c0']!.exploredExits[0] = 'c9';
  return state;
}

describe('alert propagation & escalation', () => {
  it('alert 3 pushes linked neighbors 0→1 at round end', () => {
    const state = linkedPair();
    state.cards['c0']!.alert = 3;
    // keep c0 occupied so de-escalation doesn't interfere: hero stands there (it does)
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, makeRng(8));
    expect(res.state.cards['c9']!.alert).toBeGreaterThanOrEqual(1);
  });

  it('alert 2 pushes linked neighbors 0→1 but never 1→2', () => {
    const state = linkedPair();
    state.cards['c0']!.alert = 2;
    state.cards['c9']!.alert = 1;
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, makeRng(8));
    expect(res.state.cards['c9']!.alert).toBe(1); // unchanged by alert-2 source
  });

  it('sustained alert 3 escalates encounter severity (2 spawns)', () => {
    config.alert.encounterBlankPct = 0; // deterministic spawns for this assertion (no false alarms)
    const { state } = newGame({ heroClassIds: ['warden'] });
    state.cards['c0']!.alert = 3;
    state.cards['c0']!.alertThreeRounds = 2; // ≥ severityEscalationAge
    state.phaseDecks[0] = ['s_quiet1']; // no story-driven spawn to confuse the assertion
    const before = Object.keys(state.enemies).length;
    // fixedRng 0.1 everywhere: 60% check fires (10 < 60), pool picks stay in range
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, fixedRng([0.1]));
    const spawns = res.events.filter((e) => e.kind === 'EncounterSpawned');
    expect(spawns).toHaveLength(1);
    expect(spawns[0]!.kind === 'EncounterSpawned' && spawns[0]!.count).toBe(2);
    expect(Object.keys(res.state.enemies).length).toBe(before + 2);
  });

  it('sleepers wake at round end when their card reaches alert ≥2', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    state.enemies['e70'] = { id: 'e70', defId: 'stone_golem', stateIdx: 0, cardId: 'c0', section: 'postern', acted: false, sleeper: true };
    state.cards['c0']!.alert = 2;
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, makeRng(2));
    expect(res.state.enemies['e70']!.sleeper).toBe(false);
    expect(res.events.some((e) => e.kind === 'EnemyWoke' && e.enemyId === 'e70')).toBe(true);
  });

  it('enemies pursue a detected hero across card links at alert 3', () => {
    const state = linkedPair();
    // hero on c9, detected; enemy on c0 at alert 3 → steps across the link
    const hero = state.heroes[0]!;
    hero.cardId = 'c9';
    hero.section = 'wellhead';
    hero.detected = true;
    state.enemies['e71'] = { id: 'e71', defId: 'cultist', stateIdx: 0, cardId: 'c0', section: 'cloister_wall', acted: false, sleeper: false };
    state.cards['c0']!.alert = 3;
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, makeRng(3));
    const enemy = res.state.enemies['e71']!;
    expect(enemy.cardId).toBe('c9'); // crossed via c0.cloister_wall exit → c9.wellhead (entry)
  });
});
