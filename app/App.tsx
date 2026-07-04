import { useEffect, useRef, useState } from 'react';
import { Board } from './Board';
import { ActionsPanel, CluesPanel, HeroPanel, LogPanel, ResolutionPanel } from './Panels';
import { useStore } from './store';

const PARTIES: Record<string, string[]> = {
  'Warden + Shadowfoot': ['warden', 'shadowfoot'],
  'Solo Warden': ['warden'],
  'Solo Shadowfoot': ['shadowfoot'],
  'Full party (3)': ['warden', 'shadowfoot', 'lorekeeper'],
};

export function App(): JSX.Element {
  const store = useStore();
  const { state } = store;
  const [seedInput, setSeedInput] = useState(String(store.seed));
  const autoRef = useRef(store.auto);
  autoRef.current = store.auto;

  // bot autoplay loop
  useEffect(() => {
    if (!store.auto) return;
    const id = setInterval(() => {
      const s = useStore.getState();
      if (!s.auto || !s.state || s.state.outcome) {
        s.setAuto(false);
        return;
      }
      s.botStep();
    }, 350);
    return () => clearInterval(id);
  }, [store.auto]);

  const outcome = state?.outcome;

  return (
    <div className="app">
      <header>
        <h1>🕯 The Silent Abbey</h1>
        <div className="toolbar">
          <label>
            seed{' '}
            <input value={seedInput} size={8} onChange={(e) => setSeedInput(e.target.value)} />
          </label>
          <select
            onChange={(e) => store.setParty(PARTIES[e.target.value] ?? PARTIES['Warden + Shadowfoot']!)}
            defaultValue="Warden + Shadowfoot"
          >
            {Object.keys(PARTIES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const n = Number(seedInput);
              store.newGame(Number.isFinite(n) ? n : undefined);
            }}
          >
            ▶ New game
          </button>
          <button onClick={() => store.botStep()} disabled={!state || !!outcome}>
            🤖 Bot step
          </button>
          <button onClick={() => store.setAuto(!store.auto)} disabled={!state || !!outcome}>
            {store.auto ? '⏸ Stop bot' : '⏩ Bot autoplay'}
          </button>
          <button onClick={() => store.saveToLocal()} disabled={!state}>💾 Save</button>
          <button onClick={() => store.loadFromLocal()}>📂 Load</button>
        </div>
      </header>

      <main>
        <div className="board-wrap">
          <Board />
          {outcome && (
            <div className={`outcome-banner ${outcome.kind}`}>
              {outcome.kind === 'win' ? `☀ VICTORY — ${outcome.detail}` : `☠ DEFEAT — ${outcome.detail}`}
              <button onClick={() => store.newGame(store.seed + 1)}>next seed ▶</button>
            </div>
          )}
        </div>
        <aside>
          <HeroPanel />
          <ActionsPanel />
          <ResolutionPanel />
          <CluesPanel />
          <LogPanel />
        </aside>
      </main>

      <footer>
        engine-pure prototype · every move is a command, every change an event ·{' '}
        <a href="https://github.com/ManuelKugelmann/AdventureGame">source</a>
      </footer>
    </div>
  );
}
