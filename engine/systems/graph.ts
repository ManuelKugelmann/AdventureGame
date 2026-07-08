import type { ContentDB } from '../model/content';
import { entryLanding, getCardDef, getSectionDef, isExitCrossable, normalEdges } from '../model/content';
import type { GameState } from '../model/state';
import { enemiesIn, getCard, occupantsIn } from '../model/state';
import { config } from '../config';

/** A board position: card instance + section. */
export interface Pos {
  cardId: string;
  section: string;
}

export function posKey(p: Pos): string {
  return `${p.cardId}/${p.section}`;
}

/** Sections adjacent to `section` within one card (bidirectional; barrier edges excluded). */
export function adjacentSections(content: ContentDB, state: GameState, cardId: string, section: string): string[] {
  const def = getCardDef(content, getCard(state, cardId).defId);
  const out: string[] = [];
  for (const e of normalEdges(def)) {
    if (e.a === section) out.push(e.b);
    if (e.b === section) out.push(e.a);
  }
  return out;
}

export interface CardLink {
  toCardId: string;
  /** section on this card the passage connects to */
  viaSection: string;
  /** section on the target card the passage arrives at */
  toSection: string;
}

/** Card-to-card links (explored exits, both directions — passages are two-way). */
export function linkedCards(content: ContentDB, state: GameState, cardId: string): CardLink[] {
  const out: CardLink[] = [];
  const defOf = (id: string) => getCardDef(content, getCard(state, id).defId);
  // a revealed exit is only a walkable passage if it's actually crossable (peeked-through blockers aren't)
  const crossable = (inst: ReturnType<typeof getCard>, exit: { blocker?: { openable: boolean } }, idx: number): boolean =>
    isExitCrossable(exit, inst.openedExits.includes(idx), inst.blockedExits.includes(idx));
  const here = getCard(state, cardId);
  for (const [exitIdxStr, toCardId] of Object.entries(here.exploredExits)) {
    const idx = Number(exitIdxStr);
    const exit = defOf(cardId).topExits[idx];
    if (!exit) throw new Error(`card ${cardId} explored exit ${exitIdxStr} missing in def`);
    if (!crossable(here, exit, idx)) continue;
    out.push({ toCardId, viaSection: exit.section, toSection: entryLanding(defOf(toCardId), exit.side).id });
  }
  for (const other of Object.values(state.cards)) {
    if (other.id === cardId) continue;
    for (const [exitIdxStr, toCardId] of Object.entries(other.exploredExits)) {
      if (toCardId !== cardId) continue;
      const idx = Number(exitIdxStr);
      const exit = defOf(other.id).topExits[idx];
      if (!exit) throw new Error(`card ${other.id} explored exit ${exitIdxStr} missing in def`);
      if (!crossable(other, exit, idx)) continue;
      // going back down: leave via the entry that matches the exit's side, arrive at its mouth
      out.push({ toCardId: other.id, viaSection: entryLanding(defOf(cardId), exit.side).id, toSection: exit.section });
    }
  }
  return out;
}

/** All neighbor positions of p (section edges + card links), ignoring blockers. */
export function neighbors(content: ContentDB, state: GameState, p: Pos): Pos[] {
  const out: Pos[] = adjacentSections(content, state, p.cardId, p.section).map((s) => ({
    cardId: p.cardId,
    section: s,
  }));
  for (const l of linkedCards(content, state, p.cardId)) {
    if (l.viaSection === p.section) out.push({ cardId: l.toCardId, section: l.toSection });
  }
  return out;
}

/** BFS distances from a start position over the whole revealed board. */
export function distancesFrom(content: ContentDB, state: GameState, start: Pos): Map<string, number> {
  const dist = new Map<string, number>();
  dist.set(posKey(start), 0);
  const queue: Pos[] = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const p = queue[qi];
    if (!p) throw new Error('bfs: queue underflow');
    const d = dist.get(posKey(p));
    if (d === undefined) throw new Error('bfs: missing distance');
    for (const n of neighbors(content, state, p)) {
      if (!dist.has(posKey(n))) {
        dist.set(posKey(n), d + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

/** First step of a shortest path from → to, or undefined if unreachable/already there. */
export function stepToward(content: ContentDB, state: GameState, from: Pos, to: Pos): Pos | undefined {
  if (posKey(from) === posKey(to)) return undefined;
  const dist = distancesFrom(content, state, to);
  const dHere = dist.get(posKey(from));
  if (dHere === undefined) return undefined;
  for (const n of neighbors(content, state, from)) {
    const dN = dist.get(posKey(n));
    if (dN !== undefined && dN === dHere - 1) return n;
  }
  return undefined;
}

/** Chokepoint rule: a section is transit-blocked when enemies there ≥ chokepoint. */
export function sectionBlocked(content: ContentDB, state: GameState, cardId: string, section: string): boolean {
  const def = getCardDef(content, getCard(state, cardId).defId);
  const sec = getSectionDef(def, section);
  return enemiesIn(state, cardId, section).length >= sec.chokepoint;
}

/** Occupant cap of a section: explicit, else config default for hiding zones, else unlimited. */
export function sectionCapacity(content: ContentDB, state: GameState, cardId: string, section: string): number | undefined {
  const sec = getSectionDef(getCardDef(content, getCard(state, cardId).defId), section);
  return sec.capacity ?? (sec.hiding ? config.hiding.defaultCapacity : undefined);
}

/** True when a section is at/over its occupant cap (unlimited sections never are). */
export function sectionFull(content: ContentDB, state: GameState, cardId: string, section: string): boolean {
  const cap = sectionCapacity(content, state, cardId, section);
  return cap !== undefined && occupantsIn(state, cardId, section) >= cap;
}

export function totalEnemies(state: GameState): number {
  return Object.keys(state.enemies).length;
}

export function enemyCapReached(state: GameState): boolean {
  return totalEnemies(state) >= config.alert.enemyCap;
}
