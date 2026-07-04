import type { GameEvent } from './model/events';
import type { GameState } from './model/state';
import { getCard, getEnemy, getHero } from './model/state';
import { gridKey } from './model/state';

/**
 * Fold one event into a draft state (mutates the draft — callers own cloning).
 * Every state change in the engine flows through here so that
 * replay(setup, events) ≡ state.
 */
export function applyEventMut(draft: GameState, ev: GameEvent): void {
  switch (ev.kind) {
    case 'RoundStarted':
      draft.round = ev.round;
      draft.startHeroIdx = ev.startHeroIdx;
      draft.activeHeroIdx = ev.startHeroIdx;
      break;
    case 'TurnStarted': {
      draft.activeHeroIdx = ev.heroIdx;
      getHero(draft, ev.heroIdx).ap = ev.ap;
      getHero(draft, ev.heroIdx).usedHiddenStrike = false;
      break;
    }
    case 'TurnEnded':
      getHero(draft, ev.heroIdx).ap = 0;
      break;
    case 'RoundEnded':
      break;
    case 'ApSpent': {
      const hero = getHero(draft, ev.heroIdx);
      hero.ap -= ev.amount;
      if (hero.ap < 0) throw new Error(`invariant: hero ${ev.heroIdx} AP below 0`);
      break;
    }
    case 'ApGained':
      getHero(draft, ev.heroIdx).ap += ev.amount;
      break;
    case 'Moved': {
      const hero = getHero(draft, ev.heroIdx);
      hero.cardId = ev.cardId;
      hero.section = ev.section;
      break;
    }
    case 'CardPlaced': {
      if (draft.cards[ev.cardId]) throw new Error(`card ${ev.cardId} already placed`);
      draft.cards[ev.cardId] = {
        id: ev.cardId,
        defId: ev.defId,
        row: ev.row,
        col: ev.col,
        alert: 0,
        emptyRounds: 0,
        alertThreeRounds: 0,
        usedSlots: {},
        blockedExits: [],
        exploredExits: {},
      };
      draft.grid[gridKey(ev.row, ev.col)] = ev.cardId;
      getCard(draft, ev.fromCardId).exploredExits[ev.exitIdx] = ev.cardId;
      draft.nextId += 1;
      break;
    }
    case 'ExitLinked':
      getCard(draft, ev.cardId).exploredExits[ev.exitIdx] = ev.toCardId;
      break;
    case 'ExitWalled':
      getCard(draft, ev.cardId).blockedExits.push(ev.exitIdx);
      break;
    case 'TilePoolDrawn': {
      const pool = ev.tier === 1 ? draft.tilePools.tier1 : draft.tilePools.tier2;
      const idx = pool.indexOf(ev.defId);
      if (idx < 0) throw new Error(`tile ${ev.defId} not in tier${ev.tier} pool`);
      pool.splice(idx, 1);
      break;
    }
    case 'AlertChanged': {
      if (ev.to < 0 || ev.to > 3) throw new Error(`invariant: alert ${ev.to} out of 0-3`);
      getCard(draft, ev.cardId).alert = ev.to;
      break;
    }
    case 'CardCountersTicked': {
      const card = getCard(draft, ev.cardId);
      card.emptyRounds = ev.emptyRounds;
      card.alertThreeRounds = ev.alertThreeRounds;
      break;
    }
    case 'HeroDetected':
      getHero(draft, ev.heroIdx).detected = true;
      break;
    case 'HeroHidden':
      getHero(draft, ev.heroIdx).detected = false;
      break;
    case 'StealthRolled':
      break; // info only
    case 'AttackRolled':
      getHero(draft, ev.heroIdx).usedHiddenStrike = true;
      break;
    case 'EnemyStateSwapped':
      getEnemy(draft, ev.enemyId).stateIdx = ev.toStateIdx;
      break;
    case 'EnemyDefeated':
      getEnemy(draft, ev.enemyId); // assert exists
      delete draft.enemies[ev.enemyId];
      break;
    case 'EnemyAttackRolled':
      break; // info only
    case 'HeroDamaged': {
      const hero = getHero(draft, ev.heroIdx);
      hero.hp = Math.max(0, hero.hp - ev.amount);
      break;
    }
    case 'HeroHealed':
      getHero(draft, ev.heroIdx).hp += ev.amount;
      break;
    case 'HeroDowned': {
      const hero = getHero(draft, ev.heroIdx);
      hero.downed = true;
      hero.ap = 0;
      break;
    }
    case 'EnemySpawned': {
      if (draft.enemies[ev.enemyId]) throw new Error(`enemy ${ev.enemyId} already exists`);
      draft.enemies[ev.enemyId] = {
        id: ev.enemyId,
        defId: ev.defId,
        stateIdx: 0,
        cardId: ev.cardId,
        section: ev.section,
        acted: false,
        sleeper: ev.sleeper,
      };
      draft.nextId += 1;
      break;
    }
    case 'EnemyWoke':
      getEnemy(draft, ev.enemyId).sleeper = false;
      break;
    case 'EnemyMoved': {
      const enemy = getEnemy(draft, ev.enemyId);
      enemy.cardId = ev.cardId;
      enemy.section = ev.section;
      break;
    }
    case 'EnemyActed':
      getEnemy(draft, ev.enemyId).acted = true;
      break;
    case 'EnemiesReset':
      for (const e of Object.values(draft.enemies)) e.acted = false;
      break;
    case 'EncounterSpawned':
      break; // followed by EnemySpawned events
    case 'SlotUsed':
      getCard(draft, ev.cardId).usedSlots[`${ev.section}:${ev.slotIdx}`] = true;
      break;
    case 'TokenDrawn': {
      const pool = ev.tier === 1 ? draft.mysteryPools.tier1 : draft.mysteryPools.tier2;
      const idx = pool.indexOf(ev.tokenId);
      if (idx < 0) throw new Error(`token ${ev.tokenId} not in tier${ev.tier} mystery pool`);
      pool.splice(idx, 1);
      break;
    }
    case 'RuneTriggered':
      break; // info only; SymbolFired follows
    case 'SymbolFired':
      if (ev.oneShot) draft.firedSymbols.push(ev.symbolCardId);
      break;
    case 'StoryCardDrawn': {
      const deck = draft.phaseDecks[ev.phaseIdx];
      if (!deck || deck[0] !== ev.storyCardId)
        throw new Error(`story card ${ev.storyCardId} is not on top of phase deck ${ev.phaseIdx}`);
      deck.shift();
      break;
    }
    case 'ClueRevealed':
      draft.clues[ev.aspect] = ev.value;
      break;
    case 'PhaseAdvanced':
      draft.phaseIdx = ev.toPhaseIdx;
      break;
    case 'ResolutionUnlocked':
      draft.resolutionUnlocked = true;
      break;
    case 'ResolutionCommitted':
      break; // GameEnded follows
    case 'GameEnded':
      draft.outcome = ev.outcome;
      break;
    default:
      ev satisfies never;
      throw new Error('unhandled event');
  }
}
