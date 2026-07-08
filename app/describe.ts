import type { ContentDB, GameEvent } from '../engine/index';
import { zoneLabel } from './format';

const hits = (n: number): string => `${n} hit${n === 1 ? '' : 's'}`;
/** render the rolled dice faces: ▫ blank · ▪ hit · ✦ surge */
const FACE = { blank: '▫', hit: '▪', surge: '✦' } as const;
const dice = (r: { faces: readonly ('blank' | 'hit' | 'surge')[] }): string => (r.faces.length ? ` [${r.faces.map((f) => FACE[f]).join('')}]` : '');

/** Human-readable one-liners for the event log. */
export function describeEvent(content: ContentDB, ev: GameEvent, heroClassIds: string[] = []): string | undefined {
  const heroName = (idx: number): string => {
    const classId = heroClassIds[idx];
    const className = classId ? content.heroes[classId]?.name : undefined;
    return className ? `${className} (${idx + 1})` : `Hero ${idx + 1}`;
  };
  switch (ev.kind) {
    case 'RoundStarted':
      return `— Round ${ev.round} —`;
    case 'TurnStarted':
      return `${heroName(ev.heroIdx)} starts turn with ${ev.ap} AP (rolled +${ev.apRoll.hits} AP)${dice(ev.apRoll)}`;
    case 'Moved':
      return `${heroName(ev.heroIdx)} → ${zoneLabel(ev.section)}`;
    case 'CardPlaced':
      return `Revealed: ${content.cards[ev.defId]?.name ?? ev.defId}`;
    case 'ExitWalled':
      return `The way is walled off.`;
    case 'AlertChanged':
      return `Alert ${ev.from}→${ev.to} (${ev.reason})`;
    case 'HeroDetected':
      return `${heroName(ev.heroIdx)} is out in the open (${ev.reason})`;
    case 'HeroHidden':
      return `${heroName(ev.heroIdx)} slips into hiding`;
    case 'StealthRolled':
      return `Stealth roll${dice(ev.roll)}: ${hits(ev.roll.hits)}, budget ${ev.budget} vs cost ${ev.cost} — ${ev.success ? 'unseen' : 'FAILED'}`;
    case 'AttackRolled':
      return `Attack${dice(ev.roll)}: ${hits(ev.roll.hits)} → ${ev.netHits} net`;
    case 'EnemyStateSwapped':
      return `Enemy wounded (state ${ev.fromStateIdx}→${ev.toStateIdx})`;
    case 'EnemyDefeated':
      return `Enemy defeated!`;
    case 'EnemyAttackRolled':
      return `Enemy strikes ${heroName(ev.heroIdx)}${dice(ev.roll)}: ${ev.netHits} damage`;
    case 'HeroDamaged':
      return `${heroName(ev.heroIdx)} takes ${ev.amount} damage`;
    case 'HeroHealed':
      return `${heroName(ev.heroIdx)} heals ${ev.amount}`;
    case 'HeroDowned':
      return `${heroName(ev.heroIdx)} is DOWN`;
    case 'EnemySpawned':
      return `${content.enemies[ev.defId]?.name ?? ev.defId} appears${ev.sleeper ? ' (dormant)' : ''}`;
    case 'EnemyWoke':
      return `Something stirs awake…`;
    case 'EncounterSpawned':
      return `Encounter!`;
    case 'AmbushResolved':
      return ev.enemyId ? `⚔ Ambush! Something bursts from hiding.` : undefined;
    case 'TokenDrawn':
      return `Found: ${content.mysteryTokens[ev.tokenId]?.name ?? ev.tokenId}`;
    case 'RuneTriggered':
      return `A rune flares: ${content.symbolCards[ev.symbolCardId]?.name ?? ev.symbolCardId}`;
    case 'StoryCardDrawn': {
      const card = content.storyCards[ev.storyCardId];
      return card ? `📖 ${card.text}` : undefined;
    }
    case 'ClueRevealed':
      return `CLUE — ${ev.aspect.toUpperCase()}: ${ev.value}`;
    case 'PhaseAdvanced':
      return `— The story darkens (phase ${ev.toPhaseIdx + 1}) —`;
    case 'ResolutionUnlocked':
      return `You may now name the guilty (Resolution unlocked)`;
    case 'ResolutionCommitted':
      return `Accusation: ${ev.theory.who} / ${ev.theory.where} / ${ev.theory.how} — ${ev.matches}/3 correct`;
    case 'GameEnded':
      return ev.outcome.kind === 'win' ? `☀ VICTORY (${ev.outcome.detail})` : `☠ DEFEAT (${ev.outcome.detail})`;
    case 'TurnEnded':
      return `${heroName(ev.heroIdx)} ends turn`;
    case 'ApSpent':
      return `${heroName(ev.heroIdx)} spends ${ev.amount} AP`;
    case 'ApGained':
      return `${heroName(ev.heroIdx)} gains ${ev.amount} AP`;
    case 'ExitLinked':
      return `Passage links to an explored area`;
    case 'ExitOpened':
      return `A door swings open`;
    case 'ExitClosed':
      return `A door is pulled shut`;
    case 'ExitPeeked':
      return ev.throughBlocker ? `You peer through and scout what lies beyond` : undefined; // auto-peek: CardPlaced covers it
    case 'EnemyMoved':
      return `An enemy shifts to ${zoneLabel(ev.section)}`;
    case 'EnemyActed':
      return ev.action === 'investigate'
        ? `An enemy investigates`
        : ev.action === 'idle'
          ? `An enemy waits, watchful`
          : undefined; // 'attack'/'move' are covered by their own lines
    case 'SlotUsed':
      return `Searched ❖ in ${zoneLabel(ev.section)}`;
    case 'RoundEnded':
    case 'TilePoolDrawn':
    case 'CardCountersTicked':
    case 'EnemiesReset':
    case 'SymbolFired':
      return undefined; // internal, or duplicated by an adjacent line
    default:
      ev satisfies never;
      return undefined;
  }
}
