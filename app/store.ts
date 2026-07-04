import { create } from 'zustand';
import {
  applyCommand,
  createGame,
  greedyBot,
  legalCommands,
  makeRng,
  parseContent,
  replaySave,
  SaveSchema,
  type Command,
  type ContentDB,
  type GameState,
  type Rng,
  type SaveGame,
} from '../engine/index';
import { describeEvent } from './describe';

/** rng lives outside the store: mutable stream, not renderable state */
let gameRng: Rng | undefined;
let botRng: Rng | undefined;

const SAVE_KEY = 'adventure-game-save-v1';

export interface UiStore {
  content?: ContentDB;
  state?: GameState;
  commands: Command[];
  log: string[];
  seed: number;
  party: string[];
  sneak: boolean;
  auto: boolean;
  selectedEnemyId?: string;
  error?: string;

  init(content: ContentDB): void;
  newGame(seed?: number, party?: string[]): void;
  dispatch(cmd: Command): void;
  botStep(): void;
  setAuto(auto: boolean): void;
  setSneak(sneak: boolean): void;
  setSeed(seed: number): void;
  setParty(party: string[]): void;
  selectEnemy(id?: string): void;
  saveToLocal(): void;
  loadFromLocal(): void;
}

export const useStore = create<UiStore>((set, get) => ({
  commands: [],
  log: [],
  seed: Math.floor(Math.random() * 1_000_000), // UI-only convenience; engine gets it as an explicit seed
  party: ['warden', 'shadowfoot'],
  sneak: false,
  auto: false,

  init(content) {
    set({ content });
    get().newGame();
  },

  newGame(seed, party) {
    const { content } = get();
    if (!content) throw new Error('content not loaded');
    const s = seed ?? get().seed;
    const p = party ?? get().party;
    gameRng = makeRng(s);
    botRng = makeRng(s ^ 0x5eed);
    const { state, events } = createGame(content, { scenarioId: 'silent_abbey', heroClassIds: p, seed: s }, gameRng);
    const log = events.map((e) => describeEvent(content, e, p)).filter((x): x is string => !!x);
    set({ state, commands: [], log, seed: s, party: p, auto: false, selectedEnemyId: undefined, error: undefined });
  },

  dispatch(cmd) {
    const { content, state } = get();
    if (!content || !state || !gameRng) return;
    try {
      const res = applyCommand(content, state, cmd, gameRng);
      const lines = res.events
        .map((e) => describeEvent(content, e, state.setup.heroClassIds))
        .filter((x): x is string => !!x);
      set({
        state: res.state,
        commands: [...get().commands, cmd],
        log: [...get().log, ...lines].slice(-200),
        selectedEnemyId: get().selectedEnemyId && res.state.enemies[get().selectedEnemyId!] ? get().selectedEnemyId : undefined,
        error: undefined,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), auto: false });
    }
  },

  botStep() {
    const { content, state } = get();
    if (!content || !state || state.outcome || !botRng) return;
    const cmd = greedyBot(content, state, botRng);
    get().dispatch(cmd);
  },

  setAuto(auto) {
    set({ auto });
  },
  setSneak(sneak) {
    set({ sneak });
  },
  setSeed(seed) {
    set({ seed });
  },
  setParty(party) {
    set({ party });
  },
  selectEnemy(id) {
    set({ selectedEnemyId: id });
  },

  saveToLocal() {
    const { state, commands } = get();
    if (!state) return;
    const save: SaveGame = { version: 1, setup: state.setup, commands };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    set({ log: [...get().log, '💾 saved'] });
  },

  loadFromLocal() {
    const { content } = get();
    const raw = localStorage.getItem(SAVE_KEY);
    if (!content || !raw) return;
    try {
      const save = SaveSchema.parse(JSON.parse(raw));
      const { state, events, rng } = replaySave(content, save);
      gameRng = rng;
      botRng = makeRng(save.setup.seed ^ 0x5eed);
      const log = events.map((e) => describeEvent(content, e, save.setup.heroClassIds)).filter((x): x is string => !!x);
      set({
        state,
        commands: [...save.commands],
        log: log.slice(-200),
        seed: save.setup.seed,
        party: save.setup.heroClassIds,
        auto: false,
        selectedEnemyId: undefined,
        error: undefined,
      });
    } catch (e) {
      set({ error: `load failed: ${e instanceof Error ? e.message : String(e)}` });
    }
  },
}));

export function legalForActive(store: UiStore): Command[] {
  if (!store.content || !store.state) return [];
  return legalCommands(store.content, store.state);
}

export async function loadContentFromServer(): Promise<ContentDB> {
  const res = await fetch(`${import.meta.env.BASE_URL}content.json`);
  if (!res.ok) throw new Error(`failed to fetch content.json: ${res.status}`);
  return parseContent(await res.json());
}
