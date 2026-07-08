/**
 * Content pipeline: YAML sources → zod validation → cross-reference checks →
 * frozen JSON (content/content.json + public/content.json for the app).
 * Build FAILS on any schema or coverage error — no silent fallbacks.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';
import { z } from 'zod';
import {
  CardDefSchema,
  ContentDBSchema,
  EnemyDefSchema,
  HeroClassDefSchema,
  MysteryTokenDefSchema,
  ScenarioDefSchema,
  StoryCardDefSchema,
  SymbolCardDefSchema,
  entrySectionsOf,
  exitSectionIds,
  normalEdges,
  type CardDef,
  type ContentDB,
} from '../engine/index';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');

const FileSchema = z.object({
  cards: z.array(CardDefSchema).optional(),
  enemies: z.array(EnemyDefSchema).optional(),
  heroes: z.array(HeroClassDefSchema).optional(),
  mysteryTokens: z.array(MysteryTokenDefSchema).optional(),
  symbolCards: z.array(SymbolCardDefSchema).optional(),
  storyCards: z.array(StoryCardDefSchema).optional(),
  scenarios: z.array(ScenarioDefSchema).optional(),
});

function* yamlFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* yamlFiles(full);
    else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) yield full;
  }
}

const errors: string[] = [];
const fail = (msg: string): void => {
  errors.push(msg);
};

// ---- collect + schema-validate ----
const db: ContentDB = { cards: {}, enemies: {}, heroes: {}, mysteryTokens: {}, symbolCards: {}, storyCards: {}, scenarios: {} };

function addAll<T extends { id: string }>(target: Record<string, T>, items: T[] | undefined, kind: string, file: string): void {
  for (const item of items ?? []) {
    if (target[item.id]) fail(`${file}: duplicate ${kind} id '${item.id}'`);
    target[item.id] = item;
  }
}

for (const file of yamlFiles(contentDir)) {
  const rel = file.slice(root.length + 1);
  const parsed = FileSchema.safeParse(parseYaml(readFileSync(file, 'utf8')));
  if (!parsed.success) {
    fail(`${rel}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    continue;
  }
  const data = parsed.data;
  addAll(db.cards, data.cards, 'card', rel);
  addAll(db.enemies, data.enemies, 'enemy', rel);
  addAll(db.heroes, data.heroes, 'hero', rel);
  addAll(db.mysteryTokens, data.mysteryTokens, 'mystery token', rel);
  addAll(db.symbolCards, data.symbolCards, 'symbol card', rel);
  addAll(db.storyCards, data.storyCards, 'story card', rel);
  addAll(db.scenarios, data.scenarios, 'scenario', rel);
}

// ---- cross-reference + structural checks ----
function checkCard(card: CardDef): void {
  const sectionIds = new Set(card.sections.map((s) => s.id));
  if (sectionIds.size !== card.sections.length) fail(`card ${card.id}: duplicate section ids`);
  for (const e of card.sectionEdges) {
    if (!sectionIds.has(e.a) || !sectionIds.has(e.b)) fail(`card ${card.id}: edge ${e.a}-${e.b} references unknown section`);
  }

  const entries = entrySectionsOf(card);
  if (entries.length < 1 || entries.length > 2) fail(`card ${card.id}: must have 1-2 entry zones (has ${entries.length})`);
  if (card.topExits.length === 0) fail(`card ${card.id}: no forward exit`);
  for (const exit of card.topExits) {
    const sec = card.sections.find((s) => s.id === exit.section);
    if (!sec) fail(`card ${card.id}: exit section '${exit.section}' missing`);
    else if (sec.row !== 'exit') fail(`card ${card.id}: exit anchors to non-exit zone '${exit.section}' (row=${sec.row})`);
  }

  for (const s of card.sections) {
    if (s.ambush && !s.hiding) fail(`card ${card.id}: zone '${s.id}' has an ambush but is not a hiding zone`);
    if (s.ambush && !db.enemies[s.ambush.enemy]) fail(`card ${card.id}: zone '${s.id}' ambush references unknown enemy '${s.ambush.enemy}'`);
  }
  // one full-width zone per row, or up to one left + one right — no mixing
  for (const row of ['entry', 'core', 'exit'] as const) {
    const inRow = card.sections.filter((s) => s.row === row);
    if (inRow.length > 1 && inRow.some((s) => s.col === 'full'))
      fail(`card ${card.id}: row '${row}' mixes a full-width zone with others`);
    if (inRow.filter((s) => s.col === 'left').length > 1 || inRow.filter((s) => s.col === 'right').length > 1)
      fail(`card ${card.id}: row '${row}' has duplicate left/right zones`);
  }

  for (const spawn of card.spawns) {
    if (!db.enemies[spawn.enemy]) fail(`card ${card.id}: spawn references unknown enemy '${spawn.enemy}'`);
    if (!sectionIds.has(spawn.section)) fail(`card ${card.id}: spawn section '${spawn.section}' missing`);
  }

  // Connectivity over NORMAL edges only (barrier `requires` edges excluded, so an
  // overpass's two halves stay separate components). Rule: every connected
  // component must contain ≥1 entry zone AND ≥1 zone with a live exit. That single
  // check enforces: no orphan zones, no dead ends, and every entry reaches an exit.
  const adj = new Map<string, string[]>(card.sections.map((s) => [s.id, [] as string[]]));
  for (const e of normalEdges(card)) {
    adj.get(e.a)?.push(e.b);
    adj.get(e.b)?.push(e.a);
  }
  const entryIds = new Set(entries.map((s) => s.id));
  const exitIds = exitSectionIds(card);
  const visited = new Set<string>();
  for (const start of card.sections) {
    if (visited.has(start.id)) continue;
    const comp: string[] = [];
    const stack = [start.id];
    visited.add(start.id);
    while (stack.length > 0) {
      const cur = stack.pop();
      if (cur === undefined) break;
      comp.push(cur);
      for (const n of adj.get(cur) ?? []) {
        if (!visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      }
    }
    if (!comp.some((id) => entryIds.has(id))) fail(`card ${card.id}: zones [${comp.join(',')}] unreachable from any entry`);
    if (!comp.some((id) => exitIds.has(id))) fail(`card ${card.id}: zones [${comp.join(',')}] cannot reach an exit (dead end)`);
  }
}

for (const card of Object.values(db.cards)) checkCard(card);

for (const token of Object.values(db.mysteryTokens)) {
  if (token.payload.kind === 'rune' && !db.symbolCards[token.payload.symbolCard])
    fail(`mystery token ${token.id}: rune references unknown symbol card '${token.payload.symbolCard}'`);
  if (token.payload.kind === 'rune' && token.symbol !== 'rune') fail(`mystery token ${token.id}: rune payload but symbol=${token.symbol}`);
  if (token.payload.kind !== 'rune' && token.symbol === 'rune') fail(`mystery token ${token.id}: symbol=rune but payload=${token.payload.kind}`);
}

for (const scenario of Object.values(db.scenarios)) {
  const sid = scenario.id;
  if (!db.cards[scenario.startCard]) fail(`scenario ${sid}: unknown startCard '${scenario.startCard}'`);
  for (const [tier, pool] of Object.entries(scenario.tilePools)) {
    for (const cardId of pool) {
      const card = db.cards[cardId];
      if (!card) fail(`scenario ${sid}: tile pool ${tier} references unknown card '${cardId}'`);
      else if (`tier${card.tier}` !== tier) fail(`scenario ${sid}: card '${cardId}' (tier ${card.tier}) in ${tier} pool`);
      else if (card.biome !== scenario.startBiome) fail(`scenario ${sid}: card '${cardId}' biome ${card.biome} ≠ ${scenario.startBiome}`);
    }
  }
  for (const enemyId of scenario.encounterPool) {
    if (!db.enemies[enemyId]) fail(`scenario ${sid}: encounter pool references unknown enemy '${enemyId}'`);
  }
  for (const [tier, pool] of Object.entries(scenario.mysteryPools)) {
    for (const tokenId of pool) {
      const token = db.mysteryTokens[tokenId];
      if (!token) fail(`scenario ${sid}: mystery pool ${tier} references unknown token '${tokenId}'`);
      else if (`tier${token.tier}` !== tier) fail(`scenario ${sid}: token '${tokenId}' (tier ${token.tier}) in ${tier} pool`);
    }
  }
  for (const phase of scenario.phases) {
    for (const cardId of phase.deck) {
      if (!db.storyCards[cardId]) fail(`scenario ${sid}: phase '${phase.id}' references unknown story card '${cardId}'`);
    }
  }
  const allStory = scenario.phases.flatMap((p) => p.deck);
  if (!allStory.some((id) => db.storyCards[id]?.type === 'RESOLUTION'))
    fail(`scenario ${sid}: no RESOLUTION story card in any phase deck (advance path missing)`);
  const clueCount = allStory.filter((id) => db.storyCards[id]?.type === 'CLUE').length;
  const poolClues = [...scenario.mysteryPools.tier1, ...scenario.mysteryPools.tier2].filter(
    (id) => db.mysteryTokens[id]?.payload.kind === 'clue',
  ).length;
  if (clueCount + poolClues < 3) fail(`scenario ${sid}: fewer than 3 clue sources (${clueCount} story + ${poolClues} tokens)`);
}

if (errors.length > 0) {
  console.error(`content build FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// final full-schema parse (belt and braces before freezing)
const frozen = ContentDBSchema.parse(db);
const json = JSON.stringify(frozen, null, 2);
writeFileSync(join(contentDir, 'content.json'), json);
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'content.json'), json);

console.log(
  `content build OK: ${Object.keys(frozen.cards).length} cards, ${Object.keys(frozen.enemies).length} enemies, ` +
    `${Object.keys(frozen.heroes).length} heroes, ${Object.keys(frozen.mysteryTokens).length} tokens, ` +
    `${Object.keys(frozen.symbolCards).length} symbols, ${Object.keys(frozen.storyCards).length} story cards, ` +
    `${Object.keys(frozen.scenarios).length} scenario(s)`,
);
