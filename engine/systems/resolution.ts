import { config } from '../config';
import type { Ctx } from '../ctx';
import { getScenarioDef } from '../model/content';
import type { Theory } from '../model/state';

/**
 * Commit a theory {who, where, how} against the hidden solution.
 * Matches: 3 = full win, 2 = partial win, otherwise a miss (loss) — the
 * accusation is the endgame either way.
 */
export function commitResolution(ctx: Ctx, heroIdx: number, theory: Theory): void {
  if (!ctx.draft.resolutionUnlocked) throw new Error('CommitResolution: resolution not unlocked');
  const scenario = getScenarioDef(ctx.content, ctx.draft.setup.scenarioId);
  for (const aspect of ['who', 'where', 'how'] as const) {
    if (!scenario.solution[aspect].includes(theory[aspect]))
      throw new Error(`CommitResolution: ${theory[aspect]} is not a candidate for ${aspect}`);
  }
  const solution = ctx.draft.solution;
  const matches = (['who', 'where', 'how'] as const).filter((a) => theory[a] === solution[a]).length;
  ctx.emit({ kind: 'ResolutionCommitted', heroIdx, theory, matches });

  if (matches >= config.resolution.fullMatches) {
    ctx.emit({ kind: 'GameEnded', outcome: { kind: 'win', detail: 'full' } });
  } else if (matches >= config.resolution.partialMatches) {
    ctx.emit({ kind: 'GameEnded', outcome: { kind: 'win', detail: 'partial' } });
  } else {
    ctx.emit({ kind: 'GameEnded', outcome: { kind: 'loss', detail: 'miss' } });
  }
}
