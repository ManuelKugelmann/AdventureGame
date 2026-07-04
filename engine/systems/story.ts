import { config } from '../config';
import type { Ctx } from '../ctx';
import { getScenarioDef, getStoryCardDef } from '../model/content';
import { getCard, livingHeroes } from '../model/state';
import { raiseAlertFloor, spawnEncounter } from './alert';
import { revealClue } from './mystery';

/**
 * Round end: draw 1 phase card and resolve it. Phase advances when its deck
 * is exhausted; exhausting the final phase unlocks the resolution (the game
 * must always be able to end).
 */
export function roundEndStoryDraw(ctx: Ctx): void {
  const scenario = getScenarioDef(ctx.content, ctx.draft.setup.scenarioId);
  const deck = ctx.draft.phaseDecks[ctx.draft.phaseIdx];
  if (!deck) throw new Error(`invariant: no deck for phase ${ctx.draft.phaseIdx}`);
  if (deck.length === 0) return; // final phase already exhausted

  const storyCardId = deck[0];
  if (storyCardId === undefined) throw new Error('invariant: deck non-empty but no head');
  ctx.emit({ kind: 'StoryCardDrawn', storyCardId, phaseIdx: ctx.draft.phaseIdx });
  const card = getStoryCardDef(ctx.content, storyCardId);

  switch (card.type) {
    case 'QUIET':
    case 'LORE':
      break;
    case 'CLUE':
      revealClue(ctx);
      break;
    case 'COMBAT': {
      const heroCards = [...new Set(livingHeroes(ctx.draft).map((h) => h.cardId))].sort();
      if (heroCards.length > 0) spawnEncounter(ctx, ctx.rng.pick(heroCards), 1);
      break;
    }
    case 'EVENT': {
      const heroCards = [...new Set(livingHeroes(ctx.draft).map((h) => h.cardId))].sort();
      for (const cardId of heroCards) {
        const c = getCard(ctx.draft, cardId);
        raiseAlertFloor(ctx, cardId, Math.min(config.alert.max, c.alert + 1), 'story event');
      }
      break;
    }
    case 'RESOLUTION':
      if (!ctx.draft.resolutionUnlocked) ctx.emit({ kind: 'ResolutionUnlocked' });
      break;
    default:
      card.type satisfies never;
      throw new Error('unhandled story card type');
  }

  const deckAfter = ctx.draft.phaseDecks[ctx.draft.phaseIdx];
  if (deckAfter && deckAfter.length === 0) {
    if (ctx.draft.phaseIdx + 1 < scenario.phases.length) {
      ctx.emit({ kind: 'PhaseAdvanced', toPhaseIdx: ctx.draft.phaseIdx + 1 });
    } else if (!ctx.draft.resolutionUnlocked) {
      ctx.emit({ kind: 'ResolutionUnlocked' });
    }
  }
}
