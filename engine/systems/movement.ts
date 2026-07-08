import { config } from '../config';
import type { Ctx } from '../ctx';
import { brickAbove, entryLanding, getCardDef, getHeroClassDef, getScenarioDef, getSectionDef, isExitCrossable } from '../model/content';
import { getCard, getHero, gridKey } from '../model/state';
import { rollDice } from '../rng';
import { raiseAlertFloor } from './alert';
import { adjacentSections, sectionBlocked, sectionFull } from './graph';
import { afterHeroEnters, awakeEnemiesIn, beforeHeroExitsCard, detectHero } from './detection';
import { resolveOneEnemyReaction } from './enemyAi';
import { checkAmbushes } from './ambush';

/** Normal (unstealthed) section-to-section move. 1 AP. */
export function moveSection(ctx: Ctx, heroIdx: number, toSection: string): void {
  const hero = getHero(ctx.draft, heroIdx);
  if (!adjacentSections(ctx.content, ctx.draft, hero.cardId, hero.section).includes(toSection))
    throw new Error(`MoveSection: ${toSection} not adjacent to ${hero.section}`);
  if (sectionBlocked(ctx.content, ctx.draft, hero.cardId, toSection))
    throw new Error(`MoveSection: section ${toSection} is chokepoint-blocked`);
  if (sectionFull(ctx.content, ctx.draft, hero.cardId, toSection))
    throw new Error(`MoveSection: section ${toSection} is at occupant capacity`);
  ctx.emit({ kind: 'ApSpent', heroIdx, amount: config.costs.moveSection });
  ctx.emit({ kind: 'Moved', heroIdx, cardId: hero.cardId, section: toSection });
  afterHeroEnters(ctx, heroIdx);
  checkAmbushes(ctx, heroIdx);
  peekFromZone(ctx, heroIdx);
}

/**
 * Cross a top exit. Unexplored exits draw + place a card from the tile pool
 * (bricklaying: row+1, col+dCol; occupied target ⇒ passage links to the
 * existing card). Pool exhausted ⇒ the exit is walled (AP spent scouting).
 * Heroes reset to hidden on card transition.
 */
export function crossExit(ctx: Ctx, heroIdx: number, exitIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const card = getCard(ctx.draft, hero.cardId);
  const def = getCardDef(ctx.content, card.defId);
  const exit = def.topExits[exitIdx];
  if (!exit) throw new Error(`CrossExit: card ${card.defId} has no exit ${exitIdx}`);
  if (exit.section !== hero.section) throw new Error(`CrossExit: hero not in exit section ${exit.section}`);
  if (card.blockedExits.includes(exitIdx)) throw new Error('CrossExit: exit is walled');
  if (!isExitCrossable(exit, card.openedExits.includes(exitIdx), false))
    throw new Error(`CrossExit: blocked by ${exit.blocker?.label ?? 'a blocker'}`);

  ctx.emit({ kind: 'ApSpent', heroIdx, amount: config.costs.crossExit });

  let targetCardId = card.exploredExits[exitIdx];
  if (targetCardId === undefined) {
    targetCardId = exploreExit(ctx, card.id, exitIdx);
    if (targetCardId === undefined) return; // walled — nothing beyond
  }

  const wasDetected = getHero(ctx.draft, heroIdx).detected;
  beforeHeroExitsCard(ctx, heroIdx);
  const entry = entryLanding(getCardDef(ctx.content, getCard(ctx.draft, targetCardId).defId), exit.side).id;
  ctx.emit({ kind: 'Moved', heroIdx, cardId: targetCardId, section: entry });
  if (wasDetected) ctx.emit({ kind: 'HeroHidden', heroIdx }); // reset to hidden on card transition
  afterHeroEnters(ctx, heroIdx);
  checkAmbushes(ctx, heroIdx);
  peekFromZone(ctx, heroIdx);
}

/**
 * Auto-peek: standing in an exit's zone reveals (and fully populates) the card
 * beyond any exit there that isn't blocked by a shut door — the design's
 * see-ahead. Blocked exits stay hidden until deliberately peeked through.
 */
export function peekFromZone(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const card = getCard(ctx.draft, hero.cardId);
  const def = getCardDef(ctx.content, card.defId);
  def.topExits.forEach((exit, exitIdx) => {
    if (exit.section !== hero.section) return; // only exits in this zone
    if (exit.blocker && !card.openedExits.includes(exitIdx)) return; // shut door / permanent
    if (card.blockedExits.includes(exitIdx)) return; // walled
    if (card.exploredExits[exitIdx] !== undefined) return; // already revealed
    if (exploreExit(ctx, card.id, exitIdx) !== undefined)
      ctx.emit({ kind: 'ExitPeeked', cardId: card.id, exitIdx, throughBlocker: false });
  });
}

