import { useEffect, useRef, useState } from 'react';
import { Board } from './Board';
import { ActionsPanel, CluesPanel, HeroPanel, LogPanel, ResolutionPanel } from './Panels';
import { useStore } from './store';

const MAX_PLAYERS = 4;

/** Hot-seat party builder: 1–4 players, each picks a hero class (duplicates allowed). */
function PartyBuilder(): JSX.Element | null {
  const store = useStore();
  const classIds = store.content ? Object.keys(store.content.heroes) : [];
  if (!store.content || classIds.length === 0) return null;
  const party = store.party;
  const fallback = classIds[0]!; // content guarantees ≥1 hero class

  return (
    <div className="party-builder" aria-label="party">
      <span className="party-label">players</span>
      {party.map((classId, i) => (
        <select
          key={i}
          aria-label={`player ${i + 1} class`}
          value={classId}
          onChange={(e) => store.setParty(party.map((c, j) => (j === i ? e.target.value : c)))}
        >
          {classIds.map((id) => (
            <option key={id} value={id}>
              {store.content!.heroes[id]?.name ?? id}
            </option>
          ))}
        </select>
      ))}
      <button
        className="party-btn"
        title="add player"
        disabled={party.length >= MAX_PLAYERS}
        onClick={() => store.setParty([...party, fallback])}
      >
        ＋
      </button>
      <button
        className="party-btn"
        title="remove player"
        disabled={party.length <= 1}
        onClick={() => store.setParty(party.slice(0, -1))}
      >
        －
      </button>
    </div>
  );
}

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
          <PartyBuilder />
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
