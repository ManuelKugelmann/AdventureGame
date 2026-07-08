import { config } from '../config';
import type { Ctx } from '../ctx';
import { enemiesIn, enemiesOn, getHero } from '../model/state';
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
 * Consequences of a hero arriving openly (normal move or exit crossing — NOT a
 * successful stealth move). Heroes are in the open by default, so any open
 * arrival leaves the hero detected. Alert only rises / enemies only react when
 * there's a witness — an awake enemy on the card; moving openly through empty
 * rooms stays calm.
 */
export function afterHeroEnters(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  detectHero(ctx, heroIdx, 'in the open'); // exposed by default

  if (awakeEnemiesIn(ctx, hero.cardId, hero.section).length > 0) {
    raiseAlertFloor(ctx, hero.cardId, config.alert.floorZoneShare, 'zone-share with committed enemy');
  }
  const witnesses = enemiesOn(ctx.draft, hero.cardId).some((e) => !e.sleeper);
  if (witnesses) {
    raiseAlertFloor(ctx, hero.cardId, config.alert.floorUnstealthedMove, 'seen in the open');
    resolveOneEnemyReaction(ctx, hero.cardId);
  }
}

/** One enemy on the departed card reacts when a detected hero leaves it. */
export function beforeHeroExitsCard(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  if (hero.detected) resolveOneEnemyReaction(ctx, hero.cardId);
}
