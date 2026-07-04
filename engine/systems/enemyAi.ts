import type { Ctx } from '../ctx';
import { getEnemyDef } from '../model/content';
import type { EnemyInstance, HeroInstance } from '../model/state';
import { enemiesOn, getCard, livingHeroes } from '../model/state';
import { enemyAttack } from './combat';
import { distancesFrom, posKey, stepToward } from './graph';

/**
 * Reactive enemy AI (project.md):
 *  - targeting: nearest DETECTED hero; tie → first in play order
 *  - action by card alert: ≥2 & same section → attack; 3 → move toward target;
 *    2 → investigate (move toward nearest detected hero); ≤1 → idle
 * Sleepers never act.
 */

function detectedHeroes(ctx: Ctx): HeroInstance[] {
  return livingHeroes(ctx.draft).filter((h) => h.detected);
}

/** Nearest detected hero from an enemy position; tie → lowest hero idx. */
function pickTarget(ctx: Ctx, enemy: EnemyInstance): { hero: HeroInstance; distance: number } | undefined {
  const dist = distancesFrom(ctx.content, ctx.draft, { cardId: enemy.cardId, section: enemy.section });
  let best: { hero: HeroInstance; distance: number } | undefined;
  for (const hero of detectedHeroes(ctx)) {
    const d = dist.get(posKey({ cardId: hero.cardId, section: hero.section }));
    if (d === undefined) continue;
    if (!best || d < best.distance) best = { hero, distance: d };
  }
  return best;
}

export function enemyAct(ctx: Ctx, enemyId: string): void {
  const enemy = ctx.draft.enemies[enemyId];
  if (!enemy || enemy.acted || enemy.sleeper) return;
  if (ctx.draft.outcome) return;

  const alert = getCard(ctx.draft, enemy.cardId).alert;
  const target = pickTarget(ctx, enemy);

  if (alert >= 2 && target && target.distance === 0) {
    ctx.emit({ kind: 'EnemyActed', enemyId, action: 'attack' });
    enemyAttack(ctx, enemy, target.hero.idx);
    return;
  }
  if (alert >= 2 && target) {
    // alert 3 hunts; alert 2 investigates — both step toward the target
    const step = stepToward(
      ctx.content,
      ctx.draft,
      { cardId: enemy.cardId, section: enemy.section },
      { cardId: target.hero.cardId, section: target.hero.section },
    );
    if (step) {
      ctx.emit({ kind: 'EnemyActed', enemyId, action: alert === 3 ? 'move' : 'investigate' });
      ctx.emit({ kind: 'EnemyMoved', enemyId, cardId: step.cardId, section: step.section });
      // arriving in the target's section at high alert: attack immediately at alert 3
      if (alert === 3 && step.cardId === target.hero.cardId && step.section === target.hero.section) {
        enemyAttack(ctx, ctx.draft.enemies[enemyId] ?? enemy, target.hero.idx);
      }
      return;
    }
  }
  ctx.emit({ kind: 'EnemyActed', enemyId, action: 'idle' });
}

/** Priority: INI desc → closer to a detected hero → id. */
function priorityOrder(ctx: Ctx, enemies: EnemyInstance[]): EnemyInstance[] {
  const scored = enemies.map((e) => {
    const target = pickTarget(ctx, e);
    return { e, ini: getEnemyDef(ctx.content, e.defId).ini, dist: target ? target.distance : Number.MAX_SAFE_INTEGER };
  });
  scored.sort((a, b) => b.ini - a.ini || a.dist - b.dist || a.e.id.localeCompare(b.e.id));
  return scored.map((s) => s.e);
}

/** Trigger: one enemy on the card resolves (hero entered/exited a section). */
export function resolveOneEnemyReaction(ctx: Ctx, cardId: string): void {
  const candidates = enemiesOn(ctx.draft, cardId).filter((e) => !e.acted && !e.sleeper);
  const first = priorityOrder(ctx, candidates)[0];
  if (first) enemyAct(ctx, first.id);
}

/** Round end: all remaining unacted awake enemies resolve. */
export function roundEndEnemyPhase(ctx: Ctx): void {
  // wake sleepers on cards that reached alert ≥2
  for (const e of Object.values(ctx.draft.enemies).sort((a, b) => a.id.localeCompare(b.id))) {
    if (e.sleeper && getCard(ctx.draft, e.cardId).alert >= 2) {
      ctx.emit({ kind: 'EnemyWoke', enemyId: e.id });
    }
  }
  // resolve in priority order, re-evaluating after each act
  for (;;) {
    if (ctx.draft.outcome) return;
    const pending = Object.values(ctx.draft.enemies).filter((e) => !e.acted && !e.sleeper);
    const next = priorityOrder(ctx, pending)[0];
    if (!next) return;
    enemyAct(ctx, next.id);
  }
}
