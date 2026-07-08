import { useMemo, useState } from 'react';
import {
  config,
  getHeroClassDef,
  getScenarioDef,
  type Command,
  type Theory,
} from '../engine/index';
import { legalForActive, useStore } from './store';
import { classIcon, playerColor } from './format';

/** a line of filled + empty hearts, e.g. 7/8 → ♥♥♥♥♥♥♥♡ */
const hearts = (hp: number, max: number): string =>
  '♥'.repeat(Math.max(0, hp)) + '♡'.repeat(Math.max(0, max - hp));

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
          <div
            key={h.idx}
            className={`hero-row ${active ? 'active' : ''} ${h.downed ? 'downed' : ''}`}
            style={{ borderLeft: `3px solid ${playerColor(h.idx)}` }}
            title={[
              `${def.name} — player ${h.idx + 1}`,
              `HP ${h.hp}/${def.hp}`,
              `${h.ap} action points left`,
              h.downed ? 'Downed' : h.detected ? 'In the open' : 'Hidden',
              `Skills — combat ${def.skills.combat}, stealth ${def.skills.stealth}, magic ${def.skills.magic}, social ${def.skills.social}`,
            ].join('\n')}
          >
            <div className="hr-line">
              <span className="hr-name">
                <b style={{ color: playerColor(h.idx) }}>{h.idx + 1}</b> {classIcon(h.classId)} {def.name}
              </span>
              <span
                className={`hr-status ${h.downed ? 'downed-tag' : h.detected ? 'open-muted' : 'hidden-mark'}`}
                title={h.downed ? 'Downed' : h.detected ? 'In the open' : 'Hidden'}
              >
                {h.downed ? 'DOWN' : h.detected ? 'in the open' : 'HIDDEN'}
              </span>
              <span
                className="hr-ap ap-pips"
                title={[
                  `${h.ap} action points (⚡) left this turn`,
                  '',
                  `move a zone — ${config.costs.moveSection}⚡`,
                  `cross an exit — ${config.costs.crossExit}⚡`,
                  `inspect ❖ — ${config.costs.inspect}⚡`,
                  `hide — ${config.costs.reHide}⚡`,
                  `attack — 1–${config.costs.attackMaxAp}⚡ (more ⚡ = more dice)`,
                  '',
                  'refills each turn: class base + dice roll',
                ].join('\n')}
              >
                AP {h.ap > 0 ? '⚡'.repeat(h.ap) : '·'}
              </span>
            </div>
            <div className="hr-line hr-stats">
              <span className="hr-hp hp-hearts" title={`${h.hp}/${def.hp} HP`}>HP {hearts(h.hp, def.hp)}</span>
            </div>
            <div className="hr-line hr-skills" title="skills (inventory & armor systems not yet implemented)">
              <span title="combat" style={{ color: '#d9a05f' }}>⚔ {def.skills.combat >= 0 ? '+' : ''}{def.skills.combat}</span>
              <span title="stealth" style={{ color: '#6fc8c8' }}>🌫 {def.skills.stealth >= 0 ? '+' : ''}{def.skills.stealth}</span>
              <span title="magic" style={{ color: '#b088e0' }}>✨ {def.skills.magic >= 0 ? '+' : ''}{def.skills.magic}</span>
              <span title="social" style={{ color: '#7ec888' }}>💬 {def.skills.social >= 0 ? '+' : ''}{def.skills.social}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PoolsPanel(): JSX.Element | null {
  const { content, state } = useStore();
  if (!content || !state) return null;
  const stacks = [
    { sym: '▬', tag: 'T1', n: state.tilePools.tier1.length, color: '#c9a86a', label: 'tier-1 tiles left to explore into (shallower rows)' },
    { sym: '▬', tag: 'T2', n: state.tilePools.tier2.length, color: '#a86a4a', label: 'tier-2 tiles left (deeper, tougher rows)' },
    { sym: '❖', tag: 'T1', n: state.mysteryPools.tier1.length, color: '#7ec8e3', label: 'tier-1 mystery tokens left to draw' },
    { sym: '❖', tag: 'T2', n: state.mysteryPools.tier2.length, color: '#7ec8e3', label: 'tier-2 mystery tokens left' },
    { sym: '📖', tag: '', n: state.phaseDecks[state.phaseIdx]?.length ?? 0, color: '#c8b0d8', label: 'story cards left in the current phase deck' },
    { sym: '☠', tag: '', n: state.encounterPool.length, color: '#c88080', label: 'encounter enemy types (drawn with replacement)' },
  ];
  return (
    <div className="panel pools-panel">
      <h3 title={'Draw stacks still on the table.\nWhen a tile pool empties, further exits wall off.'}>Stacks</h3>
      <div className="stacks">
        {stacks.map((s, i) => (
          <span key={i} className="stack" title={`${s.n} ${s.label}`}>
            <span style={{ color: s.color }}>{s.sym}</span>{s.tag && <sub>{s.tag}</sub>} {s.n}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CluesPanel(): JSX.Element | null {
  const { state } = useStore();
  if (!state) return null;
  const aspects = ['who', 'where', 'how'] as const;
  return (
    <div className="panel">
      <h3 title="Clues you've uncovered. Reveal one of each (who / where / how) to unlock the accusation.">
        Diary {state.resolutionUnlocked ? '· accusation unlocked' : ''}
      </h3>
      {aspects.map((a) => (
        <div key={a} className="clue-row" title={`The ${a} of the crime — ${state.clues[a] ? 'revealed' : 'still unknown; find it via clue tokens'}.`}>
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
      <h3 title="Whose turn it is. Players share one screen and pass it on each turn.">
        ▶ {activeName}'s turn <span className="turn-tag">(player {state.activeHeroIdx + 1})</span>
      </h3>
      <div className="action-buttons">
        {targetAttacks.slice(0, config.costs.attackMaxAp).map((a) => (
          <button
            key={`${a.targetId}-${a.ap}`}
            title={`Spend ${a.ap} AP to roll ${a.ap} dice against this enemy (more AP = more dice). Cover and hidden-strike modify the roll.`}
            onClick={() => store.dispatch(a)}
          >
            ⚔ Attack {content.enemies[state.enemies[a.targetId]?.defId ?? '']?.name ?? a.targetId} ({a.ap}⚡)
          </button>
        ))}
        {attacks.length > 0 && !store.selectedEnemyId && <div className="hint">tip: click an enemy on the board to focus it</div>}
        {inspects.map((c) => (
          <button
            key={`i${(c as Extract<Command, { kind: 'Inspect' }>).slotIdx}`}
            title="Spend 1 AP to search a mystery ❖ slot in this section — draws a token (item, clue, trap, or rune)."
            onClick={() => store.dispatch(c)}
          >
            ❖ Inspect
          </button>
        ))}
        {rehide && (
          <button title="Spend 1 AP to slip into hiding (needs no awake enemy in your section)." onClick={() => store.dispatch(rehide)}>
            ◌ Hide (1⚡)
          </button>
        )}
        <button className="end-turn" title="End this hero's turn and pass to the next player." onClick={() => store.dispatch({ kind: 'EndTurn' })}>
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
    <div className="panel accuse" title="Pick who/where/how. Matching all three wins; a partial match is a lesser victory; wrong ends the run.">
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

const LOG_TOKENS = /(\[[▫▪✦]+\]|⚡+|[♥♡]+)/g;
/** style dice, AP (⚡) and HP (♥♡) glyphs within a log line */
function renderLogLine(line: string): (JSX.Element | string)[] {
  return line.split(LOG_TOKENS).map((part, j) => {
    if (/^\[[▫▪✦]+\]$/.test(part)) return <span key={j} className="log-dice">{part}</span>;
    if (/^⚡+$/.test(part)) return <span key={j} className="log-ap">{part}</span>;
    if (/^[♥♡]+$/.test(part)) return <span key={j} className="log-hp">{part}</span>;
    return part;
  });
}

export function LogPanel(): JSX.Element {
  const { log, error } = useStore();
  return (
    <div className="panel log-panel">
      <h3 title="Every event this game, newest at the bottom: turns, moves, rolls, damage, enemy activity, discoveries.">Chronicle</h3>
      {error && <div className="error">⚠ {error}</div>}
      <div className="log-lines">
        {log.slice(-60).map((line, i) => (
          <div key={i} className={line.startsWith('—') ? 'log-round' : ''}>{renderLogLine(line)}</div>
        ))}
      </div>
    </div>
  );
}
