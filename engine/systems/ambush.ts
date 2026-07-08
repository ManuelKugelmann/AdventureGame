import { config } from '../config';
import type { Ctx } from '../ctx';
import { getCardDef, getSectionDef } from '../model/content';
import { getCard, getHero } from '../model/state';
import { raiseAlertFloor } from './alert';
import { detectHero } from './detection';
import { resolveOneEnemyReaction } from './enemyAi';
import { adjacentSections, enemyCapReached } from './graph';

/**
 * A hero just entered a zone. Any adjacent hiding zone that still conceals an
 * unsprung ambusher rolls once: on a hit the ambusher spawns awake in the nook,
 * the hero is detected and alert jumps, and the ambusher reacts immediately.
 * The nook is marked resolved either way, so it springs at most once.
 */
export function checkAmbushes(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const card = getCard(ctx.draft, hero.cardId);
  const def = getCardDef(ctx.content, card.defId);
  for (const nook of adjacentSections(ctx.content, ctx.draft, hero.cardId, hero.section)) {
    const sec = getSectionDef(def, nook);
    if (!sec.hiding || !sec.ambush) continue;
    if (getCard(ctx.draft, card.id).sprungAmbushes.includes(nook)) continue;
    const chance = sec.ambush.chancePct ?? config.ambush.defaultChancePct;
    const sprung = ctx.rng.chancePct(chance) && !enemyCapReached(ctx.draft);
    const enemyId = sprung ? `e${ctx.draft.nextId}` : null;
    if (enemyId !== null) {
      ctx.emit({ kind: 'EnemySpawned', enemyId, defId: sec.ambush.enemy, cardId: card.id, section: nook, sleeper: false });
    }
    ctx.emit({ kind: 'AmbushResolved', cardId: card.id, section: nook, enemyId });
    if (enemyId !== null) {
      detectHero(ctx, heroIdx, 'ambush');
      raiseAlertFloor(ctx, card.id, config.alert.floorZoneShare, 'ambush sprung');
      resolveOneEnemyReaction(ctx, card.id);
    }
  }
}
