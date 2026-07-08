import { describe, expect, it } from 'vitest';
import { applyCommand, isExitCrossable, legalCommands, makeRng, type GameState } from '../../engine/index';
import { content, newGame } from '../helpers';

function injectCard(state: GameState, id: string, defId: string, row: number, col: number): void {
  state.cards[id] = {
    id, defId, row, col, alert: 0, emptyRounds: 0, alertThreeRounds: 0,
    usedSlots: {}, blockedExits: [], exploredExits: {}, sprungAmbushes: [], openedExits: [],
  };
  state.grid[`${row},${col}`] = id;
}

/** stand the active hero in a given zone of an injected card with plenty of AP */
function standAt(state: GameState, cardId: string, section: string): void {
  const h = state.heroes[0]!;
  h.cardId = cardId;
  h.section = section;
  h.ap = 8;
  h.detected = false;
}

describe('isExitCrossable', () => {
  it('open passes; shut door blocks; opened door passes; permanent never; walled never', () => {
    expect(isExitCrossable({}, false, false)).toBe(true);
    expect(isExitCrossable({ blocker: { openable: true } }, false, false)).toBe(false);
    expect(isExitCrossable({ blocker: { openable: true } }, true, false)).toBe(true);
    expect(isExitCrossable({ blocker: { openable: false } }, true, false)).toBe(false);
    expect(isExitCrossable({}, false, true)).toBe(false);
  });
});

describe('peek-ahead', () => {
  it('standing at an unblocked exit reveals the card beyond without moving there', () => {
    const { state, rng } = newGame({ heroClassIds: ['warden'] });
    state.heroes[0]!.ap = 6;
    // postern (exitIdx 1, open) is adjacent to the entry — move into it
    const res = applyCommand(content(), state, { kind: 'MoveSection', toSection: 'postern' }, rng);
    expect(res.state.heroes[0]!.section).toBe('postern');
    expect(res.state.heroes[0]!.cardId).toBe('c0'); // did NOT move onto the revealed card
    expect(res.state.cards['c0']!.exploredExits[1]).toBeDefined(); // the way ahead is now revealed
    expect(Object.keys(res.state.cards).length).toBeGreaterThan(1);
  });
});

describe('openable door', () => {
  it('no auto-peek while shut; peek-through or open; crossable only once opened', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    injectCard(state, 'cD', 'dormitory', 1, 0); // stair exit carries an openable door
    standAt(state, 'cD', 'stair');

    const legal = legalCommands(content(), state);
    expect(legal.some((c) => c.kind === 'PeekExit' && c.exitIdx === 0)).toBe(true);
    expect(legal.some((c) => c.kind === 'OpenExit' && c.exitIdx === 0)).toBe(true);
    expect(legal.some((c) => c.kind === 'CrossExit' && c.exitIdx === 0)).toBe(false);
    expect(() => applyCommand(content(), state, { kind: 'CrossExit', exitIdx: 0 }, makeRng(1))).toThrow();

    const r2 = applyCommand(content(), state, { kind: 'OpenExit', exitIdx: 0 }, makeRng(2));
    expect(r2.state.cards['cD']!.openedExits).toContain(0);
    expect(r2.state.cards['cD']!.exploredExits[0]).toBeDefined(); // opening reveals beyond

    const r3 = applyCommand(content(), r2.state, { kind: 'CrossExit', exitIdx: 0 }, makeRng(3));
    expect(r3.state.heroes[0]!.cardId).not.toBe('cD'); // now crossed
  });
});

describe('permanent grate', () => {
  it('can be peeked through but never crossed or opened', () => {
    const { state } = newGame({ heroClassIds: ['warden'] });
    injectCard(state, 'cG', 'chapel_ruin', 1, 0); // vestry (exitIdx 1) is a permanent grate
    standAt(state, 'cG', 'vestry');

    const legal = legalCommands(content(), state);
    expect(legal.some((c) => c.kind === 'PeekExit' && c.exitIdx === 1)).toBe(true);
    expect(legal.some((c) => c.kind === 'OpenExit' && c.exitIdx === 1)).toBe(false);
    expect(legal.some((c) => c.kind === 'CrossExit' && c.exitIdx === 1)).toBe(false);

    const r2 = applyCommand(content(), state, { kind: 'PeekExit', exitIdx: 1 }, makeRng(4));
    expect(r2.state.cards['cG']!.exploredExits[1]).toBeDefined(); // scouted beyond
    expect(() => applyCommand(content(), r2.state, { kind: 'CrossExit', exitIdx: 1 }, makeRng(5))).toThrow();
  });
});
