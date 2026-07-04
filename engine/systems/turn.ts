import { config } from '../config';
import type { Ctx } from '../ctx';
import { getHeroClassDef, getScenarioDef } from '../model/content';
import type { GameState } from '../model/state';
import { getHero, livingHeroes } from '../model/state';
import { rollDice } from '../rng';
import { encounterChecks, propagateAlert, roundStartAlertTick } from './alert';
import { roundEndEnemyPhase } from './enemyAi';
import { roundEndStoryDraw } from './story';

/** AP = classBase + hits(2d), rolled at turn start. */
export function startHeroTurn(ctx: Ctx, heroIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  if (hero.downed) throw new Error(`startHeroTurn: hero ${heroIdx} is downed`);
  const heroClass = getHeroClassDef(ctx.content, hero.classId);
  const apRoll = rollDice(ctx.rng, config.turn.apDice);
  ctx.emit({ kind: 'TurnStarted', heroIdx, apRoll, ap: heroClass.apBase + apRoll.hits });
}

/** Next living hero later in this round's cyclic order, or undefined = round over. */
export function nextHeroInRound(state: GameState, fromIdx: number): number | undefined {
  const n = state.heroes.length;
  const rel = (i: number): number => (i - state.startHeroIdx + n) % n;
  const cur = rel(fromIdx);
  let best: number | undefined;
  let bestRel = Number.MAX_SAFE_INTEGER;
  for (const h of livingHeroes(state)) {
    const r = rel(h.idx);
    if (r > cur && r < bestRel) {
      bestRel = r;
      best = h.idx;
    }
  }
  return best;
}

export function endTurn(ctx: Ctx): void {
  const heroIdx = ctx.draft.activeHeroIdx;
  ctx.emit({ kind: 'TurnEnded', heroIdx });

  const next = nextHeroInRound(ctx.draft, heroIdx);
  if (next !== undefined) {
    startHeroTurn(ctx, next);
    return;
  }

  // --- round end ---
  roundEndEnemyPhase(ctx);
  if (ctx.draft.outcome) return;
  encounterChecks(ctx);
  propagateAlert(ctx);
  roundEndStoryDraw(ctx);
  ctx.emit({ kind: 'RoundEnded', round: ctx.draft.round });
  if (ctx.draft.outcome) return;

  // --- doom clock ---
  const scenario = getScenarioDef(ctx.content, ctx.draft.setup.scenarioId);
  const maxRounds = Math.min(scenario.maxRounds, config.turn.maxRoundsCeiling);
  if (ctx.draft.round + 1 > maxRounds) {
    ctx.emit({ kind: 'GameEnded', outcome: { kind: 'loss', detail: 'doom' } });
    return;
  }

  // --- round start: rotate start player, reset enemies, de-escalate ---
  const n = ctx.draft.heroes.length;
  let newStart = (ctx.draft.startHeroIdx + 1) % n;
  for (let i = 0; i < n && getHero(ctx.draft, newStart).downed; i++) newStart = (newStart + 1) % n;
  ctx.emit({ kind: 'RoundStarted', round: ctx.draft.round + 1, startHeroIdx: newStart });
  ctx.emit({ kind: 'EnemiesReset' });
  roundStartAlertTick(ctx);
  startHeroTurn(ctx, newStart);
}
