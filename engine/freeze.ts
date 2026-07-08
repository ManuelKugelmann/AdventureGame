/**
 * Recursively `Object.freeze` a value in place and return it.
 *
 * Used to make the "UI dispatches commands; never mutates state" rule a runtime
 * guarantee instead of a convention: `applyCommand`/`createGame` hand back a
 * frozen `GameState`, so any consumer that tries to mutate it throws in strict
 * mode (all our code is ES modules ⇒ strict) rather than silently corrupting the
 * event-sourced state. The engine itself only ever mutates fresh `structuredClone`
 * drafts, so freezing the *returned* value costs nothing internally.
 *
 * Gated by `config.debug.freezeState` — bulk simulation turns it off for throughput.
 */
export function deepFreeze<T>(value: T): T {
  // primitives and null are already immutable
  if (value === null || typeof value !== 'object') return value;
  // an already-frozen node was frozen with its whole subtree; also guards cycles
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
