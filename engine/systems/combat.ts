import { config } from '../config';
import type { Ctx } from '../ctx';
import { getCardDef, getEnemyDef, getHeroClassDef, getSectionDef } from '../model/content';
import type { EnemyInstance } from '../model/state';
import { getCard, getEnemy, getHero, livingHeroes } from '../model/state';
import { rollDice } from '../rng';
import { raiseAlertFloor } from './alert';
import { detectHero } from './detection';

/** DEF modifier from the cover of a section on a card instance. */
function coverDefMod(ctx: Ctx, cardId: string, section: string): number {
  const def = getCardDef(ctx.content, getCard(ctx.draft, cardId).defId);
  return config.combat.coverDefMod[getSectionDef(def, section).cover];
}

/**
 * Hero attack: spend X AP ⇒ roll X dice + combat skill (+1 from hidden first
 * strike). net = hits − (enemy DEF + cover). Each net hit advances the enemy
 * state token; past the last state = defeated. 0 hits on the roll = auto-fail.
 */
export function heroAttack(ctx: Ctx, heroIdx: number, targetId: string, ap: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const target = getEnemy(ctx.draft, targetId);
  const enemyDef = getEnemyDef(ctx.content, target.defId);
  const heroClass = getHeroClassDef(ctx.content, hero.classId);

  const wasHidden = !hero.detected;
  const diceCount = Math.max(1, ap + heroClass.skills.combat + (wasHidden ? config.combat.hiddenStrikeBonusDice : 0));
  ctx.emit({ kind: 'ApSpent', heroIdx, amount: ap });

  const roll = rollDice(ctx.rng, diceCount);
  const enemyState = enemyDef.states[target.stateIdx];
  if (!enemyState) throw new Error(`invariant: enemy ${targetId} stateIdx ${target.stateIdx} out of range`);
  const defTotal = enemyState.def + coverDefMod(ctx, target.cardId, target.section);
  const netHits = roll.hits === 0 ? 0 : Math.max(0, roll.hits - Math.max(0, defTotal));
  ctx.emit({ kind: 'AttackRolled', heroIdx, targetId, roll, netHits });

  // attacking is loud: attacker is detected regardless of outcome
  detectHero(ctx, heroIdx, 'attacked');

  if (netHits > 0) {
    // damaging an enemy on the card ⇒ alert floor 3, and sleepers wake
    if (target.sleeper) ctx.emit({ kind: 'EnemyWoke', enemyId: targetId });
    raiseAlertFloor(ctx, target.cardId, config.alert.floorEnemyDamaged, 'enemy damaged');
    const toStateIdx = target.stateIdx + netHits;
    if (toStateIdx >= enemyDef.states.length) {
      ctx.emit({ kind: 'EnemyDefeated', enemyId: targetId });
    } else {
      ctx.emit({ kind: 'EnemyStateSwapped', enemyId: targetId, fromStateIdx: target.stateIdx, toStateIdx });
    }
  }
}

/** Enemy attacks a hero: roll atkDice; net = hits − hero cover DEF. */
export function enemyAttack(ctx: Ctx, enemy: EnemyInstance, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const enemyDef = getEnemyDef(ctx.content, enemy.defId);
  const enemyState = enemyDef.states[enemy.stateIdx];
  if (!enemyState) throw new Error(`invariant: enemy ${enemy.id} stateIdx out of range`);

  const roll = rollDice(ctx.rng, enemyState.atkDice);
  const defMod = coverDefMod(ctx, hero.cardId, hero.section);
  const netHits = roll.hits === 0 ? 0 : Math.max(0, roll.hits - defMod);
  ctx.emit({ kind: 'EnemyAttackRolled', enemyId: enemy.id, heroIdx, roll, netHits });

  if (netHits > 0) {
    const dmg = netHits * config.enemy.damagePerNetHit;
    ctx.emit({ kind: 'HeroDamaged', heroIdx, amount: dmg, source: enemy.id });
    checkHeroDown(ctx, heroIdx);
  }
}

export function checkHeroDown(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  if (hero.hp === 0 && !hero.downed) {
    ctx.emit({ kind: 'HeroDowned', heroIdx });
    if (livingHeroes(ctx.draft).length === 0) {
      ctx.emit({ kind: 'GameEnded', outcome: { kind: 'loss', detail: 'wipe' } });
    }
  }
}
