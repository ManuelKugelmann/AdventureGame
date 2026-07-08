import type { DiceRoll } from '../rng';
import type { Aspect, Outcome, Theory } from './state';

/**
 * Events are the save/replay format: every state change is expressed as an
 * event, and folding the event log over the setup state reproduces the state
 * exactly (replay(events) ≡ state — property tested).
 *
 * Info-only events (dice rolls) exist for UI/log and fold as no-ops.
 */
export type GameEvent =
  // round / turn structure
  | { kind: 'RoundStarted'; round: number; startHeroIdx: number }
  | { kind: 'TurnStarted'; heroIdx: number; apRoll: DiceRoll; ap: number }
  | { kind: 'TurnEnded'; heroIdx: number }
  | { kind: 'RoundEnded'; round: number }
  // movement / exploration
  | { kind: 'ApSpent'; heroIdx: number; amount: number }
  | { kind: 'ApGained'; heroIdx: number; amount: number }
  | { kind: 'Moved'; heroIdx: number; cardId: string; section: string }
  | { kind: 'CardPlaced'; cardId: string; defId: string; row: number; col: number; fromCardId: string; exitIdx: number }
  | { kind: 'ExitLinked'; cardId: string; exitIdx: number; toCardId: string }
  | { kind: 'ExitWalled'; cardId: string; exitIdx: number }
  | { kind: 'TilePoolDrawn'; tier: 1 | 2; defId: string }
  // alert
  | { kind: 'AlertChanged'; cardId: string; from: number; to: number; reason: string }
  | { kind: 'CardCountersTicked'; cardId: string; emptyRounds: number; alertThreeRounds: number }
  // visibility
  | { kind: 'HeroDetected'; heroIdx: number; reason: string }
  | { kind: 'HeroHidden'; heroIdx: number }
  | { kind: 'StealthRolled'; heroIdx: number; roll: DiceRoll; budget: number; cost: number; success: boolean }
  // combat
  | { kind: 'AttackRolled'; heroIdx: number; targetId: string; roll: DiceRoll; netHits: number }
  | { kind: 'EnemyStateSwapped'; enemyId: string; fromStateIdx: number; toStateIdx: number }
  | { kind: 'EnemyDefeated'; enemyId: string }
  | { kind: 'EnemyAttackRolled'; enemyId: string; heroIdx: number; roll: DiceRoll; netHits: number }
  | { kind: 'HeroDamaged'; heroIdx: number; amount: number; source: string }
  | { kind: 'HeroHealed'; heroIdx: number; amount: number }
  | { kind: 'HeroDowned'; heroIdx: number }
  // enemies
  | { kind: 'EnemySpawned'; enemyId: string; defId: string; cardId: string; section: string; sleeper: boolean }
  | { kind: 'EnemyWoke'; enemyId: string }
  | { kind: 'EnemyMoved'; enemyId: string; cardId: string; section: string }
  | { kind: 'EnemyActed'; enemyId: string; action: 'attack' | 'move' | 'investigate' | 'idle' }
  | { kind: 'EnemiesReset' }
  | { kind: 'EncounterSpawned'; cardId: string; count: number }
  | { kind: 'AmbushResolved'; cardId: string; section: string; enemyId: string | null }
  // mystery
  | { kind: 'SlotUsed'; cardId: string; section: string; slotIdx: number }
  | { kind: 'TokenDrawn'; heroIdx: number; tokenId: string; tier: 1 | 2 }
  | { kind: 'RuneTriggered'; tokenId: string; symbolCardId: string }
  | { kind: 'SymbolFired'; symbolCardId: string; oneShot: boolean }
  // story
  | { kind: 'StoryCardDrawn'; storyCardId: string; phaseIdx: number }
  | { kind: 'ClueRevealed'; aspect: Aspect; value: string }
  | { kind: 'PhaseAdvanced'; toPhaseIdx: number }
  | { kind: 'ResolutionUnlocked' }
  // endgame
  | { kind: 'ResolutionCommitted'; heroIdx: number; theory: Theory; matches: number }
  | { kind: 'GameEnded'; outcome: Outcome };

export type GameEventKind = GameEvent['kind'];
