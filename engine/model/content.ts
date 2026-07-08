import { z } from 'zod';

/**
 * Static content definitions. YAML is validated against these schemas at
 * content:build time; the engine re-parses the bundled JSON at load time
 * (zod at every boundary).
 */

export const CoverSchema = z.enum(['open', 'partial', 'covered']);
export type Cover = z.infer<typeof CoverSchema>;

export const SlotSchema = z.object({
  kind: z.literal('mystery'),
});
export type Slot = z.infer<typeof SlotSchema>;

/** vertical band a zone sits in: entry (bottom) / core (middle) / exit (top) */
export const RowSchema = z.enum(['entry', 'core', 'exit']);
export type Row = z.infer<typeof RowSchema>;
/** horizontal placement within its row: full width, or the left / right half */
export const ColSchema = z.enum(['full', 'left', 'right']);
export type Col = z.infer<typeof ColSchema>;
/** which of the two bricks straddling a card an exit leads to */
export const SideSchema = z.enum(['left', 'right']);
export type Side = z.infer<typeof SideSchema>;

export const SectionDefSchema = z.object({
  id: z.string().min(1),
  cover: CoverSchema,
  /** enemies in section ≥ chokepoint ⇒ transit through blocked. Low = a tight
   * corridor a couple of guards can seal; high = an open yard you can't bottle up. */
  chokepoint: z.number().int().min(1).max(12),
  slots: z.array(SlotSchema).default([]),
  row: RowSchema,
  col: ColSchema.default('full'),
  /** a small nook: limited occupants; may conceal an ambusher */
  hiding: z.boolean().default(false),
  /** max simultaneous occupants (heroes + enemies); defaults per config for hiding places, else unlimited */
  capacity: z.number().int().min(1).optional(),
  /** an ambusher that springs when a hero enters an adjacent zone (hiding zones only) */
  ambush: z
    .object({ enemy: z.string().min(1), chancePct: z.number().int().min(0).max(100).optional() })
    .optional(),
});
export type SectionDef = z.infer<typeof SectionDefSchema>;

export const CardDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  biome: z.string().min(1),
  tier: z.union([z.literal(1), z.literal(2)]),
  // zones per card stay low; up to 6 covers overpass (2 entry + 2 exit) + a nook
  sections: z.array(SectionDefSchema).min(2).max(6),
  /** intra-card paths; `requires` marks a barrier edge (climb/jump) not crossable by normal movement in v0 */
  sectionEdges: z.array(z.object({ a: z.string(), b: z.string(), requires: z.string().min(1).optional() })),
  /** exits are separate from top zones: an exit anchors to a `row:exit` zone and leads to the left/right brick above.
   * A `blocker` gates it: openable ⇒ a door you can open to pass; permanent ⇒ never crossable (peek-through only). */
  topExits: z
    .array(
      z.object({
        section: z.string().min(1),
        side: SideSchema,
        blocker: z.object({ label: z.string().min(1), openable: z.boolean() }).optional(),
      }),
    )
    .min(1)
    .max(2),
  /** enemies present when the card is revealed */
  spawns: z
    .array(z.object({ enemy: z.string().min(1), section: z.string().min(1), sleeper: z.boolean().default(false) }))
    .default([]),
});
export type CardDef = z.infer<typeof CardDefSchema>;

export const EnemyStateSchema = z.object({
  name: z.string().min(1),
  atkDice: z.number().int().min(1).max(5),
  def: z.number().int().min(0).max(3),
});
export type EnemyState = z.infer<typeof EnemyStateSchema>;

export const EnemyDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tags: z.array(z.string()).default([]),
  ini: z.number().int().min(1).max(5),
  /** HP = state token swap healthy→wounded→critical; never numeric HP */
  states: z.array(EnemyStateSchema).min(1).max(3),
});
export type EnemyDef = z.infer<typeof EnemyDefSchema>;

