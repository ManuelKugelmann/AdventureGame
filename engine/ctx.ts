import { applyEventMut } from './applyEvent';
import type { ContentDB } from './model/content';
import type { GameEvent } from './model/events';
import type { GameState } from './model/state';
import type { Rng } from './rng';

/**
 * Decide-phase context: systems emit events; each event is immediately folded
 * into the draft so later decisions see the updated state. The event list is
 * the authoritative record — replaying it over the pre-command state must
 * reproduce the draft (property tested).
 */
export interface Ctx {
  content: ContentDB;
  draft: GameState;
  rng: Rng;
  events: GameEvent[];
  emit(ev: GameEvent): void;
}

export function makeCtx(content: ContentDB, draft: GameState, rng: Rng): Ctx {
  const events: GameEvent[] = [];
  return {
    content,
    draft,
    rng,
    events,
    emit(ev: GameEvent): void {
      events.push(ev);
      applyEventMut(draft, ev);
    },
  };
}
