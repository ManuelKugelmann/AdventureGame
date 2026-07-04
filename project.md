# PROJECT — Digital Implementation

Digital prototype of the co-op roguelite card-laying dungeon crawler.
Rules source of truth: `game_design.md` (framework locked; numbers are first-pass).

---

## 🎯 Goals

1. Validate balance (dice, AP, alert, stealth, encounter rates) before physical production
2. Solo-playable digital scenario end-to-end
3. Content authoring pipeline (YAML → runtime)
4. Later: remote co-op, PWA/native wrap

Non-goals (prototype): final art, animation polish, i18n, accounts, monetization.

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────┐
│ UI (React + Konva)     ← renders state, sends   │
│                          commands only           │
├────────────────────────────────────────────────┤
│ ENGINE (pure TS)       ← deterministic core      │
│   - command → validate → events → new state      │
│   - seeded RNG, no Date/random/IO                │
├────────────────────────────────────────────────┤
│ CONTENT (YAML → zod → frozen JSON)               │
└────────────────────────────────────────────────┘
```

Principles:
- ★ Engine is pure and deterministic: `(state, command, rng) → {state', events[]}`
- ★ Fail early: zod at all boundaries, invariant asserts in engine, no silent fallbacks
- ★ Event log = replay = save format = test fixtures
- ★ UI never mutates state; dispatches commands only
- ★ KISS: no ECS framework, no redux — plain reducers + Zustand for UI binding

---

## 🧰 Stack

| Layer | Choice |
|---|---|
| Language | TypeScript, strict, `noUncheckedIndexedAccess` |
| Build | Vite |
| UI | React + Konva (canvas board) + Tailwind (chrome) |
| State (UI) | Zustand (thin binding over engine state) |
| Validation | zod (content + commands + save files) |
| Tests | vitest (+ fast-check for property tests) |
| Content | YAML source → build step → typed JSON |
| RNG | seeded PRNG (e.g. mulberry32); seed in save |
| Deploy | Cloudflare Pages / Vercel (static) |
| Later: multiplayer | Yjs or Liveblocks (CRDT over event log) |
| Later: native | PWA → Capacitor (mobile) / Tauri (desktop) |

---

## 📦 Repo layout

```
/engine          pure TS core (no react, no dom)
  /model         types + zod schemas
  /systems       turn, movement, combat, stealth, alert, ai,
                 story, pools, mystery, resolution
  /rng           seeded PRNG
  index.ts       applyCommand(state, cmd, rng)
/content         YAML sources
  /cards         location cards
  /enemies       enemy defs (state variants)
  /scenarios     scenario decl + phase decks + symbol cards
  /pools         mystery pools, identity tokens
/tools           content build + validation CLI, balance sims
/app             React UI
/tests           unit, property, golden playthroughs
```

---

## 🧩 Domain model (engine/model)

### Static content (from YAML)

```
CardDef        id, biome, subPool?, tier, art
               sections[2-4]: {id, cover: open|partial|covered,
                               chokepoint: 1-5, slots[], storyMarker?}
               sectionEdges[]: {a, b, condition?}
               entrySection, topExits[1-2]: {section, biomeEdge}
               gate?: {type, unlockCondition, targetPoolId}

EnemyDef       id, tags[], ini: 1-5,
               states[1-3]: {atkDice, def, abilities[]}   // token swap
               sleeper?: bool

HeroClassDef   id, apBase, hp, skills{combat,stealth,magic,social: -1|0|+1},
               surges[], startItems[]

MysteryTokenDef  id, colors[1-2], symbol: shortcut|rune, payload

IdentityTokenDef id, category: VLN|PLT|MOB|EVT|NPC, tags[],
                 effects{immediate?, lasting?, trigger?, cardModifier?}

StoryCardDef   id, phase, type: LORE|CLUE|NPC|EVENT|CHOICE|QUIET|
                              COMBAT|HAZARD|TREASURE|RESOLUTION,
               text, constraints?, cardModifier?, advancePhase?: bool

SymbolCardDef  id, trigger: {kind, params}, oneShot: bool, effect

ScenarioDef    id, startBiome, initialPools{}, phases[],
               declaredLayers{escort?, social?, city?, ...},
               resolution: {kind: ACCUSATION|HUNT|CAPTURE|..., pools[]}
```

### Runtime state (single serializable object)

```
GameState
  seed, round, startPlayerIdx
  subgraphs[]: {id, grid: Map<row,col → CardInstance>}
  cards: Map<cardInstanceId → {defId, alert: 0-3, alertAge,
                               statusMarkers[], slotStates[],
                               enemies[], revealed}>
  enemies: Map<id → {defId, stateIdx, section, acted, sleeper}>
  heroes[]: {classId, hp, ap, position{card,section},
             detected: bool, inventory[], statuses[]}
  pools: Map<poolId → {items[], committedTags[]}>   // shuffled stacks
  story: {phaseIdx, phaseDeck[], symbolDeck[], diary[]}
  factions[]: {id, reputation, committed}
  flags: Map<string, value>                          // scenario flags
```

### Commands (player intents; exhaustive union)

```
MoveSection | CrossExit | UseGate | Attack{targetId, ap} |
StealthMove{route[]} | ReHide | Inspect | Interact | TalkNPC |
PickLoot | UseAbility | CommitResolution{theory} | EndTurn
```

### Events (emitted; drive UI + log)

```
Moved, CardRevealed, AlertChanged, HeroDetected, HeroHidden,
DiceRolled, DamageDealt, EnemyStateSwapped, EnemyDefeated,
EnemyActed, TokenDrawn, RuneTriggered, StoryCardDrawn,
PhaseAdvanced, PoolFiltered, TagCommitted, FactionCommitted,
EncounterSpawned, GateUnlocked, TierUnlocked, ResolutionOutcome, ...
```

---

## ⚙ Systems — rules to implement

Numbers below are first-pass; make ALL tunable via a single `config.ts` (calibration surface).

### Dice
- d6: 3 blank / 2 hit / 1 surge (surge = hit + effect)
- 0 hits on any roll = auto-fail

### Round / turn
1. Round start: rotate start player; reset enemy `acted`; alert de-escalation ladder
2. Hero turns in order: AP = classBase + hits(2d)
3. Round end: resolve unacted enemies (INI desc, distance, player choice);
   encounter checks per card alert; alert propagation; draw 1 phase card;
   phase-advance check; symbol trigger queue flush

### Movement
- 1 AP: section↔section, card exit, gate transit
- Chokepoint: enemies in section ≥ chokepoint ⇒ transit through blocked
- Bricklaying placement on exit into unrevealed row; biome-edge match else wall token

### Alert (per card, 0-3, lower-bound)
- ≥1 unstealthed hero movement on card
- ≥2 hero shares zone with committed enemy (neutrals/💤 exempt)
- ≥3 any enemy on card damaged
- De-escalate at round start: 3→2 (card cleared + empty), 2→1 (empty 2t), 1→0 (empty 3t)
- Propagation at round end: alert3 → adjacent 0→1, 1→2; alert2 → adjacent 0→1
- Encounter chance/turn: 0/10/30/60%; severity escalates with sustained alert 3

### Hero HIDDEN/DETECTED
- Detect on: attack, zone-share with enemy, stealth fail, loud action, open section @ alert≥2
- Re-hide: AP + stealth roll, no enemy in section; reset to hidden on card transition
- Hidden heroes not targetable; first strike from hidden: +1d

### Stealth
- budget = hits − alertPenalty[0,1,2,4] + skill
- section cost: covered 0 / partial 1 / open 2; stop or commit-and-fail

### Combat
- Attack: spend X AP → roll X d + weapon/class mods; net = hits − DEF
- net ≥1: advance enemy state token per net hit (weak enemies: 1 state)
- Cover of defender's section: ±1 DEF

### Enemy AI (reactive)
- Triggers: hero enters section (1 enemy resolves), exits (1), round end (rest)
- Priority: INI desc → closer → player choice
- Targeting: nearest DETECTED hero; tie → first in play order
- Action: alert≥2 & same section → attack; alert3 → move toward target;
  alert2 → investigate; ≤1 → idle/patrol

### Story
- Phase decks: shuffled per phase; 1 draw/round; advance on exhaustion or flag
- Symbol cards: trigger registry keyed by event kind; fire mid-turn (interrupt) or round-end (phase transitions)
- CardModifier effects: unlock tier (add tiles + mystery color/shade to pools), inject named tokens, unlock gates, add cards to decks

### Pools & constraints
- All pools = shuffled stacks; draw = pop
- TagCommitted ⇒ filter pools: keep matching-tag or bridge items (eager) — or lazy discard-on-draw (per scenario flag)
- Faction commit on first tagged reveal → faction state

### Mystery
- ❖ inspect → draw from pool(color = biome×subPool, shade = tier); grey fallback
- shortcut symbol → immediate effect; rune → lookup symbol card (must exist — validate at content build)

### Resolution
- Commit theory {who, where, how} → draw from filtered pools → match tier: full / partial (tags) / miss → scenario outcome

---

## 🛡 Fail-early rules

- zod-parse all content at build; **build fails** on: rune without symbol card, gate without target pool, phase deck without advance path, section graph disconnected, card without forward exit
- Engine invariant asserts (throw, never warn): AP ≥ 0, alert ∈ 0-3, enemy stateIdx valid, hero position exists, pool draw on empty pool without declared fallback
- Every command validated against state before apply; invalid ⇒ typed error, no partial mutation

---

## 🗓 Phases

| # | Deliverable | Validates | ~Effort |
|---|---|---|---|
| 1 | Headless engine + balance sims (CLI) | dice/AP/alert/stealth/combat math | 1-2 w |
| 2 | Web playground: 1 handcrafted scenario, board render, movement, combat, mystery | feel, turn flow, UI model | 3-4 w |
| 3 | Full flow: phase/symbol decks, pools/constraints, factions, resolution, save/replay | narrative pipeline | 4-6 w |
| 4 | Multiplayer (event-log sync via Yjs/Liveblocks) | co-op | 2-3 w |
| 5 | Authoring: YAML schemas + validator CLI + card preview | content scaling | 2-3 w |
| 6 | PWA + Capacitor/Tauri wrap | distribution | 1-2 w |

Phase 1 exit criteria: sim reports for
- hit/surge distributions per pool size
- survival rate per class vs enemy tiers at attack AP splits
- stealth success by cover mix × alert level
- encounter frequency per alert profile over N-round scenarios

---

## 🧪 Testing

- Unit: each system reducer
- Property (fast-check): pool filter never removes bridges; alert monotone under triggers; AP conservation; replay(eventLog) ≡ state
- Golden playthroughs: scripted command sequences per scenario, snapshot final state + event log
- Sim harness (tools/): Monte-Carlo balance reports → CSV

---

## ❓ Open (resolve during Phase 1-2)

- Phase-card tempo (1/round may be noisy — config flag: resolve QUIET silently?)
- Melee vs blocking chokepoint: attack into blocked zone from adjacent allowed? (current: ranged yes, melee no — verify no stalls)
- Lazy vs eager pool filtering default
- Alert glyph set final; biome/sub-pool glyph collisions (🔮, 💀)
- Multi-hero trigger ordering stress test (4 heroes × propagation)