export const HeroClassDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  apBase: z.number().int().min(1).max(5),
  hp: z.number().int().min(3).max(12),
  skills: z.object({
    combat: z.number().int().min(-1).max(1),
    stealth: z.number().int().min(-1).max(1),
    magic: z.number().int().min(-1).max(1),
    social: z.number().int().min(-1).max(1),
  }),
});
export type HeroClassDef = z.infer<typeof HeroClassDefSchema>;

export const MysteryPayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('heal'), amount: z.number().int().min(1) }),
  z.object({ kind: z.literal('ap'), amount: z.number().int().min(1) }),
  z.object({ kind: z.literal('clue') }),
  z.object({ kind: z.literal('trap'), damage: z.number().int().min(1) }),
  z.object({ kind: z.literal('rune'), symbolCard: z.string().min(1) }),
]);
export type MysteryPayload = z.infer<typeof MysteryPayloadSchema>;

export const MysteryTokenDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** color = biome, shade = tier */
  biome: z.string().min(1),
  tier: z.union([z.literal(1), z.literal(2)]),
  /** shortcut = immediate payload; rune = looks up a symbol card */
  symbol: z.enum(['shortcut', 'rune']),
  payload: MysteryPayloadSchema,
});
export type MysteryTokenDef = z.infer<typeof MysteryTokenDefSchema>;

export const SymbolEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('spawnEncounter'), count: z.number().int().min(1).max(3) }),
  z.object({ kind: z.literal('alertDown'), amount: z.number().int().min(1).max(3) }),
  z.object({ kind: z.literal('lore'), text: z.string() }),
]);
export type SymbolEffect = z.infer<typeof SymbolEffectSchema>;

export const SymbolCardDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  trigger: z.object({ kind: z.literal('rune') }),
  oneShot: z.boolean(),
  effect: SymbolEffectSchema,
});
export type SymbolCardDef = z.infer<typeof SymbolCardDefSchema>;

export const StoryCardTypeSchema = z.enum(['QUIET', 'LORE', 'CLUE', 'COMBAT', 'EVENT', 'RESOLUTION']);
export type StoryCardType = z.infer<typeof StoryCardTypeSchema>;

export const StoryCardDefSchema = z.object({
  id: z.string().min(1),
  type: StoryCardTypeSchema,
  text: z.string().min(1),
});
export type StoryCardDef = z.infer<typeof StoryCardDefSchema>;

export const ScenarioDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startBiome: z.string().min(1),
  startCard: z.string().min(1),
  maxRounds: z.number().int().min(5).max(40),
  /** bricklay draw pools per tier (card def ids, shuffled at setup) */
  tilePools: z.object({ tier1: z.array(z.string()).min(1), tier2: z.array(z.string()).min(1) }),
  /** rows at index ≥ tier2FromRow draw from the tier-2 pool */
  tier2FromRow: z.number().int().min(1),
  encounterPool: z.array(z.string()).min(1),
  mysteryPools: z.object({ tier1: z.array(z.string()).min(1), tier2: z.array(z.string()).min(1) }),
  phases: z.array(z.object({ id: z.string().min(1), deck: z.array(z.string()).min(1) })).min(1),
  /** candidate aspects; setup secretly picks one of each (the solution) */
  solution: z.object({
    who: z.array(z.string()).min(2),
    where: z.array(z.string()).min(2),
    how: z.array(z.string()).min(2),
  }),
});
export type ScenarioDef = z.infer<typeof ScenarioDefSchema>;

export const ContentDBSchema = z.object({
  cards: z.record(z.string(), CardDefSchema),
  enemies: z.record(z.string(), EnemyDefSchema),
  heroes: z.record(z.string(), HeroClassDefSchema),
  mysteryTokens: z.record(z.string(), MysteryTokenDefSchema),
  symbolCards: z.record(z.string(), SymbolCardDefSchema),
  storyCards: z.record(z.string(), StoryCardDefSchema),
  scenarios: z.record(z.string(), ScenarioDefSchema),
});
export type ContentDB = z.infer<typeof ContentDBSchema>;

/** Parse + throw with readable message. Used by app/tools/tests at the JSON boundary. */
export function parseContent(raw: unknown): ContentDB {
  return ContentDBSchema.parse(raw);
}

