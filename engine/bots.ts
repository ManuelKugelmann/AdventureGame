import { applyCommand } from './apply';
import { legalCommands } from './legal';
import type { Command } from './model/commands';
import type { ContentDB } from './model/content';
import { getScenarioDef } from './model/content';
import type { GameEvent } from './model/events';
import type { GameState, Theory } from './model/state';
import { activeHero, enemiesOn, getCard } from './model/state';
import type { Rng } from './rng';
import { makeRng } from './rng';
import type { Setup } from './setup';
import { createGame } from './setup';

/** A bot policy: given the state and its own rng, choose one legal command. */
export type BotPolicy = (content: ContentDB, state: GameState, rng: Rng) => Command;

function knownClues(state: GameState): number {
  return (['who', 'where', 'how'] as const).filter((a) => state.clues[a] !== undefined).length;
}

/** Theory from revealed clues; unknown aspects guessed via rng. */
function buildTheory(content: ContentDB, state: GameState, rng: Rng): Theory {
  const scenario = getScenarioDef(content, state.setup.scenarioId);
  const pickAspect = (a: 'who' | 'where' | 'how'): string => state.clues[a] ?? rng.pick(scenario.solution[a]);
  return { who: pickAspect('who'), where: pickAspect('where'), how: pickAspect('how') };
}

/** Uniform random over legal commands; only commits a theory once all clues are known. */
export const randomBot: BotPolicy = (content, state, rng) => {
  const legal = legalCommands(content, state).filter((c) => c.kind !== 'CommitResolution');
  if (state.resolutionUnlocked && knownClues(state) === 3) {
    return { kind: 'CommitResolution', theory: buildTheory(content, state, rng) };
  }
  return rng.pick(legal);
};

/**
 * Heuristic playtest bot: fight what's in front of it, loot mystery slots,
 * push upward through exits, hide when hurt, accuse when confident (or when
 * the doom clock forces its hand).
 */
export const greedyBot: BotPolicy = (content, state, rng) => {
  const legal = legalCommands(content, state);
  const hero = activeHero(state);
  const byKind = <K extends Command['kind']>(k: K): Extract<Command, { kind: K }>[] =>
    legal.filter((c): c is Extract<Command, { kind: K }> => c.kind === k);

  const scenario = getScenarioDef(content, state.setup.scenarioId);
  const clues = knownClues(state);

  // accuse: certain, or forced by the doom clock with decent knowledge
  if (state.resolutionUnlocked) {
    const roundsLeft = scenario.maxRounds - state.round;
    if (clues === 3 || (clues >= 2 && roundsLeft <= 1)) {
      return { kind: 'CommitResolution', theory: buildTheory(content, state, rng) };
    }
  }

  // fight enemies in reach (biggest swing first)
  const attacks = byKind('Attack');
  if (attacks.length > 0) {
    const best = attacks.reduce((a, b) => (b.ap > a.ap ? b : a));
    // don't dump the whole turn into one swing unless threatened
    const threatened = enemiesOn(state, hero.cardId).some((e) => !e.sleeper && e.section === hero.section);
    const capped = attacks.filter((a) => a.targetId === best.targetId && a.ap <= (threatened ? 3 : 2));
    if (capped.length > 0) return capped.reduce((a, b) => (b.ap > a.ap ? b : a));
  }

  // loot what's here
  const inspects = byKind('Inspect');
  const first = inspects[0];
  if (first) return first;

  // hurt + seen + alone: try to vanish
  if (hero.detected) {
    const rehide = byKind('ReHide')[0];
    if (rehide && getCard(state, hero.cardId).alert >= 2) return rehide;
  }

  // explore upward
  const exits = byKind('CrossExit');
  const exit = exits[0];
  if (exit) return exit;

  // walk toward something useful: prefer stealth at high alert, normal move otherwise
  const moves = byKind('MoveSection');
  const stealthMoves = byKind('StealthMove');
  const alert = getCard(state, hero.cardId).alert;
  if (!hero.detected && alert >= 2 && stealthMoves.length > 0) return rng.pick(stealthMoves);
  if (moves.length > 0) return rng.pick(moves);

  return { kind: 'EndTurn' };
};

export interface BotGameResult {
  state: GameState;
  events: GameEvent[];
  commands: Command[];
  rounds: number;
}

/**
 * Drive a full game with a bot policy until it ends. The game rng comes from
 * setup.seed; the bot's tie-break rng is derived from it so runs are fully
 * reproducible. Throws if the game fails to terminate within the command cap
 * (which the doom clock makes impossible unless the engine is broken).
 */
export function runBotGame(content: ContentDB, setup: Setup, policy: BotPolicy, maxCommands = 10_000): BotGameResult {
  const rng = makeRng(setup.seed);
  const botRng = makeRng(setup.seed ^ 0x5eed);
  const game = createGame(content, setup, rng);
  let state = game.state;
  const events = [...game.events];
  const commands: Command[] = [];

  while (!state.outcome) {
    if (commands.length >= maxCommands) throw new Error(`bot game did not terminate in ${maxCommands} commands`);
    const cmd = policy(content, state, botRng);
    const res = applyCommand(content, state, cmd, rng);
    state = res.state;
    events.push(...res.events);
    commands.push(cmd);
  }
  return { state, events, commands, rounds: state.round };
}
