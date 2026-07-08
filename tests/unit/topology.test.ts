import { describe, expect, it } from 'vitest';
import { adjacentSections, applyCommand, makeRng, sectionFull, type GameState, type Rng } from '../../engine/index';
import { content, newGame } from '../helpers';

function injectCard(state: GameState, id: string, defId: string, row: number, col: number): void {
  state.cards[id] = {
    id, defId, row, col, alert: 0, emptyRounds: 0, alertThreeRounds: 0,
    usedSlots: {}, blockedExits: [], exploredExits: {}, sprungAmbushes: [], openedExits: [],
  };
  state.grid[`${row},${col}`] = id;
}

/** deterministic rng that always springs ambushes (chancePct true) */
const alwaysSpring: Rng = {
  next: () => 0,
  int: () => 0,
  pick: <T,>(a: readonly T[]): T => a[0]!,
  shuffle: <T,>(a: readonly T[]): T[] => [...a],
  chancePct: () => true,
};

describe('overpass — disjoint halves', () => {
  it('the climb barrier edge is not normal adjacency', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    injectCard(state, 'cO', 'overpass', 1, 0);
    // each ramp reaches only its own span; the two spans are joined only by a barrier
    expect(adjacentSections(content(), state, 'cO', 'south_ramp')).toEqual(['west_span']);
    expect(adjacentSections(content(), state, 'cO', 'north_ramp')).toEqual(['east_span']);
    expect(adjacentSections(content(), state, 'cO', 'west_span')).toEqual(['south_ramp']); // east_span excluded
  });
});

describe('climb (barrier crossing)', () => {
  it('crosses a climb barrier for AP', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    injectCard(state, 'cO', 'overpass', 1, 0);
    const h = state.heroes[0]!;
    h.cardId = 'cO';
    h.section = 'west_span';
    h.ap = 5;
    const res = applyCommand(content(), state, { kind: 'Climb', toSection: 'east_span' }, makeRng(1));
    expect(res.state.heroes[0]!.section).toBe('east_span'); // climbed the barrier
  });

  it('rejects a climb where there is no barrier edge', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    injectCard(state, 'cO', 'overpass', 1, 0);
    const h = state.heroes[0]!;
    h.cardId = 'cO';
    h.section = 'south_ramp'; // south_ramp—west_span is a normal edge, not a barrier
    h.ap = 5;
    expect(() => applyCommand(content(), state, { kind: 'Climb', toSection: 'west_span' }, makeRng(1))).toThrow(/no barrier/);
  });
});

describe('hiding zone capacity', () => {
  it('a nook at capacity blocks entry', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    injectCard(state, 'cH', 'herb_garden', 1, 0);
    expect(sectionFull(content(), state, 'cH', 'briar')).toBe(false); // empty cap-1 nook
    state.enemies['e9'] = { id: 'e9', defId: 'ghoul', stateIdx: 0, cardId: 'cH', section: 'briar', acted: false, sleeper: false };
    expect(sectionFull(content(), state, 'cH', 'briar')).toBe(true); // now full
  });
});

describe('ambush', () => {
  it('springs when a hero enters a zone adjacent to the nook', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    injectCard(state, 'cH', 'herb_garden', 1, 0);
    const hero = state.heroes[0]!;
    hero.cardId = 'cH';
    hero.section = 'shed'; // shed—beds—briar; moving to beds sits adjacent to the nook
    hero.ap = 3;
    hero.detected = false;

    const res = applyCommand(content(), state, { kind: 'MoveSection', toSection: 'beds' }, alwaysSpring);
    const spawn = res.events.find((e) => e.kind === 'EnemySpawned');
    expect(spawn).toMatchObject({ defId: 'ghoul', section: 'briar', sleeper: false });
    expect(res.events.some((e) => e.kind === 'AmbushResolved' && e.enemyId !== null)).toBe(true);
    expect(res.state.cards['cH']!.sprungAmbushes).toContain('briar');
    // the ambusher is now live on the card (it spawns in the nook, then reacts immediately)
    expect(Object.values(res.state.enemies).some((e) => e.cardId === 'cH' && e.defId === 'ghoul')).toBe(true);
  });

  it('springs at most once per nook', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    injectCard(state, 'cH', 'herb_garden', 1, 0);
    state.cards['cH']!.sprungAmbushes = ['briar']; // already resolved
    const hero = state.heroes[0]!;
    hero.cardId = 'cH';
    hero.section = 'shed';
    hero.ap = 3;
    const res = applyCommand(content(), state, { kind: 'MoveSection', toSection: 'beds' }, alwaysSpring);
    expect(res.events.some((e) => e.kind === 'AmbushResolved')).toBe(false); // not re-rolled
  });
});
