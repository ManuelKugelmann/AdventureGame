import { describe, expect, it } from 'vitest';
import { greedyBot, runBotGame } from '../../engine/index';
import type { GameEventKind } from '../../engine/index';
import { content, DEFAULT_SETUP } from '../helpers';

/**
 * Golden playthrough: a fixed-seed greedy-bot game. Snapshot captures the
 * command script and a compact event digest. Rule changes are EXPECTED to
 * shift this — update the snapshot deliberately, never blindly.
 */
describe('golden playthrough (seed 7, warden+shadowfoot)', () => {
  it('matches the recorded run', () => {
    const r = runBotGame(content(), { ...DEFAULT_SETUP, seed: 7 }, greedyBot);
    const eventCounts: Partial<Record<GameEventKind, number>> = {};
    for (const e of r.events) eventCounts[e.kind] = (eventCounts[e.kind] ?? 0) + 1;

    expect({
      outcome: r.state.outcome,
      rounds: r.rounds,
      phaseIdx: r.state.phaseIdx,
      commands: r.commands,
      eventCounts,
      finalHeroes: r.state.heroes.map((h) => ({ classId: h.classId, hp: h.hp, downed: h.downed })),
      cardsPlaced: Object.keys(r.state.cards).length,
      clues: r.state.clues,
    }).toMatchSnapshot();
  });
});
