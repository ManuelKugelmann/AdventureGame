# CLAUDE.md

Digital prototype of a co-op roguelite card-laying dungeon crawler.

## 📚 Docs — read in this order
1. `project.md` — architecture, domain model, systems, phases (implementation source of truth)
2. `game_design.md` — full tabletop rules (only when project.md is ambiguous; it is large)

Conflict rule: project.md wins for code structure; game_design.md wins for game rules; ask if they disagree.

## 🧰 Commands
```
npm run dev            # vite dev server
npm test               # vitest (watch: npm test -- --watch)
npm run test:props     # property tests (fast-check, slower)
npm run lint           # eslint + tsc --noEmit
npm run content:build  # YAML → validated JSON (fails on schema/coverage errors)
npm run sim            # balance simulations → reports/*.csv
```
Run `lint` + `test` before considering any task done. `content:build` after touching `/content`.

## 🏗 Layout
```
/engine     pure TS core — NO react/dom/IO imports, no Date.now, no Math.random
/content    YAML sources (cards, enemies, scenarios, pools, decks)
/tools      content pipeline + balance sims
/app        React UI (Konva board, Zustand binding)
/tests      unit, property, golden playthroughs
```

## ⚖ Hard rules
- Engine purity: `applyCommand(state, cmd, rng) → {state, events}` — deterministic, seeded RNG only. UI dispatches commands; never mutates state.
- Fail early: throw on invariant violation. No silent fallbacks, no default-on-missing, no `catch`-and-continue. zod-parse every boundary (content, commands, saves).
- Strict TS: no `any`, no non-null `!` without a comment stating the invariant, `noUncheckedIndexedAccess` stays on.
- All rule numbers (AP costs, alert %, penalties, chokepoints) live in `engine/config.ts` — never inline magic numbers; they are calibration targets.
- Exhaustive switches over command/event unions (`satisfies never` default). Adding a variant must break compilation, not runtime.
- Event log is the save/replay format: any state change must be reproducible from events (`replay(events) ≡ state` property test must stay green).
- KISS/DRY: no new frameworks or abstraction layers without being asked. Prefer plain functions over classes.

## 🧩 Domain vocabulary (use these exact terms)
- **card** = location tile (landscape, bricklaid rows, subgraphs via gates)
- **section** = zone on a card (2-4; same section = melee; has cover + chokepoint)
- **alert** = per-card 0-3 (lower-bound escalation; never "alarm")
- **hidden/detected** = per-hero targeting state
- **phase deck** (1 card/round) vs **symbol cards** (event-triggered)
- **mystery token**: color = biome×tier, symbol = shortcut | rune
- **identity token**: VLN/PLT/MOB/EVT/NPC with tags; commits filter pools
- enemy HP = **state token swap** (healthy→wounded→critical), never numeric HP tracking

## 🧪 Testing expectations
- New system logic ⇒ unit tests same PR
- Rule changes ⇒ update golden playthroughs deliberately (never blind-snapshot-update)
- Bug fix ⇒ regression test first, then fix

## 🚫 Don't
- Don't edit generated `/content/*.json` (edit YAML, rebuild)
- Don't import engine from app via deep paths — only `engine/index.ts` public API
- Don't add UI state into GameState (selection, hover, camera live in Zustand UI store)
- Don't "fix" balance numbers ad hoc — flag them; calibration happens via `/tools` sims
- Don't presume completion: report what was verified (tests run, sim output), not "done"

## 🗺 Current phase
Phase 1: headless engine + balance sims. UI work is out of scope until Phase 1 exit criteria (see project.md) are met.
