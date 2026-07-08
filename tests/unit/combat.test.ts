import { describe, expect, it } from 'vitest';
import { applyCommand, makeRng } from '../../engine/index';
import type { GameState } from '../../engine/index';
import { content, fixedRng, newGame, BLANK, SURGE } from '../helpers';

function withEnemy(section = 'gate_yard', defId = 'cultist'): GameState {
  const { state } = newGame(); // warden first: combat +1
  state.enemies['e50'] = { id: 'e50', defId, stateIdx: 0, cardId: 'c0', section, acted: false, sleeper: false };
  state.heroes[0]!.ap = 3;
  state.heroes[0]!.detected = false; // sneak-attack scenario: attacking from hidden (first-strike bonus)
  return state;
}

describe('Attack', () => {
  it('hidden first strike gets +1 die; kill sets alert 3 and reveals the attacker', () => {
    const state = withEnemy();
    // 1 AP + combat(+1) + hidden(+1) = 3 dice, all surges → 3 hits vs def 0 (open gate_yard: -1 → 0 net mod)
    const res = applyCommand(content(), state, { kind: 'Attack', targetId: 'e50', ap: 1 }, fixedRng([SURGE, SURGE, SURGE]));
    expect(res.state.enemies['e50']).toBeUndefined(); // 1-state cultist defeated
    expect(res.state.cards['c0']!.alert).toBe(3);
    expect(res.state.heroes[0]!.detected).toBe(true);
    expect(res.events.some((e) => e.kind === 'EnemyDefeated')).toBe(true);
  });

  it('0 hits = auto-fail: enemy unharmed, no alert from damage, but attacking is loud', () => {
    const state = withEnemy();
    const res = applyCommand(content(), state, { kind: 'Attack', targetId: 'e50', ap: 1 }, fixedRng([BLANK, BLANK, BLANK]));
    expect(res.state.enemies['e50']).toBeDefined();
    expect(res.state.cards['c0']!.alert).toBe(0);
    expect(res.state.heroes[0]!.detected).toBe(true);
  });

  it('multi-state enemies swap state tokens instead of dying', () => {
    const state = withEnemy('gate_yard', 'stone_golem'); // 3 states, def 2
    // wake it so nothing odd happens; golem in open section: def 2 + (-1) = 1
    const res = applyCommand(content(), state, { kind: 'Attack', targetId: 'e50', ap: 2 }, fixedRng([SURGE, SURGE, SURGE, SURGE]));
    // 4 dice all surge = 4 hits, net 3 → stateIdx 0→3 ≥ states.length → defeated? 3 states: 0+3=3 = defeated
    expect(res.state.enemies['e50']).toBeUndefined();

    const state2 = withEnemy('gate_yard', 'stone_golem');
    const res2 = applyCommand(content(), state2, { kind: 'Attack', targetId: 'e50', ap: 1 }, fixedRng([SURGE, SURGE, BLANK]));
    // 3 dice: 2 hits, net 1 → cracked
    expect(res2.state.enemies['e50']!.stateIdx).toBe(1);
    expect(res2.events.some((e) => e.kind === 'EnemyStateSwapped')).toBe(true);
  });

  it('rejects out-of-reach targets and over-cap AP', () => {
    const state = withEnemy('postern'); // adjacent but not blocked → melee cannot reach
    expect(() => applyCommand(content(), state, { kind: 'Attack', targetId: 'e50', ap: 1 }, makeRng(1))).toThrow(/not in reach/);
    const state2 = withEnemy();
    state2.heroes[0]!.ap = 5;
    expect(() => applyCommand(content(), state2, { kind: 'Attack', targetId: 'e50', ap: 4 }, makeRng(1))).toThrow(/max 3 AP/);
  });

  it('cover protects the defender (covered = +1 DEF)', () => {
    const state = withEnemy('cloister_wall'); // covered
    state.heroes[0]!.section = 'cloister_wall';
    // 1 AP +1 combat +1 hidden = 3 dice; 1 hit only → net = 1 − (0 def + 1 cover) = 0 → no damage
    const res = applyCommand(content(), state, { kind: 'Attack', targetId: 'e50', ap: 1 }, fixedRng([SURGE, BLANK, BLANK]));
    expect(res.state.enemies['e50']).toBeDefined();
  });
});

describe('enemy retaliation at round end', () => {
  it('awake enemy at alert ≥2 attacks a detected hero in its section', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    state.enemies['e60'] = { id: 'e60', defId: 'cultist', stateIdx: 0, cardId: 'c0', section: 'gate_yard', acted: false, sleeper: false };
    state.cards['c0']!.alert = 2;
    state.heroes[0]!.detected = true;
    const hpBefore = state.heroes[0]!.hp;
    // EndTurn → round end → enemy phase. Cultist rolls 2 dice; force surges → damage (open section: −1 DEF ⇒ +1 net)
    const res = applyCommand(content(), state, { kind: 'EndTurn' }, fixedRng([SURGE, SURGE, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]));
    expect(res.state.heroes[0]!.hp).toBeLessThan(hpBefore);
    expect(res.events.some((e) => e.kind === 'EnemyAttackRolled')).toBe(true);
  });
});
