import { z } from 'zod';
import { makeCtx } from './ctx';
import type { ContentDB } from './model/content';
import { getCardDef, getHeroClassDef, getScenarioDef } from './model/content';
import type { GameEvent } from './model/events';
import type { GameState } from './model/state';
import { gridKey } from './model/state';
import type { Rng } from './rng';
import { startHeroTurn } from './systems/turn';

export const SetupSchema = z.object({
  scenarioId: z.string().min(1),
  heroClassIds: z.array(z.string().min(1)).min(1).max(4),
  seed: z.number().int(),
});
export type Setup = z.infer<typeof SetupSchema>;

/**
 * Deterministic game creation: same (content, setup) ⇒ identical state and
 * identical rng stream position. The returned events cover the first round /
 * turn start so the UI log is complete from the beginning.
 */
export function createGame(content: ContentDB, setupRaw: unknown, rng: Rng): { state: GameState; events: GameEvent[] } {
  const setup = SetupSchema.parse(setupRaw);
  const scenario = getScenarioDef(content, setup.scenarioId);
  for (const classId of setup.heroClassIds) getHeroClassDef(content, classId); // assert exist

  const startDef = getCardDef(content, scenario.startCard);

  // secret solution: one candidate per aspect
  const solution = {
    who: rng.pick(scenario.solution.who),
    where: rng.pick(scenario.solution.where),
    how: rng.pick(scenario.solution.how),
  };

  const state: GameState = {
    setup,
    round: 1,
    phaseIdx: 0,
    startHeroIdx: 0,
    activeHeroIdx: 0,
    grid: { [gridKey(0, 0)]: 'c0' },
    cards: {
      c0: {
        id: 'c0',
        defId: startDef.id,
        row: 0,
        col: 0,
        alert: 0,
        emptyRounds: 0,
        alertThreeRounds: 0,
        usedSlots: {},
        blockedExits: [],
        exploredExits: {},
      },
    },
    enemies: {},
    heroes: setup.heroClassIds.map((classId, idx) => {
      const heroClass = getHeroClassDef(content, classId);
      return {
        idx,
        classId,
        hp: heroClass.hp,
        ap: 0,
        cardId: 'c0',
        section: startDef.entrySection,
        detected: false,
        downed: false,
        usedHiddenStrike: false,
      };
    }),
    tilePools: {
      tier1: rng.shuffle(scenario.tilePools.tier1),
      tier2: rng.shuffle(scenario.tilePools.tier2),
    },
    mysteryPools: {
      tier1: rng.shuffle(scenario.mysteryPools.tier1),
      tier2: rng.shuffle(scenario.mysteryPools.tier2),
    },
    encounterPool: [...scenario.encounterPool],
    phaseDecks: scenario.phases.map((p) => rng.shuffle(p.deck)),
    resolutionUnlocked: false,
    clues: {},
    solution,
    firedSymbols: [],
    nextId: 1,
  };

  // start-card garrison
  const ctx = makeCtx(content, state, rng);
  for (const spawn of startDef.spawns) {
    const enemyId = `e${state.nextId}`;
    ctx.emit({ kind: 'EnemySpawned', enemyId, defId: spawn.enemy, cardId: 'c0', section: spawn.section, sleeper: spawn.sleeper });
  }
  ctx.emit({ kind: 'RoundStarted', round: 1, startHeroIdx: 0 });
  startHeroTurn(ctx, 0);

  return { state, events: ctx.events };
}