/** Peek through a blocker (keyhole / crack): reveal beyond without opening it. Costs an inspect. */
export function peekExit(ctx: Ctx, heroIdx: number, exitIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const card = getCard(ctx.draft, hero.cardId);
  const exit = getCardDef(ctx.content, card.defId).topExits[exitIdx];
  if (!exit) throw new Error(`PeekExit: no exit ${exitIdx}`);
  if (exit.section !== hero.section) throw new Error('PeekExit: hero not at the exit');
  if (!exit.blocker) throw new Error('PeekExit: no blocker to peek through');
  if (card.blockedExits.includes(exitIdx)) throw new Error('PeekExit: exit is walled');
  if (card.exploredExits[exitIdx] !== undefined) throw new Error('PeekExit: already revealed');
  ctx.emit({ kind: 'ApSpent', heroIdx, amount: config.costs.inspect });
  if (exploreExit(ctx, card.id, exitIdx) !== undefined)
    ctx.emit({ kind: 'ExitPeeked', cardId: card.id, exitIdx, throughBlocker: true });
}

/** Open an openable door so it can be crossed; reveals beyond automatically. */
export function openExit(ctx: Ctx, heroIdx: number, exitIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const card = getCard(ctx.draft, hero.cardId);
  const exit = getCardDef(ctx.content, card.defId).topExits[exitIdx];
  if (!exit) throw new Error(`OpenExit: no exit ${exitIdx}`);
  if (exit.section !== hero.section) throw new Error('OpenExit: hero not at the exit');
  if (!exit.blocker?.openable) throw new Error('OpenExit: nothing openable here');
  if (card.openedExits.includes(exitIdx)) throw new Error('OpenExit: already open');
  ctx.emit({ kind: 'ApSpent', heroIdx, amount: config.costs.crossExit });
  ctx.emit({ kind: 'ExitOpened', cardId: card.id, exitIdx });
  peekFromZone(ctx, heroIdx); // an opened door reveals what's beyond
}

/** Shut an opened door again (e.g. to block pursuers). The card beyond stays revealed. */
export function closeExit(ctx: Ctx, heroIdx: number, exitIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const card = getCard(ctx.draft, hero.cardId);
  const exit = getCardDef(ctx.content, card.defId).topExits[exitIdx];
  if (!exit) throw new Error(`CloseExit: no exit ${exitIdx}`);
  if (exit.section !== hero.section) throw new Error('CloseExit: hero not at the exit');
  if (!exit.blocker?.openable) throw new Error('CloseExit: nothing closeable here');
  if (!card.openedExits.includes(exitIdx)) throw new Error('CloseExit: already shut');
  ctx.emit({ kind: 'ApSpent', heroIdx, amount: config.costs.crossExit });
  ctx.emit({ kind: 'ExitClosed', cardId: card.id, exitIdx });
}

/** Reveal what lies beyond an unexplored exit. Returns the card id, or undefined if walled. */
function exploreExit(ctx: Ctx, fromCardId: string, exitIdx: number): string | undefined {
  const card = getCard(ctx.draft, fromCardId);
  const def = getCardDef(ctx.content, card.defId);
  const exit = def.topExits[exitIdx];
  if (!exit) throw new Error(`exploreExit: no exit ${exitIdx}`);
  const { row, col } = brickAbove(card.row, card.col, exit.side);

  const existing = ctx.draft.grid[gridKey(row, col)];
  if (existing !== undefined) {
    ctx.emit({ kind: 'ExitLinked', cardId: fromCardId, exitIdx, toCardId: existing });
    return existing;
  }

  const scenario = getScenarioDef(ctx.content, ctx.draft.setup.scenarioId);
  let tier: 1 | 2 = row >= scenario.tier2FromRow ? 2 : 1;
  if (tier === 2 && ctx.draft.tilePools.tier2.length === 0) tier = 1; // declared fallback: deep rows reuse tier 1
  const pool = tier === 1 ? ctx.draft.tilePools.tier1 : ctx.draft.tilePools.tier2;
  const defId = pool[0];
  if (defId === undefined) {
    ctx.emit({ kind: 'ExitWalled', cardId: fromCardId, exitIdx });
    return undefined;
  }

  ctx.emit({ kind: 'TilePoolDrawn', tier, defId });
  const newCardId = `c${ctx.draft.nextId}`;
  ctx.emit({ kind: 'CardPlaced', cardId: newCardId, defId, row, col, fromCardId, exitIdx });
  const newDef = getCardDef(ctx.content, defId);
  for (const spawn of newDef.spawns) {
    const enemyId = `e${ctx.draft.nextId}`;
    ctx.emit({ kind: 'EnemySpawned', enemyId, defId: spawn.enemy, cardId: newCardId, section: spawn.section, sleeper: spawn.sleeper });
  }
  return newCardId;
}

