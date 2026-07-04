import { config } from '../config';
import type { Ctx } from '../ctx';
import { getCardDef, getSectionDef } from '../model/content';
import { enemiesIn, getCard, getHero } from '../model/state';
import { raiseAlertFloor } from './alert';
import { resolveOneEnemyReaction } from './enemyAi';

/** Awake (non-sleeper) enemies in a section. */
export function awakeEnemiesIn(ctx: Ctx, cardId: string, section: string) {
  return enemiesIn(ctx.draft, cardId, section).filter((e) => !e.sleeper);
}

export function detectHero(ctx: Ctx, heroIdx: number, reason: string): void {
  const hero = getHero(ctx.draft, heroIdx);
  if (!hero.detected) ctx.emit({ kind: 'HeroDetected', heroIdx, reason });
}

/**
 * Shared consequences of a hero arriving in a section (normal move or exit
 * crossing — NOT a successful stealth move):
 *  - zone-share with a committed (awake) enemy ⇒ detected + alert floor 2
 *  - open section at alert ≥2 while hidden ⇒ detected
 *  - if the hero is detected: unstealthed movement ⇒ alert floor 1, and one
 *    enemy on the card gets a reaction.
 */
export function afterHeroEnters(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const card = getCard(ctx.draft, hero.cardId);
  const def = getCardDef(ctx.content, card.defId);
  const section = getSectionDef(def, hero.section);

  if (awakeEnemiesIn(ctx, hero.cardId, hero.section).length > 0) {
    detectHero(ctx, heroIdx, 'zone-share');
    raiseAlertFloor(ctx, hero.cardId, config.alert.floorZoneShare, 'zone-share with committed enemy');
  }
  if (!hero.detected && section.cover === 'open' && card.alert >= 2) {
    detectHero(ctx, heroIdx, 'open section at high alert');
  }
  if (getHero(ctx.draft, heroIdx).detected) {
    raiseAlertFloor(ctx, hero.cardId, config.alert.floorUnstealthedMove, 'unstealthed movement');
    resolveOneEnemyReaction(ctx, hero.cardId);
  }
}

/** One enemy on the departed card reacts when a detected hero leaves it. */
export function beforeHeroExitsCard(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  if (hero.detected) resolveOneEnemyReaction(ctx, hero.cardId);
}
