import { describe, expect, it } from 'vitest';
import { greedyBot, randomBot, runBotGame } from '../engine/index';
import { content, DEFAULT_SETUP } from './helpers';

/**
 * CI gate: bot self-play through the real engine must always reach a game
 * end — no stalls, no invariant violations, no crashes.
 */
describe('automated playtests (smoke gate)', () => {
  it('20 greedy-bot matches reach gameover', () => {
    let wins = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = runBotGame(content(), { ...DEFAULT_SETUP, seed }, greedyBot);
      expect(r.state.outcome).toBeDefined();
      expect(r.rounds).toBeLessThanOrEqual(16);
      if (r.state.outcome?.kind === 'win') wins++;
    }
    // balance sanity: the heuristic bot must not be hopeless
    expect(wins).toBeGreaterThan(0);
  });

  it('10 random-bot matches reach gameover (chaos monkey)', () => {
    for (let seed = 101; seed <= 110; seed++) {
      const r = runBotGame(content(), { ...DEFAULT_SETUP, seed }, randomBot);
      expect(r.state.outcome).toBeDefined();
    }
  });

  it('solo and 3-hero parties also terminate', () => {
    for (const heroClassIds of [['warden'], ['warden', 'shadowfoot', 'lorekeeper']]) {
      for (let seed = 201; seed <= 205; seed++) {
        const r = runBotGame(content(), { ...DEFAULT_SETUP, heroClassIds, seed }, greedyBot);
        expect(r.state.outcome).toBeDefined();
      }
    }
  });
});
