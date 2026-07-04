import { describe, expect, it } from 'vitest';
import { applyCommand, legalCommands, makeRng } from '../../engine/index';
import type { EnemyInstance, GameState } from '../../engine/index';
import { content, fixedRng, newGame, BLANK, HIT } from '../helpers';

function injectEnemy(state: GameState, id: string, section: string, defId = 'cultist', sleeper = false): void {
  const enemy: EnemyInstance = { id, defId, stateIdx: 0, cardId: 'c0', section, acted: false, sleeper };
  state.enemies[id] = enemy;
}

describe('MoveSection', () => {
  it('moves to an adjacent section for 1 AP, hidden stays hidden when quiet', () => {
    const { state } = newGame();
    const ap = state.heroes[0]!.ap;
    const res = applyCommand(content(), state, { kind: 'MoveSection', toSection: 'cloister_wall' }, makeRng(1));
    const hero = res.state.heroes[0]!;
    expect(hero.section).toBe('cloister_wall');
    expect(hero.ap).toBe(ap - 1);
    expect(hero.detected).toBe(false);
    expect(res.state.cards['c0']!.alert).toBe(0);
  });

  it('rejects non-adjacent moves', () => {
    const { state } = newGame();
    state.heroes[0]!.section = 'cloister_wall';
    expect(() => applyCommand(content(), state, { kind: 'MoveSection', toSection: 'postern' }, makeRng(1))).toThrow(/not adjacent/);
  });

  it('zone-share with an awake enemy: detected + alert floor 2 + enemy reaction', () => {
    const { state } = newGame();
    injectEnemy(state, 'e90', 'cloister_wall');
    const res = applyCommand(content(), state, { kind: 'MoveSection', toSection: 'cloister_wall' }, fixedRng([BLANK, BLANK]));
    expect(res.state.heroes[0]!.detected).toBe(true);
    expect(res.state.cards['c0']!.alert).toBe(2);
    expect(res.events.some((e) => e.kind === 'EnemyActed')).toBe(true);
  });

  it('sleepers do not detect or raise alert', () => {
    const { state } = newGame();
    injectEnemy(state, 'e91', 'cloister_wall', 'stone_golem', true);
    const res = applyCommand(content(), state, { kind: 'MoveSection', toSection: 'cloister_wall' }, makeRng(1));
    expect(res.state.heroes[0]!.detected).toBe(false);
    expect(res.state.cards['c0']!.alert).toBe(0);
  });

  it('chokepoint blocks transit and legalCommands agrees', () => {
    const { state } = newGame();
    injectEnemy(state, 'e92', 'postern');
    injectEnemy(state, 'e93', 'postern'); // postern chokepoint = 2
    expect(() => applyCommand(content(), state, { kind: 'MoveSection', toSection: 'postern' }, makeRng(1))).toThrow(/blocked/);
    const legal = legalCommands(content(), state);
    expect(legal.some((c) => c.kind === 'MoveSection' && c.toSection === 'postern')).toBe(false);
    // ...but melee into the blocked adjacent section is allowed
    expect(legal.some((c) => c.kind === 'Attack' && c.targetId === 'e92')).toBe(true);
  });
});

describe('CrossExit', () => {
  it('explores: draws a tile, places the card bricklaid, hero arrives hidden at entry', () => {
    const { state } = newGame();
    const hero = state.heroes[0]!;
    hero.section = 'cloister_wall'; // exit 0 anchor
    hero.ap = 3;
    hero.detected = true;
    const expectedDef = state.tilePools.tier1[0]!;
    const res = applyCommand(content(), state, { kind: 'CrossExit', exitIdx: 0 }, makeRng(5));
    const placedId = res.state.cards['c0']!.exploredExits[0]!;
    const placed = res.state.cards[placedId]!;
    expect(placed.defId).toBe(expectedDef);
    expect(placed.row).toBe(1);
    const heroAfter = res.state.heroes[0]!;
    expect(heroAfter.cardId).toBe(placedId);
    expect(heroAfter.section).toBe(content().cards[expectedDef]!.entrySection);
    expect(res.state.tilePools.tier1).not.toContain(placedId);
    expect(res.events.some((e) => e.kind === 'CardPlaced')).toBe(true);
  });

  it('requires standing in the exit section', () => {
    const { state } = newGame(); // hero at gate_yard; exits anchor at cloister_wall/postern
    expect(() => applyCommand(content(), state, { kind: 'CrossExit', exitIdx: 0 }, makeRng(1))).toThrow(/exit section/);
  });

  it('walls the exit when the tile pool is exhausted', () => {
    const { state } = newGame();
    const hero = state.heroes[0]!;
    hero.section = 'cloister_wall';
    hero.ap = 3;
    state.tilePools.tier1 = [];
    state.tilePools.tier2 = [];
    const res = applyCommand(content(), state, { kind: 'CrossExit', exitIdx: 0 }, makeRng(1));
    expect(res.state.cards['c0']!.blockedExits).toContain(0);
    expect(res.state.heroes[0]!.cardId).toBe('c0'); // went nowhere
    // walled exits disappear from legal commands
    const legal = legalCommands(content(), res.state);
    expect(legal.some((c) => c.kind === 'CrossExit' && c.exitIdx === 0)).toBe(false);
  });
});

describe('StealthMove & ReHide', () => {
  it('succeeds within budget and stays hidden (covered costs 0)', () => {
    const { state } = newGame({ heroClassIds: ['shadowfoot'] });
    state.heroes[0]!.ap = 3;
    const res = applyCommand(content(), state, { kind: 'StealthMove', route: ['cloister_wall'] }, fixedRng([HIT, HIT]));
    const hero = res.state.heroes[0]!;
    expect(hero.section).toBe('cloister_wall');
    expect(hero.detected).toBe(false);
    expect(res.state.cards['c0']!.alert).toBe(0);
  });

  it('0 hits = auto-fail: stays put, detected, alert raised', () => {
    const { state } = newGame({ heroClassIds: ['shadowfoot'] });
    state.heroes[0]!.ap = 3;
    const res = applyCommand(content(), state, { kind: 'StealthMove', route: ['cloister_wall'] }, fixedRng([BLANK, BLANK]));
    const hero = res.state.heroes[0]!;
    expect(hero.section).toBe('gate_yard');
    expect(hero.detected).toBe(true);
    expect(res.state.cards['c0']!.alert).toBeGreaterThanOrEqual(1);
  });

  it('rejects stealth while detected', () => {
    const { state } = newGame();
    state.heroes[0]!.detected = true;
    expect(() => applyCommand(content(), state, { kind: 'StealthMove', route: ['cloister_wall'] }, makeRng(1))).toThrow(/not hidden/);
  });

  it('ReHide succeeds on a good roll and is illegal next to an awake enemy', () => {
    const { state } = newGame({ heroClassIds: ['shadowfoot'] });
    const hero = state.heroes[0]!;
    hero.detected = true;
    hero.ap = 2;
    const ok = applyCommand(content(), state, { kind: 'ReHide' }, fixedRng([HIT, HIT]));
    expect(ok.state.heroes[0]!.detected).toBe(false);

    const { state: state2 } = newGame({ heroClassIds: ['shadowfoot'] });
    state2.heroes[0]!.detected = true;
    state2.heroes[0]!.ap = 2;
    state2.enemies['e99'] = { id: 'e99', defId: 'cultist', stateIdx: 0, cardId: 'c0', section: 'gate_yard', acted: false, sleeper: false };
    expect(() => applyCommand(content(), state2, { kind: 'ReHide' }, makeRng(1))).toThrow(/enemy in section/);
  });
});
