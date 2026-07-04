import type { Ctx } from '../ctx';
import { getMysteryTokenDef, getSymbolCardDef, getHeroClassDef } from '../model/content';
import type { Aspect } from '../model/state';
import { getCard, getHero } from '../model/state';
import { spawnEncounter } from './alert';
import { checkHeroDown } from './combat';

const ASPECTS: Aspect[] = ['who', 'where', 'how'];

/** Reveal one not-yet-known solution aspect (rng pick). No-op if all known. */
export function revealClue(ctx: Ctx): void {
  const unknown = ASPECTS.filter((a) => ctx.draft.clues[a] === undefined);
  if (unknown.length === 0) return;
  const aspect = ctx.rng.pick(unknown);
  ctx.emit({ kind: 'ClueRevealed', aspect, value: ctx.draft.solution[aspect] });
}

/**
 * ❖ inspect: draw from the mystery pool matching the card's tier
 * (grey fallback: tier2 empty → tier1; both empty → slot is spent, no token —
 * declared fallback, not a silent one).
 */
export function resolveInspect(ctx: Ctx, heroIdx: number, slotIdx: number): void {
  const hero = getHero(ctx.draft, heroIdx);
  const card = getCard(ctx.draft, hero.cardId);
  ctx.emit({ kind: 'SlotUsed', cardId: card.id, section: hero.section, slotIdx });

  const cardDef = ctx.content.cards[card.defId];
  if (!cardDef) throw new Error(`unknown card def ${card.defId}`);
  let tier: 1 | 2 = cardDef.tier;
  if (tier === 2 && ctx.draft.mysteryPools.tier2.length === 0) tier = 1;
  const pool = tier === 1 ? ctx.draft.mysteryPools.tier1 : ctx.draft.mysteryPools.tier2;
  if (pool.length === 0) return; // declared grey fallback: nothing left to find

  const tokenId = pool[0];
  if (tokenId === undefined) throw new Error('invariant: pool non-empty but no head');
  ctx.emit({ kind: 'TokenDrawn', heroIdx, tokenId, tier });
  applyToken(ctx, heroIdx, tokenId);
}

function applyToken(ctx: Ctx, heroIdx: number, tokenId: string): void {
  const token = getMysteryTokenDef(ctx.content, tokenId);
  const payload = token.payload;
  switch (payload.kind) {
    case 'heal': {
      const hero = getHero(ctx.draft, heroIdx);
      const maxHp = getHeroClassDef(ctx.content, hero.classId).hp;
      const amount = Math.min(payload.amount, maxHp - hero.hp);
      if (amount > 0) ctx.emit({ kind: 'HeroHealed', heroIdx, amount });
      break;
    }
    case 'ap':
      ctx.emit({ kind: 'ApGained', heroIdx, amount: payload.amount });
      break;
    case 'clue':
      revealClue(ctx);
      break;
    case 'trap': {
      ctx.emit({ kind: 'HeroDamaged', heroIdx, amount: payload.damage, source: tokenId });
      checkHeroDown(ctx, heroIdx);
      break;
    }
    case 'rune':
      fireSymbolCard(ctx, tokenId, payload.symbolCard);
      break;
    default:
      payload satisfies never;
      throw new Error('unhandled mystery payload');
  }
}

/** rune → symbol card lookup (existence validated at content build). */
export function fireSymbolCard(ctx: Ctx, tokenId: string, symbolCardId: string): void {
  const symbol = getSymbolCardDef(ctx.content, symbolCardId);
  ctx.emit({ kind: 'RuneTriggered', tokenId, symbolCardId });
  if (symbol.oneShot && ctx.draft.firedSymbols.includes(symbolCardId)) return; // already fired
  ctx.emit({ kind: 'SymbolFired', symbolCardId, oneShot: symbol.oneShot });

  const effect = symbol.effect;
  switch (effect.kind) {
    case 'spawnEncounter': {
      const hero = getHero(ctx.draft, ctx.draft.activeHeroIdx);
      spawnEncounter(ctx, hero.cardId, effect.count);
      break;
    }
    case 'alertDown': {
      const hero = getHero(ctx.draft, ctx.draft.activeHeroIdx);
      const card = getCard(ctx.draft, hero.cardId);
      const to = Math.max(0, card.alert - effect.amount);
      if (to !== card.alert) ctx.emit({ kind: 'AlertChanged', cardId: card.id, from: card.alert, to, reason: 'ward rune' });
      break;
    }
    case 'lore':
      break; // flavor only — the event log carries the text via content lookup
    default:
      effect satisfies never;
      throw new Error('unhandled symbol effect');
  }
}
