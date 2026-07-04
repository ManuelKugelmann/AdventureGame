import type { ContentDB } from '../model/content';
import { getCardDef, getSectionDef } from '../model/content';
import type { GameState } from '../model/state';
import { enemiesIn, getCard } from '../model/state';
import { config } from '../config';

/** A board position: card instance + section. */
export interface Pos {
  cardId: string;
  section: string;
}

export function posKey(p: Pos): string {
  return `${p.cardId}/${p.section}`;
}

/** Sections adjacent to `section` within one card (def edges are bidirectional). */
export function adjacentSections(content: ContentDB, state: GameState, cardId: string, section: string): string[] {
  const def = getCardDef(content, getCard(state, cardId).defId);
  const out: string[] = [];
  for (const e of def.sectionEdges) {
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
  for (const [exitIdxStr, toCardId] of Object.entries(getCard(state, cardId).exploredExits)) {
    const exit = defOf(cardId).topExits[Number(exitIdxStr)];
    if (!exit) throw new Error(`card ${cardId} explored exit ${exitIdxStr} missing in def`);
    out.push({ toCardId, viaSection: exit.section, toSection: defOf(toCardId).entrySection });
  }
  for (const other of Object.values(state.cards)) {
    if (other.id === cardId) continue;
    for (const [exitIdxStr, toCardId] of Object.entries(other.exploredExits)) {
      if (toCardId !== cardId) continue;
      const exit = defOf(other.id).topExits[Number(exitIdxStr)];
      if (!exit) throw new Error(`card ${other.id} explored exit ${exitIdxStr} missing in def`);
      out.push({ toCardId: other.id, viaSection: defOf(cardId).entrySection, toSection: exit.section });
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

export function totalEnemies(state: GameState): number {
  return Object.keys(state.enemies).length;
}

export function enemyCapReached(state: GameState): boolean {
  return totalEnemies(state) >= config.alert.enemyCap;
}
