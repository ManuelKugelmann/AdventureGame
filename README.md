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

## v0 simplifications (vs full design)

- Exploration is forward-only (no backtracking links); biome-edge matching is trivial because the
  scenario is single-biome — walls only appear when a tile pool runs dry.
- Identity tokens, factions, gates/subgraphs, escort/social layers: not yet implemented (Phase 3).
- Balance numbers are first-pass calibration targets (`engine/config.ts`); current sims show solo
  play is too lethal — tune via `npm run sim`, not ad hoc.

Docs: `project.md` (architecture) · `game_design.md` (tabletop rules) · `CLAUDE.md` (contributor rules).
