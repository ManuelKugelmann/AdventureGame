import { config } from './config';
import type { ContentDB } from './model/content';
import { canCrossBarrier, getCardDef, getSectionDef, isExitCrossable } from './model/content';
import type { Command } from './model/commands';
import type { GameState } from './model/state';
import { activeHero, enemiesOn, getCard } from './model/state';
import { getScenarioDef } from './model/content';
import { adjacentSections, sectionBlocked, sectionFull } from './systems/graph';

/**
 * Enumerate the commands the active hero may legally issue. Used by bots and
 * the UI; every returned command must be accepted by applyCommand.
 * (CommitResolution variants are enumerated over all candidate theories.)
 */
export function legalCommands(content: ContentDB, state: GameState): Command[] {
  if (state.outcome) return [];
  const hero = activeHero(state);
  if (hero.downed) return [{ kind: 'EndTurn' }];
  const out: Command[] = [];
  const card = getCard(state, hero.cardId);
  const def = getCardDef(content, card.defId);

  if (hero.ap >= config.costs.moveSection) {
    for (const s of adjacentSections(content, state, hero.cardId, hero.section)) {
      if (!sectionBlocked(content, state, hero.cardId, s) && !sectionFull(content, state, hero.cardId, s)) {
        out.push({ kind: 'MoveSection', toSection: s });
        out.push({ kind: 'StealthMove', route: [s] }); // sneak attempt is allowed from the open
      }
    }
    // climb/jump across a barrier edge to the linked zone
    if (hero.ap >= config.costs.climb) {
      for (const e of def.sectionEdges) {
        if (e.requires === undefined || !canCrossBarrier(e.requires)) continue;
        const to = e.a === hero.section ? e.b : e.b === hero.section ? e.a : undefined;
        if (to !== undefined && !sectionBlocked(content, state, hero.cardId, to) && !sectionFull(content, state, hero.cardId, to)) {
          out.push({ kind: 'Climb', toSection: to });
        }
      }
    }
  }

  def.topExits.forEach((exit, exitIdx) => {
    if (exit.section !== hero.section || card.blockedExits.includes(exitIdx)) return;
    const idx = exitIdx as 0 | 1;
    const opened = card.openedExits.includes(exitIdx);
    const revealed = card.exploredExits[exitIdx] !== undefined;
    if (isExitCrossable(exit, opened, false) && hero.ap >= config.costs.crossExit) out.push({ kind: 'CrossExit', exitIdx: idx });
    if (exit.blocker?.openable && !opened && hero.ap >= config.costs.crossExit) out.push({ kind: 'OpenExit', exitIdx: idx });
    if (exit.blocker?.openable && opened && hero.ap >= config.costs.crossExit) out.push({ kind: 'CloseExit', exitIdx: idx });
    if (exit.blocker && !revealed && hero.ap >= config.costs.inspect) out.push({ kind: 'PeekExit', exitIdx: idx });
  });

  if (hero.detected && hero.ap >= config.costs.reHide) {
    const enemiesHere = enemiesOn(state, hero.cardId).filter((e) => !e.sleeper && e.section === hero.section);
    if (enemiesHere.length === 0) out.push({ kind: 'ReHide' });
  }

  if (hero.ap >= 1) {
    const maxAp = Math.min(hero.ap, config.costs.attackMaxAp);
    for (const enemy of enemiesOn(state, hero.cardId)) {
      const sameSection = enemy.section === hero.section;
      const adjacentBlocked =
        config.combat.allowAttackIntoBlockedSection &&
        adjacentSections(content, state, hero.cardId, hero.section).includes(enemy.section) &&
        sectionBlocked(content, state, hero.cardId, enemy.section);
      if (sameSection || adjacentBlocked) {
        for (let ap = 1; ap <= maxAp; ap++) out.push({ kind: 'Attack', targetId: enemy.id, ap });
      }
    }
  }

  if (hero.ap >= config.costs.inspect) {
    const section = getSectionDef(def, hero.section);
    section.slots.forEach((_slot, slotIdx) => {
      if (!card.usedSlots[`${hero.section}:${slotIdx}`]) out.push({ kind: 'Inspect', slotIdx });
    });
  }

  if (state.resolutionUnlocked) {
    const scenario = getScenarioDef(content, state.setup.scenarioId);
    for (const who of scenario.solution.who)
      for (const where of scenario.solution.where)
        for (const how of scenario.solution.how) out.push({ kind: 'CommitResolution', theory: { who, where, how } });
  }

  out.push({ kind: 'EndTurn' });
  return out;
}