/**
 * Stealth move along a route within the current card. 1 AP for the attempt;
 * budget = hits − alertPenalty[alert] + stealth skill; entering a section
 * costs by cover (covered 0 / partial 1 / open 2). Failing mid-route =
 * commit-and-fail: advance to the last affordable section, detected there.
 */
export function stealthMove(ctx: Ctx, heroIdx: number, route: string[]): void {
  const hero = getHero(ctx.draft, heroIdx);
  if (hero.detected) throw new Error('StealthMove: hero is not hidden');
  const card = getCard(ctx.draft, hero.cardId);
  const def = getCardDef(ctx.content, card.defId);

  // validate route: chained adjacency, no chokepoint-blocked sections
  let cur = hero.section;
  for (const step of route) {
    if (!adjacentSections(ctx.content, ctx.draft, hero.cardId, cur).includes(step))
      throw new Error(`StealthMove: ${step} not adjacent to ${cur}`);
    if (sectionBlocked(ctx.content, ctx.draft, hero.cardId, step))
      throw new Error(`StealthMove: section ${step} is chokepoint-blocked`);
    cur = step;
  }
  const dest = route[route.length - 1];
  if (dest !== undefined && sectionFull(ctx.content, ctx.draft, hero.cardId, dest))
    throw new Error(`StealthMove: destination ${dest} is at occupant capacity`);

  ctx.emit({ kind: 'ApSpent', heroIdx, amount: config.costs.moveSection });

  const heroClass = getHeroClassDef(ctx.content, hero.classId);
  const roll = rollDice(ctx.rng, config.stealth.dice);
  const penalty = config.stealth.alertPenalty[card.alert];
  if (penalty === undefined) throw new Error(`invariant: alert ${card.alert} out of range`);
  const budget = roll.hits - penalty + heroClass.skills.stealth;

  const costs = route.map((s) => config.stealth.sectionCost[getSectionDef(def, s).cover]);
  let spent = 0;
  let reached = 0;
  if (roll.hits > 0) {
    // 0 hits on any roll = auto-fail (stay put, detected)
    for (let i = 0; i < route.length; i++) {
      const c = costs[i];
      if (c === undefined) throw new Error('invariant: missing cost');
      if (spent + c > budget) break;
      spent += c;
      reached = i + 1;
    }
  }
  const success = roll.hits > 0 && reached === route.length;
  ctx.emit({ kind: 'StealthRolled', heroIdx, roll, budget, cost: costs.reduce<number>((a, b) => a + b, 0), success });

  const finalSection = reached > 0 ? route[reached - 1] : hero.section;
  if (finalSection === undefined) throw new Error('invariant: no final section');
  if (reached > 0) ctx.emit({ kind: 'Moved', heroIdx, cardId: hero.cardId, section: finalSection });

  if (!success) {
    detectHero(ctx, heroIdx, 'stealth fail');
    raiseAlertFloor(ctx, hero.cardId, config.alert.floorUnstealthedMove, 'stealth fail');
    resolveOneEnemyReaction(ctx, hero.cardId);
  } else if (awakeEnemiesIn(ctx, hero.cardId, finalSection).length > 0) {
    // slipping past is fine; ending in an enemy's zone is not
    detectHero(ctx, heroIdx, 'zone-share');
    raiseAlertFloor(ctx, hero.cardId, config.alert.floorZoneShare, 'zone-share with committed enemy');
    resolveOneEnemyReaction(ctx, hero.cardId);
  }
  if (reached > 0) {
    checkAmbushes(ctx, heroIdx); // moving near a nook can spring it
    peekFromZone(ctx, heroIdx);
  }
}

/** Re-hide: 1 AP + stealth roll; needs no awake enemy in the section. */
export function reHide(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  if (!hero.detected) throw new Error('ReHide: hero already hidden');
  if (awakeEnemiesIn(ctx, hero.cardId, hero.section).length > 0)
    throw new Error('ReHide: enemy in section');
  ctx.emit({ kind: 'ApSpent', heroIdx, amount: config.costs.reHide });

  const heroClass = getHeroClassDef(ctx.content, hero.classId);
  const card = getCard(ctx.draft, hero.cardId);
  const roll = rollDice(ctx.rng, config.stealth.dice);
  const penalty = config.stealth.alertPenalty[card.alert];
  if (penalty === undefined) throw new Error(`invariant: alert ${card.alert} out of range`);
  const budget = roll.hits - penalty + heroClass.skills.stealth;
  const success = roll.hits > 0 && budget >= 1;
  ctx.emit({ kind: 'StealthRolled', heroIdx, roll, budget, cost: 1, success });
  if (success) ctx.emit({ kind: 'HeroHidden', heroIdx });
}
