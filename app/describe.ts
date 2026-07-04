import type { ContentDB, GameEvent } from '../engine/index';

/** Human-readable one-liners for the event log. */
export function describeEvent(content: ContentDB, ev: GameEvent): string | undefined {
  const heroName = (idx: number): string => `Hero ${idx + 1}`;
  switch (ev.kind) {
    case 'RoundStarted':
      return `— Round ${ev.round} —`;
    case 'TurnStarted':
      return `${heroName(ev.heroIdx)} starts turn with ${ev.ap} AP (rolled ${ev.apRoll.hits} hits)`;
    case 'Moved':
      return `${heroName(ev.heroIdx)} → ${ev.section}`;
    case 'CardPlaced':
      return `Revealed: ${content.cards[ev.defId]?.name ?? ev.defId}`;
    case 'ExitWalled':
      return `The way is walled off.`;
    case 'AlertChanged':
      return `Alert ${ev.from}→${ev.to} (${ev.reason})`;
    case 'HeroDetected':
      return `${heroName(ev.heroIdx)} DETECTED (${ev.reason})`;
    case 'HeroHidden':
      return `${heroName(ev.heroIdx)} slips back into hiding`;
    case 'StealthRolled':
      return `Stealth roll: ${ev.roll.hits} hits, budget ${ev.budget} vs cost ${ev.cost} — ${ev.success ? 'unseen' : 'FAILED'}`;
    case 'AttackRolled':
      return `Attack: ${ev.roll.hits} hits → ${ev.netHits} net`;
    case 'EnemyStateSwapped':
      return `Enemy wounded (state ${ev.fromStateIdx}→${ev.toStateIdx})`;
    case 'EnemyDefeated':
      return `Enemy defeated!`;
    case 'EnemyAttackRolled':
      return `Enemy strikes ${heroName(ev.heroIdx)}: ${ev.netHits} damage`;
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
    case 'RoundEnded':
    case 'ApSpent':
    case 'ApGained':
    case 'ExitLinked':
    case 'TilePoolDrawn':
    case 'CardCountersTicked':
    case 'EnemyMoved':
    case 'EnemyActed':
    case 'EnemiesReset':
    case 'SlotUsed':
    case 'SymbolFired':
      return undefined; // too noisy for the log
    default:
      ev satisfies never;
      return undefined;
  }
}
