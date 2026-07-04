import { describe, expect, it } from 'vitest';
import { replaySave, runBotGame, greedyBot, SaveSchema } from '../../engine/index';
import { content, DEFAULT_SETUP } from '../helpers';

describe('save format', () => {
  it('JSON round-trips a full game and replays to the identical state', () => {
    const setup = { ...DEFAULT_SETUP, seed: 31337 };
    const r = runBotGame(content(), setup, greedyBot);
    const save = { version: 1 as const, setup, commands: r.commands };

    // through the wire: stringify → parse → zod
    const wire = JSON.parse(JSON.stringify(save));
    const parsed = SaveSchema.parse(wire);
    const replayed = replaySave(content(), parsed);
    expect(replayed.state).toEqual(r.state);

    // and the state itself must be JSON-safe (no Maps/Dates/undefined-holes)
    expect(JSON.parse(JSON.stringify(r.state))).toEqual(r.state);
  });

  it('rejects malformed saves at the boundary', () => {
    expect(() => SaveSchema.parse({ version: 2, setup: DEFAULT_SETUP, commands: [] })).toThrow();
    expect(() => SaveSchema.parse({ version: 1, setup: DEFAULT_SETUP, commands: [{ kind: 'Fly' }] })).toThrow();
  });
});
