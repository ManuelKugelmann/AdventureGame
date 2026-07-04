/**
 * Engine public API — the only entry point for /app, /tools and /tests.
 */
export { config } from './config';
export type { Config } from './config';
export { makeRng, rollDice } from './rng';
export type { Rng, DiceRoll, DieFace } from './rng';

export * from './model/content';
export type {
  Aspect,
  CardInstance,
  EnemyInstance,
  GameState,
  HeroInstance,
  Outcome,
  Theory,
} from './model/state';
export {
  activeHero,
  enemiesIn,
  enemiesOn,
  getCard,
  getEnemy,
  getHero,
  gridKey,
  heroesOn,
  livingHeroes,
} from './model/state';
export { CommandSchema, parseCommand } from './model/commands';
export type { Command, CommandKind } from './model/commands';
export type { GameEvent, GameEventKind } from './model/events';

export { createGame, SetupSchema } from './setup';
export type { Setup } from './setup';
export { applyCommand } from './apply';
export { legalCommands } from './legal';
export { replaySave, foldEvents, SaveSchema } from './replay';
export type { SaveGame } from './replay';
export { randomBot, greedyBot, runBotGame } from './bots';
export type { BotPolicy, BotGameResult } from './bots';
export { adjacentSections, linkedCards, sectionBlocked } from './systems/graph';
export type { Pos } from './systems/graph';
export { nextHeroInRound } from './systems/turn';
