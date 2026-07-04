import { z } from 'zod';
import { applyCommand } from './apply';
import { applyEventMut } from './applyEvent';
import { CommandSchema } from './model/commands';
import type { ContentDB } from './model/content';
import type { GameEvent } from './model/events';
import type { GameState } from './model/state';
import { makeRng, type Rng } from './rng';
import { createGame, SetupSchema } from './setup';

/** Save format: setup + full command log. zod-parsed at the boundary. */
export const SaveSchema = z.object({
  version: z.literal(1),
  setup: SetupSchema,
  commands: z.array(CommandSchema),
});
export type SaveGame = z.infer<typeof SaveSchema>;

/**
 * Replay a save: reruns setup + every command against a fresh rng stream.
 * Deterministic — the same save always produces the same state and events.
 */
export function replaySave(
  content: ContentDB,
  saveRaw: unknown,
): { state: GameState; events: GameEvent[]; rng: Rng } {
  const save = SaveSchema.parse(saveRaw);
  const rng = makeRng(save.setup.seed);
  const game = createGame(content, save.setup, rng);
  let state = game.state;
  const events = [...game.events];
  for (const cmd of save.commands) {
    const res = applyCommand(content, state, cmd, rng);
    state = res.state;
    events.push(...res.events);
  }
  // rng is returned at its post-replay stream position so play can continue
  return { state, events, rng };
}

/**
 * Fold an event log over a base state — the replay(events) ≡ state property.
 * Note: createGame's own events are already folded into its returned state,
 * so only fold events from subsequent applyCommand calls.
 */
export function foldEvents(base: GameState, events: GameEvent[]): GameState {
  const draft = structuredClone(base);
  for (const ev of events) applyEventMut(draft, ev);
  return draft;
}
