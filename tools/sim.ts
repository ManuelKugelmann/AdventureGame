/**
 * Monte-Carlo balance simulations → reports/*.csv (Phase 1 exit criteria).
 *
 *   npm run sim -- [--games 200] [--seed0 1] [--policy greedy|random]
 *
 * Reports:
 *   dice.csv        hit/surge distributions per pool size
 *   stealth.csv     stealth success by class × alert level × route cost
 *   survival.csv    outcomes per party composition (greedy bot self-play)
 *   encounters.csv  encounter counts + alert profile over full games
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  config,
  greedyBot,
  makeRng,
  randomBot,
  rollDice,
  runBotGame,
  type BotPolicy,
  type ContentDB,
} from '../engine/index';
import { loadContent } from './loadContent';

const args = process.argv.slice(2);
function argNum(name: string, dflt: number): number {
  const i = args.indexOf(`--${name}`);
  const v = i >= 0 ? Number(args[i + 1]) : dflt;
  if (!Number.isFinite(v)) throw new Error(`bad --${name}`);
  return v;
}
const GAMES = argNum('games', 200);
const SEED0 = argNum('seed0', 1);
const POLICY: BotPolicy = args.includes('random') ? randomBot : greedyBot;
const policyName = args.includes('random') ? 'random' : 'greedy';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = join(root, 'reports');
mkdirSync(reportsDir, { recursive: true });
const content: ContentDB = loadContent();

function writeCsv(name: string, header: string[], rows: (string | number)[][]): void {
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
  writeFileSync(join(reportsDir, name), csv);
  console.log(`wrote reports/${name} (${rows.length} rows)`);
}

// ---- 1. dice distributions per pool size ----
{
  const rng = makeRng(1000 + SEED0);
  const N = 20_000;
  const rows: (string | number)[][] = [];
  for (let pool = 1; pool <= 6; pool++) {
    let zero = 0;
    let hitsSum = 0;
    let surgeSum = 0;
    for (let i = 0; i < N; i++) {
      const r = rollDice(rng, pool);
      if (r.hits === 0) zero++;
      hitsSum += r.hits;
      surgeSum += r.surges;
    }
    rows.push([pool, (zero / N).toFixed(4), (hitsSum / N).toFixed(3), (surgeSum / N).toFixed(3)]);
  }
  writeCsv('dice.csv', ['poolSize', 'pAutoFail', 'meanHits', 'meanSurges'], rows);
}

// ---- 2. stealth success by class × alert × route cost ----
{
  const rng = makeRng(2000 + SEED0);
  const N = 10_000;
  const rows: (string | number)[][] = [];
  for (const [classId, hero] of Object.entries(content.heroes)) {
    for (let alert = 0; alert <= 3; alert++) {
      const penalty = config.stealth.alertPenalty[alert];
      if (penalty === undefined) throw new Error('bad alert');
      for (let cost = 0; cost <= 4; cost++) {
        let ok = 0;
        for (let i = 0; i < N; i++) {
          const roll = rollDice(rng, config.stealth.dice);
          const budget = roll.hits - penalty + hero.skills.stealth;
          if (roll.hits > 0 && budget >= cost) ok++;
        }
        rows.push([classId, alert, cost, (ok / N).toFixed(4)]);
      }
    }
  }
  writeCsv('stealth.csv', ['class', 'alert', 'routeCost', 'pSuccess'], rows);
}

// ---- 3+4. full-game self-play: survival + encounters ----
{
  const parties: string[][] = [
    ['warden'],
    ['shadowfoot'],
    ['lorekeeper'],
    ['warden', 'shadowfoot'],
    ['warden', 'shadowfoot', 'lorekeeper'],
  ];
  const survivalRows: (string | number)[][] = [];
  const encounterRows: (string | number)[][] = [];
  for (const party of parties) {
    const label = party.join('+');
    const tally = { full: 0, partial: 0, miss: 0, doom: 0, wipe: 0 };
    let roundsSum = 0;
    let encountersSum = 0;
    let killsSum = 0;
    let alertSum = 0;
    let alertCards = 0;
    for (let g = 0; g < GAMES; g++) {
      const seed = SEED0 + g * 7919;
      const r = runBotGame(content, { scenarioId: 'silent_abbey', heroClassIds: party, seed }, POLICY);
      const outcome = r.state.outcome;
      if (!outcome) throw new Error('game without outcome');
      tally[outcome.detail] += 1;
      roundsSum += r.rounds;
      encountersSum += r.events.filter((e) => e.kind === 'EncounterSpawned').length;
      killsSum += r.events.filter((e) => e.kind === 'EnemyDefeated').length;
      for (const card of Object.values(r.state.cards)) {
        alertSum += card.alert;
        alertCards++;
      }
    }
    survivalRows.push([
      label,
      policyName,
      GAMES,
      (tally.full / GAMES).toFixed(3),
      (tally.partial / GAMES).toFixed(3),
      (tally.miss / GAMES).toFixed(3),
      (tally.doom / GAMES).toFixed(3),
      (tally.wipe / GAMES).toFixed(3),
      (roundsSum / GAMES).toFixed(2),
      (killsSum / GAMES).toFixed(2),
    ]);
    encounterRows.push([label, policyName, GAMES, (encountersSum / GAMES).toFixed(3), (alertSum / Math.max(1, alertCards)).toFixed(3)]);
    console.log(
      `${label.padEnd(30)} winFull=${(tally.full / GAMES).toFixed(2)} winPartial=${(tally.partial / GAMES).toFixed(2)} ` +
        `miss=${(tally.miss / GAMES).toFixed(2)} doom=${(tally.doom / GAMES).toFixed(2)} wipe=${(tally.wipe / GAMES).toFixed(2)} ` +
        `rounds=${(roundsSum / GAMES).toFixed(1)}`,
    );
  }
  writeCsv(
    'survival.csv',
    ['party', 'policy', 'games', 'winFull', 'winPartial', 'miss', 'doom', 'wipe', 'meanRounds', 'meanKills'],
    survivalRows,
  );
  writeCsv('encounters.csv', ['party', 'policy', 'games', 'meanEncounters', 'meanFinalAlert'], encounterRows);
}