export function getCardDef(content: ContentDB, id: string): CardDef {
  const def = content.cards[id];
  if (!def) throw new Error(`unknown card def: ${id}`);
  return def;
}
export function getEnemyDef(content: ContentDB, id: string): EnemyDef {
  const def = content.enemies[id];
  if (!def) throw new Error(`unknown enemy def: ${id}`);
  return def;
}
export function getHeroClassDef(content: ContentDB, id: string): HeroClassDef {
  const def = content.heroes[id];
  if (!def) throw new Error(`unknown hero class: ${id}`);
  return def;
}
export function getMysteryTokenDef(content: ContentDB, id: string): MysteryTokenDef {
  const def = content.mysteryTokens[id];
  if (!def) throw new Error(`unknown mystery token: ${id}`);
  return def;
}
export function getSymbolCardDef(content: ContentDB, id: string): SymbolCardDef {
  const def = content.symbolCards[id];
  if (!def) throw new Error(`unknown symbol card: ${id}`);
  return def;
}
export function getStoryCardDef(content: ContentDB, id: string): StoryCardDef {
  const def = content.storyCards[id];
  if (!def) throw new Error(`unknown story card: ${id}`);
  return def;
}
export function getScenarioDef(content: ContentDB, id: string): ScenarioDef {
  const def = content.scenarios[id];
  if (!def) throw new Error(`unknown scenario: ${id}`);
  return def;
}
export function getSectionDef(card: CardDef, sectionId: string): SectionDef {
  const s = card.sections.find((x) => x.id === sectionId);
  if (!s) throw new Error(`unknown section ${sectionId} on card ${card.id}`);
  return s;
}

/** Entry zones of a card (bottom band). At least one; up to two (left/right). */
export function entrySectionsOf(card: CardDef): SectionDef[] {
  return card.sections.filter((s) => s.row === 'entry');
}

/** Deterministic single entry (setup / fallback landing). */
export function primaryEntry(card: CardDef): SectionDef {
  const e = entrySectionsOf(card)[0];
  if (!e) throw new Error(`card ${card.id} has no entry section`);
  return e;
}

/**
 * Where a hero lands when arriving from the brick below via a given exit side.
 * A card entered through its left brick is met from the lower-right, so the
 * right-hand entry (if any) is chosen; else the primary entry.
 */
export function entryLanding(card: CardDef, fromSide: Side): SectionDef {
  const wantCol: Col = fromSide === 'left' ? 'right' : 'left';
  return entrySectionsOf(card).find((e) => e.col === wantCol) ?? primaryEntry(card);
}

/** Section ids that carry a live exit (a top zone may have none). */
export function exitSectionIds(card: CardDef): Set<string> {
  return new Set(card.topExits.map((e) => e.section));
}

/** Section edges a hero may walk normally (barrier `requires` edges excluded). */
export function normalEdges(card: CardDef): { a: string; b: string }[] {
  return card.sectionEdges.filter((e) => e.requires === undefined);
}

/**
 * Grid cell of the brick above `(row,col)` on the given side. Rows stagger by
 * +0.5 (see board geometry), so the two bricks straddling a card are at col-1
 * (up-left) and col (up-right) of the next row.
 */
export function brickAbove(row: number, col: number, side: Side): { row: number; col: number } {
  return { row: row + 1, col: side === 'left' ? col - 1 : col };
}

/** Barrier requirements every hero can meet with no item (basic athletics). */
export const BASIC_BARRIERS = new Set(['climb', 'jump']);
export const canCrossBarrier = (requires: string): boolean => BASIC_BARRIERS.has(requires);

/** Can a hero pass through this exit? Walled ⇒ no; open ⇒ yes; a door ⇒ only once opened; permanent ⇒ never. */
export function isExitCrossable(exit: { blocker?: { openable: boolean } }, opened: boolean, walled: boolean): boolean {
  if (walled) return false;
  if (!exit.blocker) return true;
  return exit.blocker.openable && opened;
}
