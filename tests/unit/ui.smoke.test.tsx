// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ActionsPanel, CluesPanel, HeroPanel, LogPanel, ResolutionPanel } from '../../app/Panels';
import { useStore } from '../../app/store';
import { content } from '../helpers';

/**
 * UI smoke: the Zustand store drives the panels through a real game.
 * (The Konva canvas board needs a real browser and is exercised manually /
 * on GitHub Pages — everything else in the UI stack is covered here.)
 */

function Panels(): JSX.Element {
  return (
    <>
      <HeroPanel />
      <ActionsPanel />
      <ResolutionPanel />
      <CluesPanel />
      <LogPanel />
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('UI smoke (store + panels)', () => {
  it('renders a fresh game and reflects hero state', async () => {
    await act(async () => {
      useStore.getState().init(content());
      useStore.getState().newGame(7, ['warden', 'shadowfoot']);
      root.render(<Panels />);
    });
    expect(container.textContent).toContain('Warden');
    expect(container.textContent).toContain('Shadowfoot');
    expect(container.textContent).toContain('Round 1');
    expect(container.textContent).toContain('End turn');
    expect(container.textContent).toContain('???'); // no clues yet
  });

  it('dispatching commands updates the panels; bot autoplay finishes a game', async () => {
    await act(async () => {
      useStore.getState().init(content());
      useStore.getState().newGame(11, ['warden', 'shadowfoot']);
      root.render(<Panels />);
    });
    await act(async () => {
      useStore.getState().dispatch({ kind: 'MoveSection', toSection: 'cloister_wall' });
    });
    expect(useStore.getState().state?.heroes[0]?.section).toBe('cloister_wall');

    // bot plays the rest of the game through the same store the human uses
    await act(async () => {
      const s = useStore.getState;
      let guard = 0;
      while (!s().state?.outcome && guard++ < 2000) s().botStep();
    });
    const outcome = useStore.getState().state?.outcome;
    expect(outcome).toBeDefined();
    expect(container.textContent).toMatch(/VICTORY|DEFEAT/);
  });

  it('rejected commands surface as errors, not crashes', async () => {
    await act(async () => {
      useStore.getState().init(content());
      useStore.getState().newGame(3, ['warden']);
      root.render(<Panels />);
    });
    await act(async () => {
      useStore.getState().dispatch({ kind: 'MoveSection', toSection: 'no_such_section' });
    });
    expect(useStore.getState().error).toMatch(/not adjacent/);
    expect(container.textContent).toContain('not adjacent');
  });
});
