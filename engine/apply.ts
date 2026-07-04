import { makeCtx } from './ctx';
import type { ContentDB } from './model/content';
import type { Command } from './model/commands';
import { parseCommand } from './model/commands';
import type { GameEvent } from './model/events';
import type { GameState } from './model/state';
import { activeHero, assertInvariants, getEnemy } from './model/state';
import type { Rng } from './rng';
import { config } from './config';
import { heroAttack } from './systems/combat';
import { getCardDef, getSectionDef } from './model/content';
import { getCard } from './model/state';
import { crossExit, moveSection, reHide, stealthMove } from './systems/movement';
import { resolveInspect } from './systems/mystery';
import { commitResolution } from './systems/resolution';
import { endTurn } from './systems/turn';
import { adjacentSections, sectionBlocked } from './systems/graph';

/**
 * The engine's single entry point: validate a command against the state,
 * decide + emit events (seeded rng only), fold them into a fresh state.
 * Throws on any invalid command — no partial mutation (the input state is
 * never touched).
 */
export function applyCommand(
  content: ContentDB,
  state: GameState,
  cmdRaw: unknown,
  rng: Rng,
): { state: GameState; events: GameEvent[] } {
  const cmd: Command = parseCommand(cmdRaw);
  if (state.outcome) throw new Error('applyCommand: game is over');

  const draft: GameState = structuredClone(state);
  const ctx = makeCtx(content, draft, rng);
  const heroIdx = draft.activeHeroIdx;
  const hero = activeHero(draft);
  // a hero downed mid-turn can only pass the turn on
  if (hero.downed && cmd.kind !== 'EndTurn') throw new Error('applyCommand: active hero is downed');

  const needAp = (n: number): void => {
    if (hero.ap < n) throw new Error(`not enough AP (${hero.ap} < ${n})`);
  };

  switch (cmd.kind) {
    case 'MoveSection':
      needAp(config.costs.moveSection);
      moveSection(ctx, heroIdx, cmd.toSection);
      break;
    case 'CrossExit':
      needAp(config.costs.crossExit);
      crossExit(ctx, heroIdx, cmd.exitIdx);
      break;
    case 'StealthMove':
      needAp(config.costs.moveSection);
      stealthMove(ctx, heroIdx, cmd.route);
      break;
    case 'ReHide':
      needAp(config.costs.reHide);
      reHide(ctx, heroIdx);
      break;
    case 'Attack': {
      if (cmd.ap > config.costs.attackMaxAp) throw new Error(`Attack: max ${config.costs.attackMaxAp} AP`);
      needAp(cmd.ap);
      const target = getEnemy(draft, cmd.targetId);
      const sameSection = target.cardId === hero.cardId && target.section === hero.section;
      const adjacentBlocked =
        config.combat.allowAttackIntoBlockedSection &&
        target.cardId === hero.cardId &&
        adjacentSections(content, draft, hero.cardId, hero.section).includes(target.section) &&
        sectionBlocked(content, draft, target.cardId, target.section);
      if (!sameSection && !adjacentBlocked)
        throw new Error('Attack: target not in reach (same section, or adjacent chokepoint-blocked)');
      heroAttack(ctx, heroIdx, cmd.targetId, cmd.ap);
      break;
    }
    case 'Inspect': {
      needAp(config.costs.inspect);
      const card = getCard(draft, hero.cardId);
      const def = getCardDef(content, card.defId);
      const section = getSectionDef(def, hero.section);
      const slot = section.slots[cmd.slotIdx];
      if (!slot) throw new Error(`Inspect: no slot ${cmd.slotIdx} in section ${hero.section}`);
      if (card.usedSlots[`${hero.section}:${cmd.slotIdx}`]) throw new Error('Inspect: slot already used');
      ctx.emit({ kind: 'ApSpent', heroIdx, amount: config.costs.inspect });
      resolveInspect(ctx, heroIdx, cmd.slotIdx);
      break;
    }
    case 'CommitResolution':
      commitResolution(ctx, heroIdx, cmd.theory);
      break;
    case 'EndTurn':
      endTurn(ctx);
      break;
    default:
      cmd satisfies never;
      throw new Error('unhandled command');
  }

  assertInvariants(draft);
  return { state: draft, events: ctx.events };
}
