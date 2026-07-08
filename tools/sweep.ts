/**
 * Config-knob calibration sweeps: for each knob value, run N seeded greedy-bot
 * games per party and record outcome rates → reports/sweep.csv.
 *
 *   npm run sim:sweep -- [--games 80]
 *
 * This is THE sanctioned way to explore balance changes (CLAUDE.md: no ad-hoc
 * number fixes). Baseline values are restored between sweep points, so the
 * last column pair of each knob's baseline row should match survival.csv.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, greedyBot, runBotGame } from '../engine/index';
import { loadContent } from './loadContent';

const args = process.argv.slice(2);
const gi = args.indexOf('--games');
const GAMES = gi >= 0 ? Number(args[gi + 1]) : 80;
if (!Number.isFinite(GAMES) || GAMES < 1) throw new Error('bad --games');

// bulk self-play discards every intermediate state; skip the freeze guard for throughput
config.debug.freezeState = false;

const content = loadContent();
const baseline = structuredClone(config);

function restoreBaseline(): void {
  for (const key of Object.keys(baseline) as (keyof typeof baseline)[]) {
    Object.assign(config[key], structuredClone(baseline[key]));
  }
}

interface Sweep {
  knob: string;
  values: number[];
  baselineValue: number;
  apply(v: number): void;
}

const sweeps: Sweep[] = [
  {
    knob: 'alert.encounterChancePct[3]',
    values: [30, 45, 60, 75, 90],
    baselineValue: baseline.alert.encounterChancePct[3] ?? 60,
    apply: (v) => {
      config.alert.encounterChancePct[3] = v;
    },
  },
  {
    knob: 'alert.encounterChancePct[2]',
    values: [10, 20, 30, 40],
    baselineValue: baseline.alert.encounterChancePct[2] ?? 30,
    apply: (v) => {
      config.alert.encounterChancePct[2] = v;
    },
  },
  {
    knob: 'turn.apDice',
    values: [1, 2, 3],
    baselineValue: baseline.turn.apDice,
    apply: (v) => {
      config.turn.apDice = v;
    },
  },
  {
    knob: 'alert.enemyCap',
    values: [4, 6, 8, 10],
    baselineValue: baseline.alert.enemyCap,
    apply: (v) => {
      config.alert.enemyCap = v;
    },
  },
];

const parties: string[][] = [['warden'], ['warden', 'shadowfoot']];
const rows: (string | number)[][] = [];

for (const sweep of sweeps) {
  for (const value of sweep.values) {
    restoreBaseline();
    sweep.apply(value);
    for (const party of parties) {
      let win = 0;
      let wipe = 0;
      let roundsSum = 0;
      for (let g = 0; g < GAMES; g++) {
        const seed = 1 + g * 7919; // identical seeds across points → comparable
        const r = runBotGame(content, { scenarioId: 'silent_abbey', heroClassIds: party, seed }, greedyBot);
        const outcome = r.state.outcome;
        if (!outcome) throw new Error('game without outcome');
        if (outcome.kind === 'win') win++;
        if (outcome.detail === 'wipe') wipe++;
        roundsSum += r.rounds;
      }
      rows.push([
        sweep.knob,
        value,
        value === sweep.baselineValue ? 'baseline' : '',
        party.join('+'),
        GAMES,
        (win / GAMES).toFixed(3),
        (wipe / GAMES).toFixed(3),
        (roundsSum / GAMES).toFixed(2),
      ]);
      console.log(
        `${sweep.knob}=${String(value).padEnd(3)} ${party.join('+').padEnd(20)} win=${(win / GAMES).toFixed(2)} wipe=${(wipe / GAMES).toFixed(2)}`,
      );
    }
  }
}
restoreBaseline();

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'reports'), { recursive: true });
const csv =
  ['knob,value,isBaseline,party,games,winRate,wipeRate,meanRounds', ...rows.map((r) => r.join(','))].join('\n') + '\n';
writeFileSync(join(root, 'reports', 'sweep.csv'), csv);
console.log(`wrote reports/sweep.csv (${rows.length} rows)`);
