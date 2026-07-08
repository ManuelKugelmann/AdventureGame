/**
 * Runtime state — a single serializable object (plain records, no Maps,
 * so JSON round-trips losslessly for saves/snapshots).
 */

export type Aspect = 'who' | 'where' | 'how';

export interface CardInstance {
  id: string;
  defId: string;
  row: number;
  col: number;
  alert: number; // 0-3, lower-bound escalation
  /** rounds the card has been empty (no heroes, no enemies) — drives de-escalation */
  emptyRounds: number;
  /** rounds the card has been at alert 3 — drives encounter severity */
  alertThreeRounds: number;
  /** slotKey `${sectionId}:${slotIdx}` → used */
  usedSlots: Record<string, boolean>;
  /** exit indices sealed by wall tokens (tile pool exhausted / no match) */
  blockedExits: number[];
  /** exit index → cardInstanceId once explored */
  exploredExits: Record<number, string>;
  /** hiding-zone section ids whose ambush has already been rolled (spring once) */
  sprungAmbushes: string[];
}

export interface EnemyInstance {
  id: string;
  defId: string;
  stateIdx: number; // index into EnemyDef.states; past last state = defeated (removed)
  cardId: string;
  section: string;
  acted: boolean;
  /** 💤 sleepers are neutral until woken (zone-share does not raise alert) */
  sleeper: boolean;
}

export interface HeroInstance {
  idx: number;
  classId: string;
  hp: number;
  ap: number;
  cardId: string;
  section: string;
  detected: boolean;
  downed: boolean;
  /** set when the hero attacked from hidden this activation chain (first-strike bonus spent) */
  usedHiddenStrike: boolean;
}

export interface Theory {
  who: string;
  where: string;
  how: string;
}

export type Outcome =
  | { kind: 'win'; detail: 'full' | 'partial' }
  | { kind: 'loss'; detail: 'miss' | 'doom' | 'wipe' };

export interface GameState {
  /** setup args — replaying = createGame(content, setup) + fold(events) */
  setup: { scenarioId: string; heroClassIds: string[]; seed: number };
  round: number;
  phaseIdx: number;
  startHeroIdx: number;
  activeHeroIdx: number;
  grid: Record<string, string>; // "row,col" → cardInstanceId
  cards: Record<string, CardInstance>;
  enemies: Record<string, EnemyInstance>;
  heroes: HeroInstance[];
  tilePools: { tier1: string[]; tier2: string[] };
  mysteryPools: { tier1: string[]; tier2: string[] };
  encounterPool: string[]; // sampled with replacement
  /** remaining cards per phase deck (drawn top-first) */
  phaseDecks: string[][];
  resolutionUnlocked: boolean;
  /** revealed clue aspects (the diary) */
  clues: Partial<Record<Aspect, string>>;
  /** hidden truth, picked at setup */
  solution: Theory;
  /** ids of one-shot symbol cards already fired */
  firedSymbols: string[];
  nextId: number;
  outcome?: Outcome;
}

export function gridKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function getCard(state: GameState, cardId: string): CardInstance {
  const c = state.cards[cardId];
  if (!c) throw new Error(`no card instance ${cardId}`);
  return c;
}

export function getEnemy(state: GameState, enemyId: string): EnemyInstance {
  const e = state.enemies[enemyId];
  if (!e) throw new Error(`no enemy instance ${enemyId}`);
  return e;
}

export function getHero(state: GameState, idx: number): HeroInstance {
  const h = state.heroes[idx];
  if (!h) throw new Error(`no hero ${idx}`);
  return h;
}

export function activeHero(state: GameState): HeroInstance {
  return getHero(state, state.activeHeroIdx);
}

export function enemiesOn(state: GameState, cardId: string): EnemyInstance[] {
  return Object.values(state.enemies)
    .filter((e) => e.cardId === cardId)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function enemiesIn(state: GameState, cardId: string, section: string): EnemyInstance[] {
  return enemiesOn(state, cardId).filter((e) => e.section === section);
}

export function heroesOn(state: GameState, cardId: string): HeroInstance[] {
  return state.heroes.filter((h) => !h.downed && h.cardId === cardId);
}

export function heroesIn(state: GameState, cardId: string, section: string): HeroInstance[] {
  return heroesOn(state, cardId).filter((h) => h.section === section);
}

/** live occupants of a section: heroes + enemies (drives hiding-zone capacity). */
export function occupantsIn(state: GameState, cardId: string, section: string): number {
  return heroesIn(state, cardId, section).length + enemiesIn(state, cardId, section).length;
}

export function livingHeroes(state: GameState): HeroInstance[] {
  return state.heroes.filter((h) => !h.downed);
}

/** invariant checks — throw, never warn */
export function assertInvariants(state: GameState): void {
  for (const h of state.heroes) {
    if (h.ap < 0) throw new Error(`invariant: hero ${h.idx} AP < 0`);
    if (!h.downed && !state.cards[h.cardId]) throw new Error(`invariant: hero ${h.idx} on missing card ${h.cardId}`);
  }
  for (const c of Object.values(state.cards)) {
    if (c.alert < 0 || c.alert > 3) throw new Error(`invariant: card ${c.id} alert ${c.alert} out of 0-3`);
  }
  for (const e of Object.values(state.enemies)) {
    if (!state.cards[e.cardId]) throw new Error(`invariant: enemy ${e.id} on missing card ${e.cardId}`);
    if (e.stateIdx < 0) throw new Error(`invariant: enemy ${e.id} stateIdx ${e.stateIdx}`);
  }
}
