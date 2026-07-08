import { useMemo, useState } from 'react';
import {
  config,
  getHeroClassDef,
  getScenarioDef,
  type Command,
  type Theory,
} from '../engine/index';
import { legalForActive, useStore } from './store';

export function HeroPanel(): JSX.Element | null {
  const store = useStore();
  const { content, state } = store;
  if (!content || !state) return null;
  return (
    <div className="panel">
      <h3>Party — Round {state.round}/{getScenarioDef(content, state.setup.scenarioId).maxRounds} · Phase {state.phaseIdx + 1}</h3>
      {state.heroes.map((h) => {
        const def = getHeroClassDef(content, h.classId);
        const active = h.idx === state.activeHeroIdx;
        return (
          <div key={h.idx} className={`hero-row ${active ? 'active' : ''} ${h.downed ? 'downed' : ''}`}>
            <b>{h.idx + 1}. {def.name}</b>
            <span> ♥{h.hp}/{def.hp} · ⚡{h.ap} AP</span>
            <span className={h.detected ? 'detected' : 'hidden-tag'}> {h.downed ? 'DOWN' : h.detected ? 'DETECTED' : 'hidden'}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CluesPanel(): JSX.Element | null {
  const { state } = useStore();
  if (!state) return null;
  const aspects = ['who', 'where', 'how'] as const;
  return (
    <div className="panel">
      <h3>Diary {state.resolutionUnlocked ? '· accusation unlocked' : ''}</h3>
      {aspects.map((a) => (
        <div key={a} className="clue-row">
          <span className="clue-aspect">{a}</span>
          <span>{state.clues[a] ?? '???'}</span>
        </div>
      ))}
    </div>
  );
}

export function ActionsPanel(): JSX.Element | null {
  const store = useStore();
  const { content, state } = store;
  const legal = useMemo(() => legalForActive(store), [store]);
  if (!content || !state || state.outcome) return null;

  const activeHero = state.heroes[state.activeHeroIdx];
  const activeName = activeHero ? getHeroClassDef(content, activeHero.classId).name : `Hero ${state.activeHeroIdx + 1}`;
  const attacks = legal.filter((c): c is Extract<Command, { kind: 'Attack' }> => c.kind === 'Attack');
  const targetAttacks = store.selectedEnemyId ? attacks.filter((a) => a.targetId === store.selectedEnemyId) : attacks;
  const inspects = legal.filter((c) => c.kind === 'Inspect');
  const rehide = legal.find((c) => c.kind === 'ReHide');

  return (
    <div className="panel">
      <h3>▶ {activeName}'s turn <span className="turn-tag">(player {state.activeHeroIdx + 1})</span></h3>
      <label className="sneak-toggle">
        <input type="checkbox" checked={store.sneak} onChange={(e) => store.setSneak(e.target.checked)} />
        sneak (stealth moves)
      </label>
      <div className="action-buttons">
        {targetAttacks.slice(0, config.costs.attackMaxAp).map((a) => (
          <button key={`${a.targetId}-${a.ap}`} onClick={() => store.dispatch(a)}>
            ⚔ Attack {content.enemies[state.enemies[a.targetId]?.defId ?? '']?.name ?? a.targetId} ({a.ap} AP)
          </button>
        ))}
        {attacks.length > 0 && !store.selectedEnemyId && <div className="hint">tip: click an enemy on the board to focus it</div>}
        {inspects.map((c) => (
          <button key={`i${(c as Extract<Command, { kind: 'Inspect' }>).slotIdx}`} onClick={() => store.dispatch(c)}>
            ❖ Inspect
          </button>
        ))}
        {rehide && <button onClick={() => store.dispatch(rehide)}>🫥 Re-hide (1 AP)</button>}
        <button className="end-turn" onClick={() => store.dispatch({ kind: 'EndTurn' })}>
          ⏭ End turn
        </button>
      </div>
      <div className="hint">move: click an adjacent section · explore: click ↑ arrows</div>
    </div>
  );
}

export function ResolutionPanel(): JSX.Element | null {
  const store = useStore();
  const { content, state } = store;
  const [theory, setTheory] = useState<Partial<Theory>>({});
  if (!content || !state || !state.resolutionUnlocked || state.outcome) return null;
  const scenario = getScenarioDef(content, state.setup.scenarioId);
  const aspects = ['who', 'where', 'how'] as const;
  const chosen: Theory = {
    who: theory.who ?? state.clues.who ?? '',
    where: theory.where ?? state.clues.where ?? '',
    how: theory.how ?? state.clues.how ?? '',
  };
  const complete = aspects.every((a) => chosen[a] !== '');
  return (
    <div className="panel accuse">
      <h3>⚖ Name the guilty</h3>
      {aspects.map((a) => (
        <select key={a} value={chosen[a]} onChange={(e) => setTheory((t) => ({ ...t, [a]: e.target.value }))}>
          <option value="">— {a} —</option>
          {scenario.solution[a].map((v) => (
            <option key={v} value={v}>
              {v}{state.clues[a] === v ? ' ✓' : ''}
            </option>
          ))}
        </select>
      ))}
      <button
        disabled={!complete}
        onClick={() => complete && store.dispatch({ kind: 'CommitResolution', theory: chosen })}
      >
        Commit accusation (ends the game)
      </button>
    </div>
  );
}

export function LogPanel(): JSX.Element {
  const { log, error } = useStore();
  return (
    <div className="panel log-panel">
      <h3>Chronicle</h3>
      {error && <div className="error">⚠ {error}</div>}
      <div className="log-lines">
        {log.slice(-60).map((line, i) => (
          <div key={i} className={line.startsWith('—') ? 'log-round' : ''}>{line}</div>
        ))}
      </div>
    </div>
  );
}
