# Adventure Game — digital prototype

Co-op roguelite card-laying dungeon crawler — playable prototype of **The Silent Abbey** scenario.

**▶ Play it: https://manuelkugelmann.github.io/AdventureGame/**

One pure TypeScript rules engine drives the web UI, the automated bot playtests, and the balance
simulations (same shape as [FieldworkGame](https://github.com/ManuelKugelmann/FieldworkGame)).

## What's in the prototype

- Full engine loop: AP dice, movement, bricklaid card exploration, per-card alert (0–3) with
  de-escalation/propagation/encounters, hidden/detected stealth, chokepoints, state-token combat,
  reactive enemy AI, mystery tokens (shortcuts + runes → symbol cards), phase decks, clue diary,
  and the who/where/how accusation endgame with a doom clock.
- **Hot-seat, 1–4 players**: pick each player's hero class on startup (duplicates allowed), then
  pass the shared screen — the active player's turn is named in the Actions panel.
- **Human play**: click sections to move (sneak toggle for stealth), click ↑ arrows to explore,
  click enemies to attack, inspect ❖ slots, accuse when unlocked. Save/load via command-log replay.
- **Bot play**: `🤖 Bot step` / `⏩ Bot autoplay` runs the greedy heuristic bot on the current game —
  the same bot that gates CI (20 matches must reach gameover) and drives balance sims.
- Event-sourced core: `applyCommand(state, cmd, rng) → {state, events}`; `replay(events) ≡ state`
  is property-tested with fast-check.

## Commands

```
npm run dev            # vite dev server
npm test               # vitest (unit + golden + bot playtest gate)
npm run test:props     # property tests (fast-check)
npm run test:e2e       # Playwright: bot plays a full game in real Chromium
npm run lint           # eslint + tsc --noEmit
npm run content:build  # YAML → validated JSON (fails on schema/coverage errors)
npm run sim            # balance simulations → reports/*.csv
npm run sim:sweep      # config-knob calibration sweeps → reports/sweep.csv
```

## Card topology

Each card lays its zones out in up to three bands — **entry** (bottom, 1–2 zones), **core** (middle),
**exit** (top, 1–2 zones). Exits are separate from top zones: an exit anchors to an exit zone and leads
to the left or right **brick above**; a top zone can exist with no exit. Every connected component of a
card's zone graph must hold an entry and a live exit (no orphan zones, no dead ends, every entry reaches
an exit). Some cards carry **hiding nooks** (limited occupants) that may conceal an **ambusher** — rolled
when a hero steps into an adjacent zone. Special cards like the **overpass** keep their two halves
disjoint, joined only by a `climb` **barrier edge** (crossable only by a special move — not yet in v0).

**Peek-ahead + doors**: standing in an unblocked exit's zone auto-reveals (and fully populates) the card
beyond — see before you commit. Exits may carry a **blocker**: an **openable door** (open it to pass, or
peek through first) or a **permanent grate** (peek through only, never crossable). Peeking through a
blocker scouts the next card without opening it.

## v0 simplifications (vs full design)

- Exploration is forward-only (no backtracking links); biome-edge matching is trivial because the
  scenario is single-biome — walls only appear when a tile pool runs dry.
- Barrier edges (climb/jump) render but aren't crossable yet — no special-move abilities in v0.
- Identity tokens, factions, gates/subgraphs, escort/social layers: not yet implemented (Phase 3).
- Balance numbers are first-pass calibration targets (`engine/config.ts`); current sims show solo
  play is too lethal — tune via `npm run sim`, not ad hoc.

Docs: `project.md` (architecture) · `game_design.md` (tabletop rules) · `CLAUDE.md` (contributor rules).
