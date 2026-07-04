import { describe, expect, it } from 'vitest';
import { applyCommand, makeRng } from '../../engine/index';
import type { Theory } from '../../engine/index';
import { content, newGame } from '../helpers';

function otherCandidate(aspect: 'who' | 'where' | 'how', not: string): string {
  const list = content().scenarios['silent_abbey']!.solution[aspect];
  const other = list.find((x) => x !== not);
  if (!other) throw new Error('need ≥2 candidates');
  return other;
}

describe('CommitResolution', () => {
  it('is illegal before being unlocked', () => {
    const { state } = newGame();
    expect(() =>
      applyCommand(content(), state, { kind: 'CommitResolution', theory: state.solution }, makeRng(1)),
    ).toThrow(/not unlocked/);
  });

  it('full match wins, 2/3 partial-wins, fewer is a miss (loss)', () => {
    const base = newGame().state;
    base.resolutionUnlocked = true;

    const full = applyCommand(content(), base, { kind: 'CommitResolution', theory: base.solution }, makeRng(1));
    expect(full.state.outcome).toEqual({ kind: 'win', detail: 'full' });

    const partialTheory: Theory = { ...base.solution, how: otherCandidate('how', base.solution.how) };
    const partial = applyCommand(content(), base, { kind: 'CommitResolution', theory: partialTheory }, makeRng(1));
    expect(partial.state.outcome).toEqual({ kind: 'win', detail: 'partial' });

    const missTheory: Theory = {
      who: otherCandidate('who', base.solution.who),
      where: otherCandidate('where', base.solution.where),
      how: base.solution.how,
    };
    const miss = applyCommand(content(), base, { kind: 'CommitResolution', theory: missTheory }, makeRng(1));
    expect(miss.state.outcome).toEqual({ kind: 'loss', detail: 'miss' });
  });

  it('rejects theories outside the candidate lists and any command after game end', () => {
    const base = newGame().state;
    base.resolutionUnlocked = true;
    expect(() =>
      applyCommand(content(), base, { kind: 'CommitResolution', theory: { who: 'nobody', where: 'nowhere', how: 'nohow' } }, makeRng(1)),
    ).toThrow(/not a candidate/);

    const done = applyCommand(content(), base, { kind: 'CommitResolution', theory: base.solution }, makeRng(1));
    expect(() => applyCommand(content(), done.state, { kind: 'EndTurn' }, makeRng(1))).toThrow(/game is over/);
  });
});
