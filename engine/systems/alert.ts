import { config } from '../config';
import type { Ctx } from '../ctx';
import { getEnemyDef, primaryEntry } from '../model/content';
import { enemiesOn, getCard, heroesOn } from '../model/state';
import { enemyCapReached, linkedCards } from './graph';

/** Alert is lower-bound: triggers raise it to a floor, never lower it. */
export function raiseAlertFloor(ctx: Ctx, cardId: string, floor: number, reason: string): void {
  const card = getCard(ctx.draft, cardId);
  if (card.alert < floor) {
    ctx.emit({ kind: 'AlertChanged', cardId, from: card.alert, to: floor, reason });
  }
}

/** Round-start: tick per-card counters, then run the de-escalation ladder. */
export function roundStartAlertTick(ctx: Ctx): void {
  const cardIds = Object.keys(ctx.draft.cards).sort();
  for (const cardId of cardIds) {
    const card = getCard(ctx.draft, cardId);
    const empty = heroesOn(ctx.draft, cardId).length === 0 && enemiesOn(ctx.draft, cardId).length === 0;
    const emptyRounds = empty ? card.emptyRounds + 1 : 0;
    const alertThreeRounds = card.alert === 3 ? card.alertThreeRounds + 1 : 0;
    ctx.emit({ kind: 'CardCountersTicked', cardId, emptyRounds, alertThreeRounds });

    const { fromThree, fromTwo, fromOne } = config.alert.deescalateEmptyRounds;
    const cleared = enemiesOn(ctx.draft, cardId).length === 0;
    if (card.alert === 3 && cleared && emptyRounds >= fromThree) {
      ctx.emit({ kind: 'AlertChanged', cardId, from: 3, to: 2, reason: `quiet ${emptyRounds} rounds` });
    } else if (card.alert === 2 && emptyRounds >= fromTwo) {
      ctx.emit({ kind: 'AlertChanged', cardId, from: 2, to: 1, reason: `quiet ${emptyRounds} rounds` });
    } else if (card.alert === 1 && emptyRounds >= fromOne) {
      ctx.emit({ kind: 'AlertChanged', cardId, from: 1, to: 0, reason: `quiet ${emptyRounds} rounds` });
    }
  }
}

/** Round-end: alert 3 pushes adjacent 0→1 and 1→2; alert 2 pushes adjacent 0→1. */
export function propagateAlert(ctx: Ctx): void {
  const snapshot = Object.values(ctx.draft.cards)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => ({ id: c.id, alert: c.alert }));
  for (const src of snapshot) {
    if (src.alert < 2) continue;
    for (const link of linkedCards(ctx.content, ctx.draft, src.id)) {
      const neighbor = getCard(ctx.draft, link.toCardId);
      if (src.alert === 3 && neighbor.alert <= 1) {
        ctx.emit({ kind: 'AlertChanged', cardId: neighbor.id, from: neighbor.alert, to: neighbor.alert + 1, reason: 'propagation' });
      } else if (src.alert === 2 && neighbor.alert === 0) {
        ctx.emit({ kind: 'AlertChanged', cardId: neighbor.id, from: 0, to: 1, reason: 'propagation' });
      }
    }
  }
}

/** Round-end encounter checks per card; severity escalates under sustained alert 3. */
export function encounterChecks(ctx: Ctx): void {
  const cardIds = Object.keys(ctx.draft.cards).sort();
  for (const cardId of cardIds) {
    const card = getCard(ctx.draft, cardId);
    const chance = config.alert.encounterChancePct[card.alert];
    if (chance === undefined) throw new Error(`invariant: alert ${card.alert} out of range`);
    if (chance === 0 || !ctx.rng.chancePct(chance)) continue;
    const count = 1 + (card.alertThreeRounds >= config.alert.severityEscalationAge ? 1 : 0);
    spawnEncounter(ctx, cardId, count);
  }
}

/** Spawn `count` enemies from the encounter pool onto a card's entry section. */
export function spawnEncounter(ctx: Ctx, cardId: string, count: number): void {
  const card = getCard(ctx.draft, cardId);
  const def = ctx.content.cards[card.defId];
  if (!def) throw new Error(`unknown card def ${card.defId}`);
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    if (enemyCapReached(ctx.draft)) break;
    const enemyDefId = ctx.rng.pick(ctx.draft.encounterPool);
    getEnemyDef(ctx.content, enemyDefId); // assert exists
    const enemyId = `e${ctx.draft.nextId}`;
    if (spawned === 0) ctx.emit({ kind: 'EncounterSpawned', cardId, count });
    ctx.emit({ kind: 'EnemySpawned', enemyId, defId: enemyDefId, cardId, section: primaryEntry(def).id, sleeper: false });
    spawned++;
  }
}
