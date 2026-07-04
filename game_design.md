# Untitled Roguelite Dungeon Crawler — Game Design

> Working design document. Mechanical foundation locked at the system level.
> Specific numbers, content, and production decisions remain to be calibrated and authored.

---

## 🎯 Identity

**Genre**: Cooperative roguelite tactical dungeon crawler with procedural card-laying.

**Players**: 1–4, cooperative. No GM.

**Length**: ~90 min/scenario; campaign across multiple scenarios.

**Lineage**:
- **CoraQuest** — direct ancestor (cooperative tile-laying with quest book + danger track)
- **Karak** — procedural tile-with-monster-on-it pool
- **HeroQuest** — tactical density and class identity
- **Fighting Fantasy / playbook adventures** — narrative branching at scripted tiles
- **Mage Knight** — class-specific expendable resources (not cooldowns)
- **Gloomhaven** — scenario-driven roguelite campaign

This is essentially **CoraQuest's framework grown up**: same coop tile-laying narrative core, lifted into tactical depth with stealth, sight, cover, and roguelite meta-progression.

---

## ⚡ Core loop

```
Round     → Rotate start player → hero turns in order → enemy cleanup
             → 1 phase card drawn → round ends
Turn      → Roll AP → Spend AP on actions → End turn
Room      → Enter card → Reveal slots → Resolve encounters
Segment   → Push through pressure → No long rests inside delves
Break     → Soft scenario break: full recovery, narrative beat, all card alerts reset to default
Scenario  → Multi-segment arc → Full reset on completion
Run       → Multi-scenario campaign → Permadeath
Campaign  → Across runs: meta-progression unlocks
```

---

## 🎲 Universal dice convention

**Single custom d6 type. Roll a pool; count successes.**

```
Die face distribution (6 sides):
  3× blank
  2× hit
  1× surge ★    (counts as a hit AND triggers printed effect)

Per die:  50% hit chance / 16.7% surge chance
```

### Resolution formula

```
ROLL    = (hits counted, including surges) + stat (-1 / 0 / +1)
TARGET  = base threshold ± situation modifier (-1 / 0 / +1)

PASS    if ROLL ≥ TARGET

AUTO-FAIL on 0 hits in the entire pool, regardless of stat.
```

### Pool sizes by capability

| Pool | E[hits] | P(0 hits) | P(≥1 surge) |
|---|---|---|---|
| 1d | 0.5 | 50% | 17% |
| 2d | 1.0 | 25% | 31% |
| 3d | 1.5 | 12.5% | 42% |
| 4d | 2.0 | 6.3% | 52% |
| 5d | 2.5 | 3.1% | 60% |

★ Pool size encodes capability. Bigger pool = lower auto-fail rate + more surge frequency.

### Applies to

Combat hits, stealth check (as budget mechanic), skill checks (disarm, search, force, dispel), AP roll. One mechanic, one die type, applied everywhere.

### Surge ★

Counts as 1 hit (avoiding auto-fail). Also fires a printed surge effect on the weapon / spell / class action / item being used. Multiple surges in a pool fire multiple effect triggers (each printed effect fires once; cumulative effects stack).

Universal: ~30% surge frequency at 2-die pool; scales with pool size.

---

## 🏃 Action Points

**AP per turn = `class_base + successes from 2d roll`**

Same 2d AP pool for everyone. Class identity lives in the base value.

### Class AP base

| Class   | Base | Avg AP | Range |
|---------|------|--------|-------|
| Heavy   | 3    | 4.0    | 3–5   |
| Knight  | 4    | 5.0    | 4–6   |
| Mage    | 4    | 5.0    | 4–6   |
| Priest  | 4    | 5.0    | 4–6   |
| Rogue   | 5    | 6.0    | 5–7   |
| Scout   | 6    | 7.0    | 6–8   |

★ AP minimum = class base (auto-fail on AP roll = base only; never zero-AP turn).

### Random encounter trigger

```
AP roll = 0 successes AND current card alert ≥ 1 → random encounter triggered
  Hero's AP = base only (no bonus)
  Encounter drawn from incursion deck
  Encounter severity tiered by current card alert + duration:
    Alert 1                → minor   (patrol, noise, distant threat)
    Alert 2 (turn 1-2)     → medium  (wandering monster, scout, hazard)
    Alert 2 (sustained 3+) → major   (reinforcement, tier-3 elite, boss attention)
```

Trigger fires on AP auto-fail when on an aware card. Card alert tunes consequence severity.

### Action costs (first-pass, calibrate via playtest)

| Action | AP |
|---|---|
| Move 1 section | 1 |
| Cross top exit into new card | 1 |
| Activate gate (subgraph transition) | 1 |
| Basic attack (same section) | 2 |
| Heavy attack | 3 |
| Ranged attack (cross-section) | 2 |
| REDIRECT peek (sight only) | 2 |
| Cantrip | 2 |
| Standard spell | 3 |
| Major spell | 4 + 1 expendable |
| Ritual | 5 + 2 expendables |
| Search wall / inspect mystery | 1 |
| Disarm trap | 2 |
| Force door / wall (also: +1 HP) | 3 |
| Loot pickup | 1 |
| Talk to NPC | 1–2 |
| Wait | 0 |
| Eat food (free 1×/turn) | 0 |
| Camp activation per hero | 4 |
| Shrine activation | 3 |

### HP-cost actions (exhaustion)

Some actions cost +1 HP on top of AP: force door, sprint, carry ally, sustained ability use.

### No cooldowns

Spam-prevention via AP cost + expendable + positional/condition gates. Never a cooldown counter.

---

## 🗺 Cards & map

### Card orientation — landscape with directional flow

Cards are **landscape-aspect**, with fixed orientation. Bottom is always entry, top has 1-2 exits, sides are walls.

```
+──────────────────────────────────────────────+
│  [exit A]              [exit B]               │ ← top: 1 or 2 normal exits
│                                                │
│                                                │
│    [painted environmental scene with depth     │
│     point-and-click adventure aesthetic]       │
│                                                │
│    [transparent overlay: sections, slots,        │
│     internal section graph]             │
│                                                │
│              [central gate]                     │ ← optional central exit
│                                                │   to separate subgraph
│                                                │
│                                                │
│                  [entry]                       │ ← bottom: single entry
+──────────────────────────────────────────────+
```

★ Direction is built-in. UP = forward/deeper. Cards do not rotate freely. Side edges are always walls.

### Bricklaying placement (offset rows)

Cards lay in **offset rows** — like brickwork. Each card sits on top of two cards in the row below, connected via the row-below cards' top exits.

```
Row 4:    [.....][.....][.....][.....]
Row 3:       [.....][.....][.....]            ← brick offset
Row 2:    [.....][.....][.....][.....]
Row 1:       [.....][.....][.....]
Row 0:    [start tile]
```

Connectivity:
- A card's TOP EXITS lead to row above
- 1 exit  → leads to ONE of the two cards in row above (heroes choose at branch)
- 2 exits → leads to BOTH cards above (full branching)
- Side edges are walls (no in-row card connections)
- Bottom edge connects only to row below (where heroes came from)

### Card anatomy

```
EXITS:
  Bottom    Single entry (always)
  Top       1 or 2 exits  (never 0; never cul-de-sac IF no gate)
  Sides     Walls (always)
  Center    Optional gate (subgraph exit)

A card has at least 1 forward exit (top OR gate).
```

### Sections WITHIN each card (not fine-grained fields)

Each card has a handful of **sections** (zones / hotspots) — not arbitrary fields. Section-based topology reduces positional micro-tactics and emphasizes narrative flow.

```
- 2-4 sections per card (typical; up to 5 for major cards)
- Sections connected by paths (1 AP section-to-section)
- Paths may be conditional (ROPE, STR≥X, key required)
- Card's entry section is at the bottom of the scene
- Card's exit section(s) are at the top (mapped to top-exit positions)
- Heroes traverse section-to-section from entry to chosen exit
```

★ Inside same section = melee range. No positional subdivision within a section. Adventure-game hotspot vocabulary.

Each section additionally prints a **chokepoint number** (1-5): enemies in section ≥ chokepoint block transit through it (see Combat → Chokepoints).

### Cover state per section

```
| State    | Symbol | Stealth mod | Section archetype                              |
|----------|--------|-------------|------------------------------------------------|
| Open     | ○      | −1          | Plaza, open path, clear plain                  |
| Partial  | ◐      | 0           | Cluttered room, scattered cover (default)     |
| Covered  | ●      | +1          | Alcove, behind cover, niche                   |
```

Cover applies to the WHOLE section. Heroes in a covered section get full benefit.

### Section composition guidelines

```
| Card archetype | Sections | Open | Partial | Covered |
|----------------|----------|------|---------|---------|
| Corridor       | 2        | 80%  | 20%     | -       |
| Hall           | 3        | 30%  | 50%     | 20%     |
| Cavern         | 3-4      | 30%  | 40%     | 30%     |
| Vault          | 3        | 20%  | 50%     | 30%     |
| Alcove-rich    | 4        | 25%  | 40%     | 35%     |
| Open plaza     | 2-3      | 70%  | 30%     | -       |
```

Combat-heavy cards lean Open; stealth-friendly cards lean Partial+Covered.

### Boring passages

~50% of the pool is connective tissue (2-section card with empty corridors, no slots). Negative space is required for pacing.

### Section connectivity

```
Within a card, sections form a small graph:
  Linear      1→2→3→4         (corridor)
  Branching   1→{2,3}→4       (junction)
  Loop        1→2→3→1         (room around)
  Hub         1↔2, 1↔3, 1↔4   (room with side alcoves)

Path types:
  Free          1 AP traversal, no condition
  Conditional   "requires rope" / "STR check" / "key item"
  One-way       descent ladder, dropping in, etc.
```

### Movement & range simplified

```
SAME SECTION:                  all melee weapons, all close-range abilities
                               Everyone in section interacts directly

DIFFERENT SECTION (same card): ranged weapons, AoE spells, thrown items
                               (subject to sight)

ADJACENT CARD (via top exit):  sight-dependent ranged (if sight propagates
                               through the exit)

NON-ADJACENT:                  out of range

NO range subdivisions within a section. Binary check.
```

### AP — section-based traversal

```
1 AP    section-to-section within card
1 AP    card-to-card via top exit (or gate)
1 AP    interact / inspect / dialogue in current section
1 AP    melee attack (in same section as target)
1+ AP   ranged attack (cross-section, varies by weapon)

A 3-section card = ~2-3 AP to fully traverse.
A typical scenario across 5-7 cards = 10-20 AP across several turns.
```

### Stealth budget (revised — section-based)

```
Stealth budget = (hits − card_alert_penalty) + skill (−1/0/+1)

Card alert penalty:
  Alert 0  → 0
  Alert 1  → 1
  Alert 2  → 2
  Alert 3  → 4

Section cost by cover:
  Covered ●   → 0
  Partial ◐   → 1
  Open    ○   → 2

A card with 3 sections might need budget 3-6 to cross stealthily.
Fewer steps than fine-grained alternative; tighter decisions.

Hero stops moving when remaining budget < next section cost.
Stays in last affordable section, OR commits to next (caught, card alert escalates).
```

### Top exits — branching choice points

```
1 top exit  →  linear corridor
              Forced continuation; designer-controlled pacing
              
2 top exits  →  branching point
              Heroes pick which exit to take
              Designer authors meaningful branches
              (different biomes, sub-pools, story arcs)
              Untaken branch reveals only if heroes return
```

### Central gates — subgraph transitions

Optional central exit on a card. Leads to a **separate subgraph** in a fresh table area.

```
Gate types:
  🔑  KEY GATE          requires specific item to open
  🪨  COLLAPSED PATH    requires Heavy clear / climb skill
  🌀  MAGICAL SEAL      requires Mage / specific resource
  🪜  STAIRS DOWN       always passable (one-way or two-way)
  🚪  DOOR              standard door; may be locked or open
  🔮  PORTAL            magical transit, possibly one-way
  ⛩  GATE OF FAITH    requires Priest / story flag

Mechanics:
  Gate has unlock condition (always-open / item / class / story flag)
  When activated, hero spends 1 AP to transit
  Triggers initialization of NEW subgraph (independent bricklaid area)
  Hero figure moves to new subgraph's entry card
  Old subgraph state preserved (return path)
```

★ Central exits = level changes. Subgraph isolation prevents physical-layout lockins from existing card placements.

### Subgraph mechanic

```
SUBGRAPH = independent bricklaid card layout
  Initialized when heroes pass through a gate
  Has its own:
    Start tile (gate destination card)
    Active card pool (may be different from origin)
    Active story stacks (may include location-specific cards)
    Alert state per card (isolated by default)
    Status marker accumulation
    Tile history
  
  Linked to origin via the gate (return path)
```

### Multi-subgraph table layout

```
        SUBGRAPH B (Temple)           SUBGRAPH C (Deep Gloom)
        [Card][Card][Card]            [Card][Card]
           [Card][Card]                   [Card][Card][Card]
        [Card]   ← entry to B            [Card]  ← entry to C
           ↑                                 ↑
           │ gate (🪜)                       │ gate (🪜)
        ┌──┴──┐                           ┌───┴───┐
                                                    
        SUBGRAPH A (Main scenario)
        [Card][Card][Card]
           [Card][🪜][Card][🪜]              ← cards with central gates
        [Card][Card][Card]
           [Card][Card]
        [Start tile]                          ← row 0, scenario entry
```

★ Multiple subgraphs coexist on the table. Each is its own bricklaid layout.

### Depth progression — organic vs gated

```
ORGANIC PROGRESSION                    GATED PROGRESSION
─────────────────────────────────────────────────────────────────────
Pool composition shifts with depth     Pool fixed until unlock event
Same biome / sub-pool throughout       New locations ADDED on unlock
No discrete transition                 Discrete transition at gate

meadow → forest → deep forest          meadow → [GATE] → Temple
outer dungeon → inner dungeon          (Temple cards only in pool after key)
shore → tidal → deep ocean             outer city → [GATE] → noble district
```

### Organic progression mechanic

```
Designer composes card pool with depth gradient:
  Meadow tiles — adjacent to forest tiles via biome-edge symbols
  Forest tiles — adjacent to deep forest tiles
  Deep forest tiles — only adjacent to forest tiles
  
Heroes climb upward through the brick pattern:
  Row 0-2:   meadow biome cards drawn (entry pool)
  Row 3-5:   meadow-forest transition (mixed)
  Row 6+:    forest biome cards
  Row 9+:    deep forest cards appearing

Pool composition naturally gradients with depth — no special trigger needed.
Biome adjacency rules constrain which next-row cards are valid.
```

### Gated progression mechanic

```
Locked locations NOT in active pool at scenario start:
  Initial pool: meadow + forest cards
  Locked pool: temple, deep dungeon, secret cellar tiles

Story card CARD MODIFIER triggers unlock:
  Card CA-08 [STORY EVENT]:
    Text: "The deep cult cells are revealed."
    CARD MODIFIER:
      Add TMP cards to active tile pool
      Add CULT-themed VLN tokens to draw pool

Or: gate encountered in scenario subgraph:
  Gate locked; requires key item / class ability / faction rep / story flag
  On unlock: subgraph initialized with newly-active TMP pool
```

★ Story arcs drive gate unlocks. Pool composition controlled by scenario state.

### Subgraph composition

```
When a gate activates and a subgraph initializes:
  Active tile pool — per gate's destination spec (e.g., TMP cards)
  Active story stacks — may include location-specific (e.g., TMP-)
  Alert state per card — isolated by default (designer can specify connected)
  Identity token pools — may extend with location-specific identities
```

### Movement between subgraphs

```
Hero in subgraph A reaches gate G:
  Gate active (unlocked) → spend 1 AP to transition
  Figure moved to entry card of subgraph B
  Subgraph A state preserved (can return)
  
Hero in subgraph B wants to return:
  Reach the gate-return tile (B's entry card)
  Spend 1 AP to transit back to A's gate card
  Subgraph B state preserved
  
Status markers, alert, tile state persist per-subgraph.
```

### Alert propagation across subgraphs

```
Designer choice per gate:
  ISOLATED      Alert contained per subgraph (independent)
  CONNECTED     High alert in one propagates through the gate
  ASYMMETRIC    Alert rises only in one direction

Default: isolated.
```

### Sight in landscape brick layout

```
Within card: full section-based sight (cover-modulated, range cap 2 cards)
Across rows: row above is visible through top exits
            (revealed via REDIRECT peek for 1 AP, or DIRECT auto-reveal)
            Sight cap 2 cards = peek into row above + possibly row above that

Bottom-row cards behind heroes: known (already traversed)
Side cards: not visible (walls)
```

### Wall edges and biome mismatches

Side edges of cards are walls by default (no in-row card connectivity). Wall tokens are still placed at biome mismatches between vertically-adjacent cards if the biomes don't transition cleanly.

```
A card's top exits carry biome symbols per exit.
A card's bottom entry carries biome symbol (matches the card's biome).
At placement: top exit symbol must match (or be compatible with) the next card's bottom biome.
If mismatch: wall token placed; exit becomes BLOCKED.
Heroes can't pass; must find alternate route.
```

### Gate-only cards (edge case)

```
Card with 0 top exits and 1 central gate:
  Gate is the only forward path
  Heroes MUST go through the gate to progress
  
Designer constraint:
  Gate-only cards are RARE
  Should not strand heroes if gate is locked
  Test: every scenario has at least one always-progressable path

If gate is locked: heroes must retreat or find unlock condition.
This is a feature for puzzle scenarios (must find key elsewhere).
```

### Visual / art direction

```
Each card is a painted environmental scene:
  Point-and-click adventure aesthetic (Monkey Island, Broken Sword, Disco Elysium)
  Side or 3/4 perspective view INTO the scene
  Foreground at bottom (entry), midground/background up
  Hand-painted or digital painted look
  
Overlaid on top: transparent section graph
  Fields shown as adventure-game-style hotspots
  Lines / connections between sections
  Slot markers on sections
  Wall tokens at edges/exits where applicable
  
Top edge: exit indicators (door, opening, path leading away)
Center: gate indicator if present (stairs, locked door, portal)
Bottom: entry indicator (path leading in)
```

---

## 🌍 Biomes

Seven biomes (placeholder names): **VERDANT, EMBER, TIDE, GLOOM, SUN, ARCANE, CITY**

The first six are wilderness / dungeon biomes. CITY adds urban environments for non-dungeon scenarios (escort, detective, political, social).

### Card visual identity

- **Backside center**: primary biome color (card's identity, single biome)
- **Frontside edges**: small biome symbol per edge specifying which pool to draw from through that edge

### Pool composition

Per biome pool (~30–40 cards each):
- ~60–65% pure single-biome (all 4 edges same)
- ~25–30% 1–2 adjacent-biome edges (transition / bridge cards)
- ~5–10% multi-adjacent or special outliers

### Adjacency graph (designer-tunable)

Some biomes thematically flow into each other:

```
VERDANT ─── SUN          (forest → meadow)
VERDANT ─── EMBER         (forest → volcanic)
SUN ─── ARCANE           (civilization → magical)
TIDE ─── GLOOM           (water → undersea undead)
GLOOM ─── EMBER          (death → fire)
ARCANE ─── any           (magic borders everything)
```

Adjacency match counts as a valid biome match for placement.

### Wall tokens for mismatches

When two cards meet at a non-matching, non-adjacent biome edge: place a **wall marker token** to seal it visually. Tokens are reusable (~15–20 in the box).

---

## 👁 Sight

### Range cap

A hero sees up to **2 cards away** via top exits.

### Mechanics — section-based

```
WITHIN CARD:
  Same section            full vision (everyone in section sees everyone)
  Connected sections      sight propagates along connection path
                          (subject to cover state of intermediate section)
  Disconnected sections   no sight

CARD-TO-CARD (upward via top exit):
  Auto-flood from current top section through exit → reveals next card face-up
  Cascade: if next card's entry section has another open exit, sight may chain
  Sight cap: 2 cards (current row + row above; possibly row+2 with chain)
  
  Top exit class:
    🟢 OPEN exit          sight auto-flows through
    🟡 OBSCURED exit      1 AP peek required to reveal beyond
    🔴 BLOCKED            wall token in place; no sight, no transit
```

### Reveal granularity

- Entering any section of a card reveals the whole card
- Peeking via OBSCURED exit reveals next card's identity but does not draw identity tokens for its slots
- Mystery ❖ tokens remain face-down until interacted with

### Cascade revelation (DIRECT chains)

When OPEN exits chain:
- Hero standing at top section of card A peeks through OPEN exit → reveals card B above
- If card B's entry section connects to another OPEN top exit → reveals card C above
- Per-beam cap: 2 cards (so up to 2 cards above your current position visible)
- Phase 1: reveal cards face-up
- Phase 2: resolve slots (only for cards heroes actually enter)

### Enemies do not block sight

Sight is architectural — based on section connectivity and cover state. Enemies obscure nothing.

### Section cover and sight

```
Sight propagation through a section is modulated by its cover state:
  Open section ○    sight passes clearly (no penalty)
  Partial section ◐  sight passes but at -1 to ranged attacks through it
  Covered section ●  sight blocked unless adjacent (you can see in but not past)
```

---

## ⚔ Combat

### Resolution — variable-AP attacks

```
Hero spends X AP on a single attack → roll X dice (+ weapon/class bonus dice)
Hits vs enemy DEF:
  net hits = hits − DEF
  net hits ≥ 1 → damage: enemy advances 1 wound state per net hit
  net hits ≤ 0 → blocked, no effect

1 AP attack   1d   opportunistic
2 AP attack   2d   standard
3 AP attack   3d   heavy
4 AP attack   4d   brutal (AP sink)

Tactical choice: many small attacks (spread) vs one big attack (focus).
Class abilities modify (e.g., Knight surge: +1 die on 2+ AP attacks).
```

### Weapon modifiers (placeholder)

| Weapon / action | Modifier |
|---|---|
| Fists / improvised | −1d |
| Dagger | +0 (backstab bonus while hidden) |
| Sword | +0 |
| Greatsword / greataxe (heavy) | +1d, min 2 AP |
| Bow (ranged) | +0 at range |
| Crossbow | +1d, slow reload |
| Cantrip | fixed 1d, 2 AP |
| Standard spell | fixed 2d, 3 AP |
| Major spell (1 expendable) | fixed 3d |
| Ritual (2 expendables) | fixed 4d |

### Combat skill by class

| Class | Combat |
|---|---|
| Knight, Heavy | +1 |
| Rogue, Scout | 0 |
| Mage, Priest | −1 |

(Priest exception: Smite vs evil/undead reads as +2 effective via class ability)

### Enemy HP — token swap, no numeric tracking

```
WEAK ENEMIES (grunts, acolytes, swarmers):
  1 HP; any net hit kills → remove token

STRONGER ENEMIES (veterans, captains, beasts):
  Multi-state token swap:
    HEALTHY → WOUNDED → CRITICAL → defeated
  Each state = its own token variant with adjusted stats
  On damage: swap token to next state (per net hit)

  Example — Cult Veteran:
    HEALTHY   ⚡3  ATK 3d  DEF 2
    WOUNDED   ⚡3  ATK 2d  DEF 1
    CRITICAL  ⚡2  ATK 1d  DEF 0

ELITE / BOSS:
  Multiple figures/tokens on table (1 wound capacity each)
  Remove one per damage instance; all gone = defeated
```

★ Visual state, no bookkeeping. Wounded enemies remain threats at reduced stats.

### Positioning (section-based, simplified)

```
SAME SECTION as target          melee range; full attack options
ADJACENT SECTION (same card)    ranged only; subject to sight + cover
NON-ADJACENT / different card   ranged via sight chain; range-cap by weapon

Cover state of hero's section modifies enemy defense by ±1:
  Covered hero (●)   defender +1 (harder to hit hero)
  Partial hero (◐)   defender 0
  Open hero (○)      defender −1 (easier to hit hero)
```

### Chokepoints

```
Each section prints a CHOKEPOINT number (1-5):
  1   doorway / single-file passage
  2   tight room / stair landing
  3   hall / cavern
  5   plaza (practically unblockable)

Enemies in section ≥ chokepoint → section BLOCKED:
  Hero cannot transit through without defeating/engaging blockers
  or routing around
Enemies < chokepoint → hero may pass (same-zone alert trigger applies)
```

★ Narrow passages gain defensive value; enemies position to deny chokepoints.

### Surge effects in combat

Printed per weapon/spell/class action. Examples:

| Action | Surge effect |
|---|---|
| Sword | +1 damage |
| Greataxe | Cleave (also hit one enemy in adjacent section) |
| Dagger | Silent kill (no alert change on hit) |
| Bow | Range +1 card |
| Cantrip | Range +1 section |
| Fireball | Blast (hits all enemies in target section) |
| Heal spell | Also remove 1 condition |
| Smite | Target loses next action |

### Enemy AI — reactive resolution

Enemies don't have a separate turn block. They react to hero movement and finish at end of hero turn.

```
TRIGGER MODEL:
  Hero enters section X    → 1 enemy in X resolves
  Hero exits section X     → 1 enemy in X resolves
  End of hero turn          → all remaining enemies resolve

PRIORITY (which enemy of several):
  1. Highest INI value first
  2. Tiebreaker: closer distance to target (same-section beats cross-section)
  3. Final tiebreaker: player choice

TARGETING (which hero an enemy attacks/pursues):
  1. Nearest DETECTED hero (hidden heroes are not eligible)
  2. Tie: first in play order this round
  Deterministic; no dice.

STATE TRACKING:
  Each enemy has "acted this turn" marker
  (rotated 90°, or chit placed)
  Resets at start of next hero turn
```

★ No separate enemy turn. Enemies interrupt during movement; turn-end finishes the rest.

### Enemy initiative

```
Each enemy token shows ⚡ INI value on front:

  ⚡ 1   Slow grunt (zombie, drunk thug)
  ⚡ 2   Standard (cult acolyte, brigand scout)
  ⚡ 3   Fast (cult veteran, swift assassin)
  ⚡ 4   Elite (champion, captain)
  ⚡ 5   Boss / commander
```

### Alert states — per-card, four levels

```
Each card has ONE alert level (0 / 1 / 2 / 3):
  Applies to ALL enemies on that card
  Single state marker per card
  Replaces continuous numeric alarm

ALERT 0   😴  UNAWARE            Passive; default state
ALERT 1   👀  AWARE, PASSIVE     Ambient glances; noted presence; no response
ALERT 2   ⚠  READY FOR COMBAT   Weapons drawn; vigilant; attacks hero in same zone
ALERT 3   ⚔  ACTIVELY HOSTILE   Pursues; coordinates; calls reinforcements
```

★ One alert marker per card. All enemies inherit. Lower-bound triggers: card alert = max of fired triggers; never lowers by trigger.

### Escalation triggers (lower-bound rule)

```
Unstealthed hero movement on card              →  alert ≥ 1
Hero enters same zone as committed ENEMY        →  alert ≥ 2   (neutrals don't trigger)
Any enemy on card takes damage                  →  alert ≥ 3

Damage skips levels (any → 3).
Same-zone can skip (0 → 2 if hero stealthed onto the card first).
Stealthed movement does NOT trigger 0 → 1.
```

### Neutral exception

```
NEUTRALS (don't trigger same-zone escalation):
  Uncommitted NPCs, friendly faction members,
  💤 sleepers, civilians, non-combatants

ENEMIES (do trigger):
  Committed hostile factions, triggered guards, combat-stance beasts
```

### De-escalation (at hero turn start)

```
3 → 2    all enemies on card defeated AND no hero on card
2 → 1    no hero on card for 2+ turns
1 → 0    no hero on card for 3+ turns AND no propagated stimulus

Gradual cooling; alert 3 is sticky while combat memory fresh.
Soft scenario break: all cards reset to designer-default alert.
```

### Behavioral table

```
Behavior                  Alert 0   Alert 1   Alert 2   Alert 3
────────────────────────────────────────────────────────────────
Enemies stay put          ✓          ✓         -         -
Ambient glances           -          ✓         -         -
Weapons drawn, vigilant   -          -         ✓         ✓
Attack hero in same zone  -          -         ✓         ✓
Investigate noise         -          -         ✓         -
Pursue actively           -          -         -         ✓
Call reinforcements       -          -         -         ✓
Encounter draw risk       0%         10%/turn  30%/turn  60%/turn
```

### Card alert visual

```
Card has an alert marker / dial near its edge:

  ┌──────────────────────────────────────────────┐
  │ [exit A]              [exit B]                │
  │                                                │
  │    [environmental scene]                       │
  │                                                │
  │             Alert: [😴][👀][⚠][⚔]             │  ← state track
  │                      ↑                          │  ← marker shows current
  │                                                │
  │                  [entry]                       │
  └──────────────────────────────────────────────┘

Default alert at card reveal:
  Most cards          alert 0
  Story-flagged cards alert 1-2 (on-edge guards)
  Boss / final cards  alert 3 (enraged from start)
```

### Enemy actions follow card alert

```
When an enemy on card C resolves:
  
  IF card C alert ≥ 2 AND enemy in same section as detected hero:
    Attack (X dice per enemy state token)
    
  IF card C alert = 3 AND enemy NOT in section with hero:
    Move 1 section toward nearest detected hero
    
  IF card C alert = 2 AND enemy NOT in section with hero:
    Move toward noise / last-known position (investigate)
    
  IF card C alert ≤ 1:
    Stay put (or patrol per designer spec)

  Mark enemy as acted this turn.
```

### Random encounter triggers

```
At end of hero turn, for each card hero is on or adjacent to:
  Alert 1 card: 10% encounter draw (minor)
  Alert 2 card: 30% (minor/medium)
  Alert 3 card: 60% (medium; major if sustained 3+ turns)
```

### Inter-card propagation

```
Alert 3 card → adjacent revealed cards: 0 → 1 and 1 → 2 (one-step, no chain)
Alert 2 card → adjacent revealed cards: 0 → 1 (weaker)
Alert ≤ 1 card → no propagation

Checked at each turn-end while elevated alert persists.
Heroes manage threat by isolating combat.
```

### Sleeper exception

For scenarios with specific sleeping enemies on otherwise-alert cards:

```
Status marker on individual enemy: 💤 SLEEPER (counts as neutral)
  Overrides card alert for this enemy
  Stays passive regardless of card state
  Only awakens (joins card alert) on:
    Direct attack on the sleeper
    Hero enters sleeper's section AND performs loud action
    Specific story trigger
    Card alert 3 sustained 3+ turns

Designer uses 💤 sparingly for narrative sleepers.
```

### Hero turn resolution flow

```
ROUND START:
  Rotate start player (clockwise)
  Reset all enemy "acted" markers
  Check card alert de-escalation

PER HERO TURN (in play order):
  Hero rolls AP
  Actions interleaved with enemy reactions:
    Move (unstealthed) into card         → alert ≥ 1; hero DETECTED
    Enter zone with committed enemy       → alert ≥ 2; hero DETECTED
    Attack — damage dealt                 → alert ≥ 3; attacker DETECTED
    Enter/exit section                    → trigger 1 enemy there (per card alert)
    Inspect / talk / interact             → usually no reaction

END OF ROUND:
  Resolve all remaining unacted enemies (priority within their card)
  Random encounter checks (per card alert)
  Propagate alert to adjacent cards
  Draw 1 phase card from current story phase deck
  Check phase advance / symbol card triggers
  Reset markers
```

### Worked example

```
Card C entered first time. Card C at alert 0 (default).
Contents:
  Section 1 (chokepoint 1): cult acolyte (⚡2) — 💤 SLEEPER (neutral)
  Section 2 (chokepoint 2): cult mob (⚡1, weak 1HP) + vet (⚡3, 3-state)
  Section 3 (chokepoint 1): cult priest (⚡4, 2-state)
Rogue (5 AP, HIDDEN) enters card C bottom → section 2, unstealthed.

TRIGGERS ON ENTRY:
  Unstealthed movement → card C alert 0 → 1; rogue DETECTED
  Rogue in same zone as mob+vet (committed enemies) → alert 1 → 2
  Section-entry: highest INI = vet (⚡3) resolves → attacks rogue → -1 HP
  Vet marked acted

ACTION — Rogue attacks vet with 3 AP (3d):
  Damage dealt → card C alert 2 → 3
  3 hits vs DEF 2 = 1 net → vet HEALTHY → WOUNDED (token swap)

ACTION — Rogue attacks mob with 1 AP (1d):
  1 hit vs DEF 0 → mob (1 HP) killed, token removed

END OF ROUND:
  Priest (unacted, alert 3, not in rogue's section) → moves toward rogue
  Wounded vet already acted; stays
  Acolyte 💤: neutral, stays dormant
  Encounter check: card C alert 3 → 60% roll
  Propagation: adjacent revealed cards 0→1, 1→2
  Phase card drawn (1/round); markers reset; start player rotates

NEXT ROUND:
  Rogue faces WOUNDED vet (ATK 2d, DEF 1) + priest arriving.
  Retreat through section 1 possible: acolyte is neutral (💤),
  entering its zone does NOT re-trigger alert; passage costs 1 AP
  (chokepoint 1, but a 💤 neutral doesn't block).
```

★ Full stealth approach (stealthed movement, no zone-sharing, no attack) would have kept card C at alert 0 throughout.

### Edge cases

```
HERO ENTERS A CARD FIRST TIME (unstealthed):
  Card alert 0 → 1; hero DETECTED
  Stealthed entry: no escalation, hero stays HIDDEN
  Sleepers (💤) stay sleeping

HERO ENTERS AN ALREADY-ESCALATED CARD:
  Card alert unchanged (lower-bound rule)
  All non-sleeper enemies act per current card alert

DAMAGE INSTANTLY ESCALATES CARD ALERT:
  Any successful attack → card alert ≥ 3 (skips levels)
  Attack on sleeper → wakes sleeper, same escalation

ENEMY MOVES INTO HERO'S SECTION (at turn-end):
  Counts as the enemy's action; no separate attack
  Attack happens next turn

MULTIPLE HEROES IN A SECTION:
  Each hero's movements trigger separate enemy actions
  But each enemy still acts only ONCE per hero turn (shared timeline)
  
HERO STAYS PUT (no moves):
  Enemies in same section: triggered only by hero's actions (attack, inspect)
  Turn-end catches everyone unacted (per priority)

DE-ESCALATION LADDER (at round start):
  3 → 2  all enemies on card defeated AND no hero on card
  2 → 1  no hero on card 2+ turns
  1 → 0  no hero on card 3+ turns, no propagated stimulus
  Narrative effects (truce, charm) may drop alert directly

💤 SLEEPER STATUS (exception, counts as neutral):
  Individual enemies marked 💤 override card alert
  Wake only on direct attack, loud action in their section,
    story trigger, or sustained card alert 3 (3+ turns)

INTER-CARD PROPAGATION:
  Alert 3 → adjacent revealed cards 0→1 and 1→2 (one-step, no chain)
  Alert 2 → adjacent 0→1
  Re-checked each round-end while elevated
```

---

## 🌫 Stealth

**Budget mechanic.** Roll once → spend successes per section as you sneak.

### Resolution

```
1. Roll stealth pool → count hits (incl. surges)
2. 0 hits → AUTO-FAIL: detected, card alert escalates, combat may begin
3. Else:
     budget = (hits − card_alert_penalty) + skill (-1 / 0 / +1)
     
     Card alert penalty:
       Alert 0 card:  0  (baseline)
       Alert 1 card:  1  (noted presence)
       Alert 2 card:  2  (combat-ready enemies)
       Alert 3 card:  4  (actively hunted; specialists only)
       
4. Walk route section-by-section, deducting per-section cost:
     covered  → 0
     partial  → 1
     open     → 2
5. Stop when next section cost > remaining budget
   - Hero stays hidden in last affordable section
   - Or commits to next section and is caught (card alert escalates, combat begins)
```

★ Cover routing is the strategic decision. Card alert directly impacts stealth budget. No detection ceiling — stealth is always *possible*, just expensive at high alert.

### Stealth pools

| Source | Dice |
|---|---|
| Rogue, Scout (base) | 2d |
| Mage, Priest (base) | 1d |
| Knight (base) | 1d |
| Heavy (base, heavy armor) | 0d |
| Cloak | +1d |
| Soft boots | +1d |
| Cover (route-wide bonus) | included via section cost |

### Stealth skill modifier

| Class | Stealth |
|---|---|
| Rogue, Scout | +1 |
| Mage, Priest | 0 |
| Knight | −1 |
| Heavy | −1 (or N/A with 0d pool) |

### Alert and stealth

```
ALERT 0 card  (😴 unaware)
  Stealth easy; no penalty
  Stealthed movement doesn't escalate alert
  Even auto-fail just raises card to alert 1

ALERT 1 card  (👀 aware, passive)
  Stealth feasible (-1 budget)
  Failed stealth: card alert → 2

ALERT 2 card  (⚠ ready for combat)
  Stealth hard (-2 budget)
  Enemies vigilant; failed stealth: alert → 3

ALERT 3 card  (⚔ actively hostile)
  Stealth very hard (-4 budget; dice-rich specialists only)
  Enemies actively hunting
```

### Stealth check failure consequences

```
Auto-fail (0 hits):
  Card alert escalates:
    0 → 1 if currently alert 0
    1 → 2 if currently alert 1
    2 stays at 2
  Combat begins if enemies in same section

Commit-and-fail (next section unaffordable, hero pushes through):
  Card alert escalates by 1 step (same rules)
  Combat begins if enemies in same section

Budget exhausted, hero stops in last affordable section:
  No alert change (still hidden; resume stealth next turn with fresh roll)
```

### Detection consequences

No surprise round, no AP penalty. Geometric position is the punishment: hero stuck in exposed section; enemies move to engage per their AI; card alert escalates.

### Stealth and movement are independent resources

- **Movement (AP)**: hero spends 1 AP per section crossed regardless of stealth
- **Stealth (budget)**: declared before/during movement; ends if hero attacks or breaks cover

Crossing 3 partial sections stealthily costs:
- 3 AP (movement)
- 3 stealth budget (1 per partial)

### Worked examples

```
Rogue (skill +1, 2d base + cloak +1d = 3d), card alert 1 (penalty -1):
  Roll 2 hits → budget = (2−1)+1 = 2 → 2 partial sections
  Roll 3 hits → budget = (3−1)+1 = 3 → 3 partial sections (or 1 open + 1 partial)
  Roll 0 hits → AUTO-FAIL → card alert 1 → 2, caught

Knight (skill −1, 1d base), card alert 0 (no penalty):
  Roll 1 hit → budget = (1−0)+(−1) = 0 → covered sections only (effectively stuck unless cover route)
  Roll 0 hits → AUTO-FAIL → card alert 0 → 1

Rogue (3d) at card alert 3 (penalty -4):
  Even max 3 hits → budget = (3−4)+1 = 0 → covered sections only
  Roll 0 hits → AUTO-FAIL → stays alert 3, immediate combat if same-section enemies
  Hail Mary on surge stacks + items
```

### Surge in stealth

Examples of class/item surge effects on stealth rolls:

| Source | Surge effect |
|---|---|
| Rogue base ability | +1 budget |
| Scout base ability | +1 budget AND reveal mystery token in adjacent card |
| Cloak | Ignore one section's cost (treat as covered) |
| Soft boots | No alert change on first failed step |
| Ward of silence (Mage) | Free border crossing this turn |

### Hero status: HIDDEN / DETECTED

```
Per-hero binary state, tracked visually:
  Figure token: front = hidden, back = detected (flip)
  OR miniature: ring around base (no ring = hidden, red ring = detected)

HIDDEN     enemies don't have a fix on this hero
DETECTED   enemies know location; eligible target
```

Distinct from card alert (enemy-side). Heroes on the same card can differ.

```
HIDDEN → DETECTED:
  Hero attacks
  Hero enters same zone as committed enemy
  Hero fails stealth (auto-fail / commit-and-fail)
  Loud action (smash, loud spell)
  In open ○ section while card alert ≥ 2

DETECTED → HIDDEN:
  Hero leaves card (state resets on card transition)
  Re-hide action: 1+ AP + stealth roll, no enemy in same section,
    card-alert penalty applies
  All enemies on card defeated
  Soft scenario break
```

Effects:

```
                            HIDDEN              DETECTED
─────────────────────────────────────────────────────────────
Targetable by enemies       ✗                   ✓
Stealth-attack surge        ✓ (+1d first strike) ✗
Class stealth abilities     ✓                   mostly ✗
Random encounter target     deprioritized       prioritized
```

Enemy targeting only considers DETECTED heroes. If none detected on/near card, enemies hold position or move to last-known position (designer choice).

---

## 🧱 Walls

### Sources

1. **Fixed walls** — pure art on card, no symbol, permanent
2. **Dynamic / discoverable walls** — marked with `?` mystery wall symbol on card
3. **Mismatch walls** — wall token placed at biome-mismatch edge
4. **Wall stack discoverable** — same `?` vocabulary; token deck reveals on inspection

### Mystery wall symbol `?`

All interactable walls — whether card-printed or token-placed — use one symbol. Inspection (1 AP) reveals the wall's type.

### Wall types (revealed via inspection)

Only discoverable types — no obvious features (full windows / open grates exist as pure card art, not in the wall stack):

| Type | Behavior |
|---|---|
| **Solid (force-able)** | Heavy attack / STR check + 1 HP cost to break |
| **View slit** | REDIRECT sight, no transit |
| **Secret door** | REDIRECT once found |
| **Climb-able gap** | AGI check or CLIMB item to traverse |
| **Force-able blocker** | STR check; rubble after |
| **Magical seal** | Mage dispel or specific item |
| **Crumbling section** | Risk of collapse / hazard if used |

### Class engagement

| Class | Wall specialty |
|---|---|
| Rogue / Scout | Search (find secret doors, climb gaps) |
| Heavy / Knight | Force-able solid |
| Mage | Magical seals (dispel) |
| Priest | Undead-related / cursed seals |

### Dynamic walls

Card-printed walls with state-change triggers (pressure plate, lever, time, damage, key, dispel). Use the same `?` symbol; the card text specifies the trigger.

---

## 🎯 Slots

A section may hold one slot. Slot types:

| Symbol | Type |
|---|---|
| ⚔ | Encounter (enemy) |
| ✦ | Loot (visible) |
| ❖ | Mystery (face-down, reveal on interaction) |
| ⚙ | Hazard / trap |
| ☉ | NPC |
| 🗝 | Locked blocker |
| ☼ | Shrine |
| ☾ | Camp |
| 🔍 | Clue (for detective scenarios) |
| ? | Mystery wall (on edge) |

### Two-stage slot resolution

```
STAGE 1 — at tile placement: PIP resolution determines TIER

  Sum incoming neighbor edge pips → encounter/loot tier (1 / 2 / 3 / boss)
  Tier frozen for the scenario.
  Slot template printed; tier marker placed on slot.

STAGE 2 — at slot reveal (first hero entry): IDENTITY drawn from pool

  Draw from scenario-specific identity pool matching slot type + tier
  Drawn card identifies the specific content (e.g., "Cult Veteran")
  Card stays face-up on slot (or transforms into resolved state)
  Pool depletes (no resampling)
  Constraint riders on drawn card apply (see below)
```

★ Pip math = difficulty. Pool draw = identity. Hybrid procedural.

### Identity pools per scenario

```
Per slot type, per tier, per scenario:

  ⚔ Tier-1 encounters    ~10 cards (specific tier-1 enemies)
  ⚔ Tier-2 encounters    ~10 cards
  ⚔ Tier-3 encounters    ~5 cards
  ⚔ Boss                  ~2-3 cards (boss variants)
  ✦ Loot                  ~15 cards (varied tiers)
  ❖ Mysteries             ~10 cards (reveal types)
  ☉ NPCs                  ~8 cards (named individuals)
  🔍 Clues                ~10-15 cards (detective scenarios)
```

Authored per scenario. Identity specific to the scenario's narrative.

### Constraint propagation — bidirectional

Identity cards carry multiple tags (faction / tier / theme). Drawing any identity commits matching scenario slots; commits filter all related pools in **either direction** — minion identity can constrain villain pool just as villain identity constrains minion pool.

```
Identity pool tags (per card):
  faction:CULT    faction:EMBER    faction:BRIGAND
  tier:1          tier:2           tier:3           tier:boss
  theme:STEALTH   theme:COMBAT     theme:MAGIC

On draw, commit relevant tags to scenario slots.
On subsequent draws, filter pools by all committed tags.
```

### Constraint types

```
LOCK (faction / theme commit):
  "Set scenario {faction} = CULT"
  "Remove all non-CULT cards from this pool"
  → All future ⚔ draws are CULT-themed (regardless of which slot revealed)

UNLOCK (reveal / add):
  "Reveal anchor tile S1-T-07"
  "Add card CA-11 to deck"
  "Unlock option C on future cards"

NARROW (subset filter):
  "Remove cards X, Y, Z from this pool"
  "Only cards with [tag:CULT] remain drawable"

POINT (one-off trigger):
  "Triggers card CA-12 next time ☉ NPC revealed"
  "Place 🩸 marker on tile of next ⚔ reveal"
```

### Mutual narrowing — bidirectional example

```
Scenario ⚔ pool with mixed factions:
  [Cult Acolyte (T1), Cult Priest (T2), Cult Veteran (T3)]      faction:CULT
  [Brigand Scout (T1), Brigand Captain (T2), Brigand King (T3)] faction:BRIGAND
  [Ember Guard (T1), Ember Champion (T2), Ember Lord (T3)]      faction:EMBER

Path A — minion drawn first:
  Tile S1-T-04 ⚔ tier-2 → draw "Brigand Captain"
  → {faction} = BRIGAND committed
  → Pool narrows: only BRIGAND cards drawable
  Later: tier-3 boss → "Brigand King" (only T3 BRIGAND option)
  Coherent: BRIGAND throughout

Path B — boss drawn first:
  Tile S1-T-12 ⚔ tier-3 (boss room) → draw "Cult Veteran"
  → {faction} = CULT committed
  → Pool narrows: only CULT cards drawable
  Later: tier-1 → "Cult Acolyte" (only T1 CULT option)
  Same coherent result, opposite reveal order
```

★ Constraints are symmetric. Scenario coherence emerges regardless of which slot reveals first.

### Cascading constraints

One draw can commit multiple scenario slots simultaneously:

```
Card "Kethros, the Sun Priest" (⚔ tier-3, faction:CULT, theme:MAGIC):
  → Set {villain} = "Kethros, the Sun Priest"
  → Set {faction} = CULT
  → Set {theme} = MAGIC

Narrows future draws:
  ⚔ pool: only CULT enemies remain
  ☉ NPC pool: CULT-aligned NPCs prioritized
  ✦ Loot pool: MAGIC items more likely
  🔍 Clue pool: clues consistent with CULT theme
```

### Two slot categories — clarified

```
TILE SLOTS (spatial)        STORY CARDS (narrative)
─────────────────────────────────────────────────────────
On section graph              On their own as drawn cards
⚔ ✦ ❖ ⚙ ☉ 🗝 ☼ ☾ 🔍        Specific narrative content
Multiple per tile           Stay visible after reveal (diary)
Type symbols                Carry named identities in text
Reset between scenarios     Discarded only via deck manipulation
```

Interactions:

```
TILE SLOT reveal       → identity drawn from scenario pool
                       → drawn identity carries tags (faction, tier, theme)
                       → constraint riders narrow remaining pools

STORY CARD reveal      → narrative + identity printed directly on card
                       → card stays on table as diary entry
                       → constraint riders narrow remaining pools

Both                   → drawn tags accumulate; filter both stories and tile identities
                       → coherent scenario emerges regardless of reveal order
```

★ One unified fill-and-constrain mechanic across both slot categories. No separate scenario state to track — drawn cards ARE the state record.

### Worked example — cascading reveals

```
Tile S1-T-04 placed with ⚔ slot (pip resolution → tier 2)
Tile S1-T-05 placed with ⚔ slot (pip resolution → tier 1)
Tile S1-T-06 placed with ⚔ slot (pip resolution → tier 2)

Hero enters S1-T-04 first → reveal ⚔:
  Draw from tier-2 enemy pool → "Cult Veteran"
  Constraint rider: "Set {faction} = CULT; remove non-CULT from pool"
  → CULT faction commits

Hero enters S1-T-05 → reveal ⚔:
  Draw from tier-1 enemy pool (now CULT-only) → "Cult Acolyte"
  Coherent: same faction, lower tier

Hero enters S1-T-06 → reveal ⚔:
  Draw from tier-2 enemy pool (CULT-only) → "Cult Priest"
  Constraint rider: "On defeat, place 🩸 + trigger card CA-11"
```

★ Three reveals; one consistent narrative thread emerged through draws.

### Replay variance

Same tile, different runs:

```
Run 1: First ⚔ reveal draws "Cult Veteran" → CULT faction
Run 2: First ⚔ reveal draws "Ember Guard" → EMBER faction
Run 3: First ⚔ reveal draws "Brigand Captain" → BRIGAND faction
```

Replayability scales: scenarios produce vastly different antagonist groups per run.

### Pool exhaustion

```
When a tier pool empties during a scenario:
  Option A — fallback to universal generic pool
  Option B — generic placeholder (just "tier-X enemy, no special identity")
  Option C — scenario fail-safe (designer specifies handling)

Pools sized to scenario length (~10-15 cards per tier).
Boss pools intentionally small (~3) so the boss is always meaningful.
```

### Mystery tokens — colored by location, two symbol types

```
COLOR = which pool the token comes from (LOCATION-based):
  Biome / sub-pool / tier of the tile hosting the ❖ slot
  determines the pool color drawn from.

  BIOME → BASE COLOR:
    VERDANT green | EMBER red | TIDE blue | GLOOM black
    SUN yellow | ARCANE purple | CITY grey (sub-pool tinted)
  TIER → SHADE:
    tier I lighter · tier II base · tier III darker · tier IV intense
  GREY = universal fallback pool (generic mysteries)

SYMBOL on hidden side = effect type:
  SHORTCUT SYMBOL   simple immediate gameplay, no lookup
                    🩸N damage · ✦ loot · 🪤 trap · 🩺 heal ·
                    +1d/−1d · ⛔ nothing · 🌫 status · 🗝 key item
  RUNE / EVENT      story-relevant; triggers matching SYMBOL CARD
                    🔱 ⚔ 🌙 ⛧ 📜 🏴 🌑 … or 📖[N] direct card ref
```

Both colored and grey tokens mix shortcut and rune symbols. Color sets flavor; symbol sets resolution type.

```
POOL COMPOSITION (per color/tier):
  ~50-60%  filler / red-herring shortcut ("nothing of note")
  ~20-30%  meaningful shortcut (damage, loot, status)
  ~10-20%  rune (story-trigger)
  ~1-5%    critical plot tokens

COVERAGE RULE:
  Story deck must contain a symbol card for every rune
  a scenario's enabled pools can produce.
  Heavy filler ratio → replayability; same rune may be
  mundane in one run, significant in another.

BRIDGES & COLOR TIERS:
  Multi-color tokens span pools (two color bands on edge)
  Color tiers group interchangeable colors:
    universal (grey) · natural (green/yellow/blue)
    violent (red/black/orange) · mystical (purple/violet)
  Cross-scenario token reuse via bridges.

GATING:
  Colored pools only become drawable when the story arc
  unlocks their tier (phase-card CARD MODIFIERs) —
  see Story cards section.
```

### Mystery resolution flow

```
1. Hero inspects ❖ on tile (biome X, tier Z)  — 1 AP
2. Draw from color pool (X, shade Z); grey if none active
3. Flip token:
     Shortcut symbol → resolve immediately
     Rune → look up symbol card → resolve (may commit constraints)
4. Persistent effects → token/card to diary; else discard
```

### Trigger

Slot effects fire on hero physical entry into the section (for tier-resolved slots) or on inspection (for ❖ mystery).

After reveal, the slot's drawn identity persists on the slot until resolved (e.g., enemy defeated, loot taken, NPC interacted with). Combat with the slot uses the drawn identity's specific stats.

### Integration

```
Slot ⚔ on tile (printed template)
  Pip resolution at placement → tier 2 marker on slot
  Hero reveals slot → draw from tier-2 encounter pool
  Drawn: "Cult Veteran"
  Constraint applied: {faction} = CULT, pool narrowed
  Combat resolved normally (success-count dice, weapon pool, defense, HP)
  
Slot ✦ on tile (printed)
  Pip resolution → tier 1 marker (low-value loot zone)
  Hero takes → draw from tier-1 loot pool
  Drawn: "Forest Charm (+1d stealth in V)"
  Hero adds item to inventory; charm card stays as loot record
  
Slot ☉ on tile (printed)
  Pip resolution → could be tier-based (named importance)
  Hero approaches → draw from NPC pool
  Drawn: "Captured Villager" → fills {captured} slot in key sheet
  Dialogue resolves; NPC may join, may leave, may give info
```

---

## 🧩 Status markers

Small layerable sub-tiles placed ON sections. Modify section state without altering the card. Reusable tokens.

### Categories

**Hazards (impede / damage)**
- 💧 Flooded — +1 AP to enter, +1 stealth cost (splashing)
- 🪨 Cave-in / rubble — blocks transit
- 🌉 Broken bridge — impassable without plank / ROPE / CLIMB
- 🔥 Fire — damage on enter, may block
- ☠ Toxic — damage per turn
- 🕸 Webs — +1 AP to leave
- 🪤 Trap (often face-down) — sprung effect varies

**Aids (resolve hazards / grant benefit)**
- 🪵 Plank — bridges broken bridge or pit
- 🪢 Rope — anchors pit, enables climb
- 💡 Light (lantern) — sight bonus, reveals hidden
- 🚰 Drained — flooded zone passable
- 🪜 Climb aid

**Environmental / atmospheric**
- 🌫 Smoke — sight blocked
- ✨ Magical zone — affects spells / pools
- 🕯 Sacred / blessed — Priest bonus
- ☠ Cursed — penalty to rolls

**Story state**
- 🩸 Body — searchable, narrative loot
- 🔮 Cult sigil — marks ritual site
- ✓ Sprung trap — used, no longer hazard

### Placement

- At scenario setup (per scenario card instructions)
- During play via encounter outcomes, hero actions, slot resolutions, story cards

### Stacking

Aids resolve hazards (plank over broken bridge = passable). Or both stay active, designer choice per scenario.

### Class engagement

| Class | Specialty |
|---|---|
| Heavy | Force-clear cave-in / rubble, break broken structures |
| Knight | Lead through hazards, rally allies |
| Rogue | Navigate gaps via AGI, find safe paths |
| Mage | Dispel magical zones, drain flooded (spell) |
| Priest | Cleanse cursed, bless section |
| Scout | Find alternate routes, identify hazards |

### Items as deployable markers

Inventory items deploy as status markers when used:

```
Plank      (1 AP to place)   → bridges broken bridge or pit
Rope       (1 AP to anchor)  → enables climb on pit
Lantern    (1 AP to light)   → places light marker
Smoke bomb (1 AP)            → places smoke for 2 turns
```

### Mystery markers

Markers can be face-down (generic `?` symbol). Inspect (1 AP) reveals type. Same mystery vocabulary as walls and slots.

### Visual

- ~1" sub-tiles, smaller than sections
- Distinct shapes per category (square = slot, diamond = status, hex = alert, etc.)
- Glyph + color for quick read
- Face-down = generic `?`

### Production count

~30-50 marker types. Reusable across scenarios. Cheap cardboard.

---

## 📖 Story cards (narrative layer)

Two streams drive narrative: a **time-based phase deck** and **event-triggered symbol cards**. Tile markers (📖) additionally trigger contextual draws.

### Stream 1 — Phase deck (time-based)

```
Story deck split into NUMBERED PHASES:
  Phase 1 (opening):  ~5-10 cards, shuffled at scenario start
  Phase 2 (middle):   ~10-15 cards, shuffled when phase begins
  Phase 3 (climax):   ~5-8 cards (contains [RESOLUTION])

ONE CARD DRAWN PER ROUND (end-of-round step).
Predictable tempo; players sense phase length.

PHASE ADVANCE when:
  Phase deck exhausted (default), OR
  Phase-advance trigger fires (faction commit, anchor reached,
  N enemies defeated, specific card drawn with advance flag)

Card backs: identical WITHIN a phase; phase number on top edge.
```

### Stream 2 — Symbol cards (event-triggered)

```
Separate deck; each card carries a TRIGGER condition.
Resolves out of sequence when the trigger fires.

Trigger types:
  ❖  mystery rune revealed          📍  location / anchor entered
  🪜  gate unlocked                  ⏱  round number reached
  ↪  chained from another card      ☠  named enemy slain
  ☉  NPC slain / saved              🏴  faction committed
  ✦  item acquired                  ❤  hero HP below threshold
  🌫  status marker placed/removed

Most resolve immediately (mid-turn interrupt); phase-transition
triggers wait until end-of-round. One-shot by default; persistent
effects flagged on card.
```

### Phase card composition

```
Phase 1: light    (LORE, QUIET, occasional EVENT)
Phase 2: mixed    (CLUE, EVENT, COMBAT, CHOICE)
Phase 3: dense    (RESOLUTION + climax support)

Content types: [LORE] [CLUE] [NPC] [EVENT] [CHOICE] [QUIET]
               [COMBAT] [HAZARD] [TREASURE] [RESOLUTION]
```

### Story arc gates tier access

```
Phase cards carry CARD MODIFIERs that unlock progression:

TIER UNLOCK (broad):
  "Add VERDANT tier II tiles + GREEN tier II mystery tokens to pools"
  Opens an entire location tier + its colored mystery pool
  → implicit content gating: deeper mystery colors unreachable
    until the story arc opens them

NAMED INJECTION (surgical):
  "Add token 'Cult Sigil' (⛧ rune) to PURPLE pool"
  Specific tokens pushed into pools at narrative moments

Symbol cards may fire the same modifiers reactively.
```

★ Story progress = tier progress = mystery color access. One arc controls tempo (phase deck), reactivity (symbol cards), and content gating (modifiers).

### Marker taxonomy (consolidated)

The game uses two layers: **printed markers on tiles** (default, most content) and **physical tokens** (sparingly, for dynamic state).

```
PRINTED ON TILE (default content layer):

  SLOT POSITIONS (printed templates, pip-driven content):
    ⚔ Encounter / ✦ Loot / ❖ Mystery / ⚙ Hazard
    ☉ NPC / 🗝 Locked / ☼ Shrine / ☾ Camp

  STORY MARKERS:
    📖     Generic       (printed, triggers tile-context draw)
    📖[N]  Numbered       (printed, triggers specific card N)

  SUB-POOL SYMBOLS:
    🏛 🏚 👻 🔮 💀 ⚔ ⛓ 🌌 ☄ (printed corner/center)

  BIOME EDGES AND BANDS:
    Printed on card borders

  FIELD GRAPH:
    Transparent overlay (sections, connections, lines)

  MYSTERY WALL SYMBOLS:
    ? on card edges (printed)

PHYSICAL TOKENS (used sparingly, for dynamic mid-game state):

  STATUS MARKERS (placed/removed during play):
    Hazards:        💧 🪨 🌉 🔥 ☠ 🕸 🪤
    Aids:           🪵 🪢 💡 🚰 🪜
    Atmospheric:    🌫 ✨ 🕯 ☠
    Story state:    🩸 🔮 ✓

  WALL TOKENS (at biome mismatches between tiles):
    Solid / view slit / secret / climb-able / force-able / magical / crumbling

  ALARM TRACKERS (per-card d6 / dial)

  SCENARIO-SPECIFIC EVENT TOKENS (placed via card text during play)
```

★ Most action is on printed slots and markers. Physical tokens reserved for genuine state change — signal-to-noise high.

### Why this distinction matters

```
Production cost            Printed content = cheap (already on cards)
                           Physical tokens = cost components, storage
                           
Visual clarity             Printed markers stay put, can't be misplaced
                           Tokens carry weight when placed

Setup speed                Most slots resolve from tile placement + pip
                           Tokens placed only when scenario requires

Tile reusability           Same tile = same printed content across scenarios
                           Tokens layer scenario-specific state

Component count            ~100-150 tokens in box (small cardboard subtiles)
```

### Markers defer resolution

Whether printed or token, markers indicate "state exists here." Resolution requires hero action:

```
SLOT (⚔ ☉ ⚙ ✦)      → resolves on section entry
MYSTERY (❖)         → resolves on inspection (1 AP)
STATUS (hazard/aid)  → persistent effect; applies on entry / movement
STATUS (story)       → narrative reminder; resolves on context
STORY (📖)          → triggers on entry / inspection
WALL TOKEN           → blocks/reveals on inspection or hero action
ALARM                → continuous state; affects all rolls in card
```

★ Markers are "promises of state." They sit visually on tiles, deferring until heroes act.

### Generic vs numbered story markers

```
USE GENERIC 📖 when:
  Event source should match tile's biome / sub-pool flavor
  Procedural exploration content
  Random pool drives variability
  Designer wants emergent narrative

USE NUMBERED 📖[N] when:
  Specific scripted card MUST be drawn at this tile
  Tile is an anchor location for a specific event
  Binding is precise (e.g., "the boss room contains card S1-15")
  Pool-based draw would dilute the scripted moment
```

When drawn by trigger:
- Generic → search/draw from tile-context pool (biome / sub-pool / J)
- Numbered → take card by its specific key from the relevant deck location

### Pool routing for generic 📖 markers

The tile's properties determine the pool:

```
Tile biome             → biome stack of that biome
Tile sub-symbol        → sub-pool stack (overrides biome if specified)
Fallback (any miss)    → universal joker stack
```

(Glyph conflicts to resolve at design time: Arcane biome vs Magical sub-pool, Gloom biome vs Cursed sub-pool, etc. Final glyphs designer-assigned.)

### Tile-event linking via token placement

Card text instructs physical token placement on specific tiles to bind events to locations. Used sparingly — for moments that change the game state in lasting ways:

```
Card text examples:
  "Place ⚔ enemy slot on tile S1-T-04"           — adds combat at anchor location
  "Place 💧 flooded on most recently visited V"   — environmental change
  "Place ❖ mystery on this tile"                  — deferred reveal
  "Place 🩸 body on the boss room"               — narrative state
  
Tile identification methods:
  Anchor key (S1-T-04)         — pre-designated locations
  Recency / descriptor          — procedural fallback
  Current tile                  — in-the-moment effect
  Descriptor + criteria         — "any GLOOM tile with 🏛"
```

Most encounter, mystery, NPC content emerges from **printed slots** during normal exploration. Token placement is the exception — for scenario-significant events that genuinely modify tile state.

### Immediate vs deferred placement effects

```
IMMEDIATE (apply on placement, no hero presence required):
  Alert changes                    → marker on tile alters alert now
  Status markers                   → section state changes (flooded, cursed)
  Card removal                     → NPC departs, loot disappears

DEFERRED (resolve on hero action):
  Slot markers (placed mid-game)   → resolve on section entry
  Mystery markers                  → resolve on inspection
  Encounter spawns                 → combat on entry
```

Designer chooses per event by selecting which marker type to place.

### Tile properties

```
A tile has:
  PRINTED (intrinsic):
    Biome                    (visual via edge bands; determines placement)
    Story markers            (📖 generic and/or 📖[N] numbered)
    Sub-pool symbols         (🏛 / 🏚 / 👻 / etc.)
    Slot templates           (⚔ ✦ ❖ etc. — content via pip resolution)
    Mystery wall symbols     (? on edges)
    Section graph overlay   (sections and connections)
    
  TOKEN OVERLAY (dynamic):
    Wall tokens              (placed at biome mismatches)
    Status markers           (placed/removed during play)
    Alert marker             (per-card: 😴 / 👀 / ⚔)
    Event tokens             (placed via card text)
```

Story markers may match the tile's biome (a 🌳 marker on VERDANT) or differ (a 🏛 marker on VERDANT = "forest temple"). Marker drives story routing; biome drives placement.

Multi-marker tiles represent richly significant locations (e.g., a forest temple ruin carries 🌳 + 🏛 + 🏚). Each marker triggers independently — hero interacts with each separately.

### Tile state persists across visits

Tile state (markers, alert, slots, status) persists after heroes leave. Events placed on already-visited tiles modify state remotely; heroes returning see the new state.

```
Printed state          (intrinsic; never changes)
+ Setup tokens         (scenario starting markers)
+ Mid-game tokens      (event-driven token additions)
- Resolved tokens      (consumed or transformed)
= Current tile state
```

When heroes leave a tile, its state freezes (except for decay rules like alert). Re-entry shows the accumulated state.

### Tile navigation drives story progression

Geographic exploration partially determines narrative flow. Visiting a pool's tile-type is required to encounter that pool's story content.

```
Cult Arc progression by geographic visits:
  CA-01 [V]     in VERDANT stack — heroes must hit a 🌳 marker
  CA-02 [TMP]   in Temple stack — heroes must hit a 🏛 marker
  CA-03 [G]     in GLOOM stack — heroes must hit a 💀 marker
  CA-04 [V]     back in VERDANT — another 🌳 marker visit
  CA-05 [BOSS]  conditional final confrontation

If heroes never visit a temple, CA-02 stays at the top of the TMP stack indefinitely.
The arc has natural pacing tied to spatial exploration.
```

★ Designers can gate narrative beats behind specific tile-type visits. Story progress is partially in the players' hands.

### Stack architecture: physical layout only

Same mechanics in both. Pure table-space choice.

```
Multi-stack (default):
  Several piles on table, one per active pool (V, E, TD, G, S, A, TMP, ..., J)
  Marker fires → draw top of matching stack (no search needed)
  Larger table footprint; faster table action

Single stack:
  All scenario story cards combined into one physical stack
  Marker fires → search top-down for first card matching marker's tag
                  cards above (non-matching) stay in place
  Smaller table footprint; slight search overhead per draw
```

★ Game state, card flow, and pacing are identical. Players choose layout based on table space and preference. Designer authors content the same way regardless. Setup procedure (next section) builds the stacks identically — multi-stack just builds them in separate piles, single-stack concatenates them with all numbered cards positioned per global priority.

### Setup: alternation; scenario backs identifiable, randoms opaque

Each card belongs to **exactly one stack** (its primary tag). Stacks alternate random and scenario cards. Scenario cards carry visible metadata on their backside (card number + structural-op symbols); random cards have generic identical backs.

```
Card key: GROUP-NN  (visible on scenario card backs)

Scenario card BACK shows:
  - Card number (e.g., "CA-07")
  - Optional structural-op symbols:
      ↻  re-order when drawn
      →  goto / chain trigger
      ⤓  send to bottom after draw
      ✦  conditional gate
      ↳  insert next from reserve
      ●  persistent — return to top after resolution

Random card BACK:
  - Generic deck-back design only (no number)
  - Truly opaque

Heroes see "scripted beat incoming" when a numbered back surfaces.
Content TYPE (combat / NPC / lore / treasure / hazard) remains hidden until
the front is revealed.
```

Pacing concealment is partial: scripted vs random differs visibly, but the kind of scripted beat stays a surprise.

### Stacks

```
Per-biome stacks:      V / E / TD / G / S / A
Per-sub-pool stacks:   TMP / RUI / HNT / MAG / CRS / BTL / PRS / VOR / ANC
Universal joker stack: J
```

Each card has one primary tag → one stack. Cards from the same arc distribute across stacks per their individual primary tags. No single "arc deck" at the table.

### Setup procedure (per stack)

```
1. Locate scenario cards by visible back numbers (CA-01, CA-02, ..., CA-NN)
   Order by ascending number
2. Gather random cards from this stack's pool
3. Build alternating top-to-bottom: R, S, R, S, R, S, ...
4. Excess randoms shuffled at bottom

No flipping cards during setup — visible back numbers handle ordering.
```

★ Simplest possible setup. Pacing comes from alternation rhythm + content density variance within each pool.

### Content density spread (pool design)

Both random and scenario pools include a mix of impact levels — quiet cards mixed with major beats:

```
Random pool (typical composition):
  ~40%  Full encounter (combat, NPC, lore, treasure find)
  ~40%  Minor flavor (atmospheric, brief encounter, small choice)
  ~20%  Quiet (no-effect: "you press on; the biome is quiet here")

Scenario pool (typical composition):
  ~50%  Major scripted beat (key narrative, branch, conditional trigger)
  ~30%  Minor scripted beat (small reveal, transition)
  ~20%  Quiet scripted filler ("cult's presence felt; no incident here")
```

Density variance partially restores pacing concealment within each type — even when a hero sees a scripted-back surfacing, they don't know whether it's a major beat or quiet filler.

### Mid-game card lookup

```
Card text: "Take card CA-07 from its stack and place on top"
  → Player searches stack for visible back number CA-07
  → Pulls without flipping
  → Places on top of designated stack
  → Heroes know "scripted incoming" but not what
```

Back numbers enable fast card-by-reference operations without revealing content.

### Stack composition example

```
SUN biome stack at setup:

Scenario cards (located by back numbers): CA-01, CA-03, CA-07 (in order)
Random cards: SJ-01..06, J-01..03

Built alternating top-to-bottom:
  SJ-04        ← random (generic back)
  CA-01        ← scenario (back: "CA-01")
  J-02         ← random
  CA-03        ← scenario (back: "CA-03")
  SJ-01        ← random
  CA-07        ← scenario (back: "CA-07")
  J-01         ← random
  (tail random shuffled)

When CA-01 surfaces, heroes see "CA-01" on the back — scripted beat is up,
but content type and impact remain hidden until they flip.
```

### One stack per card

Each card has exactly one primary tag indicating its single stack. Cards conceptually fitting multiple categories (e.g., "temple in the woods") get assigned a single stack at design time based on the dominant narrative axis.

```
CA-02 "Temple within the woods":
  Designer chooses primary tag: V or TMP
  If TMP primary → lives in TMP stack; heroes find via 🏛 marker (any biome)
  If V primary → lives in V stack; heroes find via 🌳 marker (forest event w/ temple flavor)
  
  Card text describes the dual nature but stack placement is single.
```

No duplication across stacks. Designer picks the dominant axis for routing.

### Arcs as geographic journeys

Arcs naturally span multiple biomes and sub-pools by design. Each arc card's primary tag corresponds to its narrative setting; heroes experience the arc through spatial traversal. Common patterns:

**Linear journey** — narrative descent across biomes:

```
"Descent into the Cult's Lair" arc:
  CA-01  [V]      Begin in verdant outskirts
  CA-02  [TMP]    Discover a hidden temple in the woods
  CA-03  [TMP]    Investigate temple ritual
  CA-04  [TMP]    Find descent stairs
  CA-05  [G]      Enter gloom ruins
  CA-06  [G]      Deep in gloom caves
  CA-07  [BOSS]   Conditional reserve; triggered when CA-06 drawn

Heroes "descend" by visiting V → TMP (temple in woods) → TMP (deeper) → G tiles.
TMP stack at setup: scenario beats CA-02, CA-03, CA-04 alternate with TMP randoms,
with skips inserted by designer for pacing camouflage.
```

**Hub and spokes** — cult cells across biomes:

```
"The Cult's Reach" arc:
  CA-01  [J]      Hero base / hub
  CA-02  [V]      Verdant cult cell
  CA-03  [E]      Ember cult cell
  CA-04  [TD]     Tide cult cell
  CA-05  [G]      Gloom cult cell
  CA-06  [BOSS]   Convergence after all 4 cells found (conditional reserve)

Heroes choose investigation order; each biome visit alternates random flavor
with the cult cell scripted beat (concealed by skips).
```

**Branching paths** — choice splits the arc:

```
"The Two Roads" arc:
  CA-01  [V]            Branching choice in the woods
    A) Mountain path    → take card CA-02A from reserve, place top of E stack
    B) River path       → take card CA-02B from reserve, place top of TD stack
  CA-02A [E]            Mountain ancient ruins
  CA-02B [TD]           River crossing
  CA-05  [G]            Dark temple at journey's end (convergence)
```

### Geographic pacing

```
Tutorial arc:       3-5 cards, 1 biome / sub-pool (e.g., all V or all TMP)
Standard scenario:  10-15 cards spread across 3-4 stacks
Multi-scenario:     20-30+ cards; meta-progression carries state
```

Designer composes arc primary tags so narrative flows with biome exploration patterns.

### Heroes experience arcs spatially

Cards on top of each stack reflect the arc's current "position" in that biome/pool. Hero visits drive progression. Heroes may experience cards out of strict sequence — each card stands alone narratively. Designers can enforce order via conditional triggers when needed:

```
Card CA-02 text:
  "If CA-01 has not been drawn: 
     place this card at bottom of TMP stack, draw next from TMP instead"
```

### Worked examples

```
VERDANT tile with 🌳 marker:
  → Draws top of V stack
  → May get: arc card if at top, biome joker, or universal joker

VERDANT tile with 🏛 marker (forest temple):
  → Draws top of TMP stack

GLOOM tile with 📖 marker (generic notable):
  → Draws top of universal joker stack

GLOOM tile with no story markers:
  → No story content; purely tactical

VERDANT tile with 🌳 + 🏛 + 🏚 (forest temple ruin):
  → Each marker triggers independently
  → 🌳 draws from V, 🏛 from TMP, 🏚 from RUI
  → Significant destination location
```

### Sub-pool markers (themed content)

Sub-pools are reusable themed content groups, orthogonal to biome. A temple exists in any biome (forest temple, volcanic temple, dark temple). Same TMP- cards used regardless of biome backdrop.

### Multiple arcs coexist

A scenario may have multiple concurrent arcs (`CA-`, `DA-`, `BOSS-`, etc.). Their cards distribute into stacks based on individual card tags. No precedence between arcs — heroes encounter whatever's on top of the stack their tile points to.

```
Inter-arc references on card content:
  Card CA-05: "If any DA card drawn: take card DA-08 (dragon noticed the cult)"
  Card DA-03: "Place card CA-12 on top of its stack (cult senses the dragon)"
  Convergence: "Once both CA-15 and DA-10 drawn, take card BOSS-01 (final confrontation)"
```

### Card keys used only in card text

Full addresses (`GROUP-NN`) appear:
- **In card text** — for inter-card references and deck manipulation (e.g., "Take card CA-09 and place on top")
- **In scenario setup card** — for listing which cards belong to which pool

Markers on tiles **never** use full keys. They're just 📖.

### Active cards per scenario, assembled into stacks

```
Example for "Ruins of the Sun Cult":

Active cards (listed by group):
  CA-     12 cards (Cult arc, mixed biome and sub-pool tags)
  TMP-    8 cards (temple sub-pool)
  SJ-     6 cards (biome joker for SUN)
  VJ-     4 cards (biome joker for VERDANT)
  J-      12 cards (universal joker)

Assembled into stacks at setup:
  SUN stack       contains: CA-01, CA-03, CA-07, SJ-01..06 (CA on top in order, SJ shuffled)
  VERDANT stack    contains: CA-04, VJ-01..04 (CA-04 on top, VJ shuffled)
  GLOOM stack      contains: CA-02, CA-05 (no GJ in this scenario; CA on top in order)
  Temple sub-pool  contains: CA-06, TMP-01..08 (CA-06 on top, TMP shuffled)
  Universal joker  contains: J-01..12 (all shuffled)

Conditional reserve:
  CA-08 through CA-12 held off-stacks; triggered via inter-card references
```

Routing per tile (implicit):
- Sub-symbol present → top of matching sub-pool stack, fall back to biome stack, then universal
- Plain biome tile → top of biome stack, fall back to universal

### Card content (revealed on draw)

When drawn, the card declares its type on its face:

```
Card CA-03 [COMBAT — Cult Guards]
Card CA-04 [LORE — Sigil Inscription]
Card CA-07 [NPC — Wounded Ranger]
Card CA-09 [TREASURE — Crypt Hoard]
Card TMP-02 [LORE — Holy Inscriptions]
Card HNT-04 [COMBAT — Restless Spirits]
```

Type metadata on the card. Heroes resolve the content (combat / dialogue / lore reveal / etc.) on the spot.

### Story decks

Per-scenario composition. Each scenario specifies:
- Which arcs / pools are active (by group prefix)
- Which specific cards (by full key, e.g., `CA-01`, `TMP-04`) go in each
- Card setup order (numbered top = drawn in order; remaining shuffled or placed per scenario design)
- Draw priority rules

A simple scenario may have just one arc + universal joker pool. A complex multi-strand scenario may use multiple arcs plus several biome joker pools plus sub-pools.

No quest book. All gameplay lives on cards. Scenario card lists deck composition and routing rules.

### Trigger

```
Hero enters section with story marker:
  1 AP to interact (or auto-trigger if scenario specifies)
  Draw top card from indicated deck
  Resolve narrative + mechanical effects
  Marker consumed (one-shot) or persistent (per card)

When deck runs dry:
  Marker becomes inert OR scenario specifies fallback (e.g., "after all NPC cards drawn, marker becomes ✦ loot")
```

### Card content

```
- Short narrative text (1-3 sentences, evocative not exhaustive)
  Carries specific named identities directly (no placeholders)
- Choices / outcomes (branching)
- Mechanical effects:
    Place / remove status markers
    Spawn slot tokens
    Modify card alert
    Trigger incursion deck draw
    Reveal hidden info
    Grant items / expendables
    Advance scenario clock
- Constraint rider (optional, at bottom):
    Tags committed by this draw (e.g., "{faction:CULT}")
    Pool narrowing instructions ("remove non-CULT cards")
- Class-specific options (printed when designer wants class identity in narrative)
- May reference another deck ("draw next from X deck immediately")
```

### Story cards with identity slot grids

Story cards combine printed narrative + slot grids that receive **identity tokens** at reveal. Drawn tokens stay on the card; the composite (card + filled tokens) IS the diary entry on the table.

```
Card CA-04 [LORE — The Cult Revealed]:

  ┌────────────────────────────────────────────┐
  │  CA-04   [LORE]                            │
  │                                            │
  │  "You uncover the cult's plans..."         │
  │                                            │
  │  ┌─────┬─────┬─────┬─────┐                 │
  │  │ VLN │ PLT │ MOB │ EVT │   printed slots │
  │  │     │     │     │     │                 │
  │  └─────┴─────┴─────┴─────┘                 │
  │                                            │
  │  At reveal:                                │
  │   • Draw 1 token from each labeled pool    │
  │   • Place tokens in matching boxes         │
  │   • Apply constraint (faction tag from VLN)│
  │                                            │
  │  CHOICES:                                  │
  │  A) Investigate further → ...              │
  │  B) Press on → ...                         │
  │  C) Search → ...                           │
  │                                            │
  │  CONSTRAINT: Commit faction tag from VLN   │
  │   token. Remove non-matching tokens from   │
  │   all pools.                               │
  └────────────────────────────────────────────┘
```

★ The composite card + 4 tokens is the diary entry. Visible to all players. Referenced by future cards.

### Identity tokens

Small sub-cards (~1.5" × 1") drawn from per-scenario pools:

```
Pool categories (per scenario):
  VLN  Villain          ~5-8 tokens
  PLT  Plot             ~3-5 tokens
  MOB  Mobs / minions   ~6-10 tokens (by tier)
  EVT  Event            ~3-5 tokens
  NPC  NPC              ~5-8 tokens
```

### Token back (no text — shape/color + multi-glyph tags)

```
TOKEN BACK encodes:
  CATEGORY    Physical shape AND/OR color (no text symbol)
                VLN: deep red hexagon
                PLT: purple pentagon
                MOB: orange square
                EVT: yellow triangle
                NPC: green circle
  TAG GLYPHS  Multiple small glyphs (token may carry several tags)
                👹 CULT  🔥 EMBER  🗡 BRIGAND  ⚓ NAVY  ⚔ MILITARY ...
  Decorative  Scenario-neutral back art

  NO tier on back.
  NO unique ID on back.
  NO category text on back.
```

★ Category readable instantly by shape/color (no language barrier, fast sort). Tag glyphs spotted by symbol scanning. Identity hidden until draw.

### Multi-tag tokens

Tokens can carry several tag glyphs — crossover content:

```
Cult Fire Priest          →  👹🔥        (CULT + EMBER)
Coastal Brigand           →  🗡🌊        (BRIGAND + TIDE)
Naval Cultist             →  👹⚓        (CULT + NAVY)
Cult-Aligned Noble        →  👹🏛        (CULT + NOBLES)
Corrupt Watch Officer     →  👮👹        (GUARD + CULT)
Cult Mob (generic)        →  👹           (CULT only)
```

When constraint commits, filter keeps tokens with **any** matching glyph in the committed set.

### Constraint commitments are SETS

Commitments accumulate as the scenario unfolds. Single-faction commitment is just a one-element set:

```
Committed set evolves with reveals:
  Initial:        {}
  Reveal 1:       token tag 👹 added       → set = {CULT}
  Reveal 2:       token tag 🏛 added       → set = {CULT, NOBLES}
  Reveal 3:       token tag 👮 added       → set = {CULT, NOBLES, GUARD}
  
  At threshold (designer-specified):
    Set locks; future draws filter by ANY-in-set match

Filter logic:
  Token survives if ≥1 glyph in committed set
  Token removed if NO glyph matches committed set
  Multi-tag tokens (bridges) survive more readily
```

★ Single-faction scenarios: set holds one value. Multi-faction scenarios: set grows to 2-4.

### Multi-faction scenarios unlocked

```
DUNGEON RUN              {CULT}                       single antagonist
ESCORT THROUGH WAR ZONE  {CULT, NAVY}                 two factions in conflict
CITY INTRIGUE            {CULT, NOBLES, GUARD}        three-way urban
COURT OF SHADOWS         {NOBLES, CRIMINALS, TEMPLE}  political tangles
SIEGE                    {CULT, EMBER}                allied antagonists
INVESTIGATION            {CULT, NOBLES}               who's behind the murder?
```

### City intrigue worked example

```
"The Cult in the Court" scenario:

Setup: faction pool {CULT, NOBLES, GUARD, CRIMINALS, TEMPLE}
       Tokens with various tag combinations across all categories

First reveals commit the set:
  Tile MOB reveal → "Cult Acolyte" 👹 → set = {CULT}
  Story NPC reveal → "Noble Sympathizer" 🏛 → set = {CULT, NOBLES}
  Story VLN reveal → "Captain of the Watch" 👮 → set = {CULT, NOBLES, GUARD}

Set locks at 3 factions.

Filter remaining pools: keep tokens with any of {CULT, NOBLES, GUARD}
  "Cult-aligned Noble" 👹🏛 → survives (matches both CULT and NOBLES)
  "Temple Priest" 🛐 → removed (no match)
  "Brigand Thief" 🗡 → removed (no match)

Multi-tag tokens (👹🏛, 👮🏛, 👹👮) emerge as narrative connective tissue —
embodying the "this noble works for the cult" moments.
```

### Set expansion modes

```
EXPANDING (designer choice for scenarios that emerge over time):
  Set grows with each reveal's tags
  More factions enter play as scenario unfolds
  Suits mystery / intrigue scenarios

LOCKED (designer choice for tight, focused scenarios):
  After N reveals, set locks
  No new factions can enter
  Suits thriller / siege scenarios

HYBRID (common):
  Initial reveals expand set
  At threshold (3-4 reveals, or scenario clock advance)
  Set locks; remaining play uses committed factions
```

### Factions emerge from play; faction card holds the data

```
At scenario start:
  No faction committed
  No "enemy" or "evil" pre-defined
  Heroes don't know who they're fighting

First reveal of any token with a faction tag:
  → Draw FACTION CARD blind from the faction pool matching that tag
  → Place face-up on table (visible faction state)
  → Faction is now "in play"
  → All future filtering refers to this committed faction's tag
```

★ The antagonist emerges through play. Same scenario, different enemy each run.

### Faction card structure

Faction cards are larger than identity tokens (more info), drawn from a per-tag faction pool when first committed:

```
FACTION CARD example:

  ┌─────────────────────────────────────────┐
  │  THE CULT OF AELOTH         👹          │
  │  ─────────────────────────────────────  │
  │  A sun-worshipping cult seeking         │
  │  to bind ancient power.                 │
  │                                         │
  │  REPUTATION:  [-5 ... 0 ... +5]         │
  │                              ▲          │
  │                                         │
  │  FACTION RULES:                         │
  │    Cult MOBs deal +1 damage at night    │
  │    Cult NPCs immune to bribery          │
  │    Defeating Cult VLN: rep +3           │
  │                                         │
  │  ON COMMIT:                             │
  │    Filter all pools: keep 👹-tagged     │
  │    Remove non-matching, non-bridge      │
  └─────────────────────────────────────────┘
```

The faction card consolidates name, description, reputation, rules, and constraints into a single physical card per active faction.

### Faction pool composition

```
FACTION pool (per scenario, designer-curated):
  Several faction cards per tag
  Drawn blind when first matching-tag token reveals

Example for "Court Intrigue" scenario:
  CULT cards         2-3 different cult identities
  NOBLES cards       2-3 noble factions
  GUARD cards        1-2 watch factions
  CRIMINALS cards    1-2 underworld factions
  TEMPLE cards       1-2 religious orders
```

Even the faction IDENTITY is randomized within its tag pool. Same CULT tag can manifest as "Cult of Aeloth", "Cult of Vekros", or "Cult of the Dark Sun" — each with different rules and themes.

### Three layers of variance per scenario

```
1. WHICH faction tag(s) emerge from first reveals
   (CULT vs BRIGAND vs NOBLES, depending on first tagged token)

2. WHICH SPECIFIC faction card draws from that tag's pool
   ("Cult of Aeloth" vs "Cult of Vekros" — different mechanical effects)

3. WHICH identity tokens within the faction emerge
   (different VLN, PLT, MOB, EVT, NPC reveals throughout)

Combined: enormous replay variance per scenario.
```

### Flow — first reveal triggers faction draw

```
Tile slot reveals MOB → flip token → "Cult Acolyte" 👹
  Faction tag 👹 not yet committed → trigger faction draw
  Reach into FACTION pool, find 👹 cards subset
  Blind draw → "Cult of Aeloth"
  Place faction card face-up on table
  Apply ON COMMIT effects:
    Filter all pools to keep 👹-tagged tokens
    Remove non-matching from pools

Subsequent reveals:
  Same-tag tokens: resolved normally; faction already committed
  Different-tag tokens: if set still expanding, trigger another faction draw
                        if set locked, token shouldn't be in pool anymore
```

### Reputation tracking on faction card

```
Reputation track on faction card (-5 to +5):
  Movable marker (cube, dial, clip) placed on track
  
Adjusted by actions:
  Defeat faction VLN     → rep +3
  Defeat faction MOB     → rep +1 or -1 (context)
  Aid faction NPC        → rep +2
  Betray faction         → rep -3
  Bribe                  → +1 with one faction, -1 with related faction

Reputation affects:
  Pool composition shifts (high rep = friendlier draws)
  Story choices ("only if NOBLES rep ≥ +2")
  Endgame outcomes (which factions ally / oppose at scenario end)
```

### Multi-faction layout

```
Table state during multi-faction scenario:

   +─── DIARY ─────────────────────────────+
   |  CA-04 [LORE]                          |
   |  ┌──┬──┬──┬──┐                         |
   |  │..│..│..│..│  (filled tokens)        |
   |  └──┴──┴──┴──┘                         |
   +────────────────────────────────────────+

   +─── ACTIVE FACTIONS ────────────────────+
   |  ┌───────────────┐  ┌────────────────┐ |
   |  │ Cult of Aeloth│  │ House Vexel    │ |
   |  │ Rep: -2  👹   │  │ Rep: +1  🏛    │ |
   |  │ [rules...]    │  │ [rules...]     │ |
   |  └───────────────┘  └────────────────┘ |
   +────────────────────────────────────────+

   +─── ACTIVE TOKEN BAGS ──────────────────+
   |  [VLN stack] [PLT stack] [MOB stack] ...|
   +────────────────────────────────────────+
```

★ Faction cards + diary + pool stacks = complete scenario state visible on the table.

### Commit threshold

```
Designer specifies per scenario:
  COMMIT LIMIT:  Maximum factions before lock
    Tight scenarios:        1 faction
    Standard:                2-3 factions
    Sprawling intrigue:      4+ factions

  THRESHOLD:  How is lock triggered
    By count       (first N tagged reveals lock the set)
    By scenario clock (clock advance = N locks)
    By specific card (a "set locks" event card)
```

### Replayability scales

```
Same scenario, different antagonist:

Run 1: First reveals → {CULT (Cult of Aeloth)}
       → solo cult conspiracy

Run 2: First reveals → {CULT (Cult of Vekros), NOBLES (House Vexel)}
       → cult-noble alliance, court corruption

Run 3: First reveals → {BRIGAND (Black Sails)}
       → straightforward brigand siege

Same scenario content, three vastly different stories.
```

★ Multi-faction commitment + faction card variance + multi-tag tokens + bidirectional filtering = massive replay variance without authoring more content.

### Token front (revealed on draw)

```
TOKEN FRONT shows:
  Name + ID              "KETHROS  VLN-XX"
  Brief description      "The High Priest of the Cult of Aeloth"
  Tag glyphs (same as back)
  Stats / tier (if applicable, e.g., for MOB)
  Effect sections        (multi-effect spec below)
```

ID appears only on front (revealed when drawn). Front-side metadata supports diary references after reveal.

### Filter, then blind draw

When a constraint commits, the pool is filtered before next draw:

```
1. FILTER  Search pool, remove tokens without matching tag glyph
2. SHUFFLE Re-randomize remaining pool
3. DRAW    Flip top of stack
```

### Storage: all pools as face-down shuffled stacks

```
ALL POOLS                  Face-down shuffled stacks
  Story cards              Stacks per pool (V / E / TD / G / S / A / TMP / RUI / ... / J)
  Identity tokens          Stacks per category (VLN / PLT / MOB / EVT / NPC)
  Tile pool                Stacks per biome

OPERATIONS (universal):
  Draw                     Flip top of stack
  Filter                   Search stack, remove non-matching, reshuffle
  Inspect order            Never (face-down preserves randomness)
```

★ Bag draw ≡ shuffled stack draw — mechanically equivalent. Unified handling across all artifact types. No bags as a component.

### Pool composition without tier on back

Tier handled at reveal context, not on token back:

```
Tile placement: pip resolution → tier 2 encounter
At reveal: draw from MOB stack → flip token → token's front-side stats define its level
  Designer authors tokens at appropriate stat profiles for scenario
  Or scenarios curate which tokens go in stack for which tier range
  Or tier scales with current alert / scenario clock
```

Simplest: scenarios specify which tokens are eligible; tier emerges from front-side stats.

### Compositional reference (no unique back ID)

Card text references work compositionally without unique IDs:

```
Card text examples:
  "Remove a 🗡 BRIGAND token from any pool"
     → Search pools for any 🗡; remove one (specific identity doesn't matter)
  
  "Reveal a MOB token from the MOB pool"
     → Flip top of MOB stack
  
  "If a 👹 CULT token has been drawn..."
     → Check diary for any 👹 visible
  
  "Remove the Kethros token from VLN pool" (after Kethros has been drawn)
     → Find Kethros on diary (face-up), remove from play
     (works because revealed tokens are face-up and identifiable)
```

★ Pre-reveal references = compositional (by category + tag). Post-reveal references = by name (visible on flipped tokens in the diary).

### Token effect categories

Tokens may carry multiple effect types beyond simple identity:

```
IMMEDIATE        Resolves at draw:
                   Commit faction tag
                   Remove non-matching from pools
                   (constraint rider)

LASTING          Persistent modifier while token is in play on table:
                   e.g., "raise card alert in any tile with this MOB type"
                   e.g., "Future LORE cards: read with reverence"

TRIGGER          Hook to a future specific event:
                   e.g., "When card CA-09 drawn, spawn tier-2 CULT MOB"
                   e.g., "On boss kill, also draw card CA-15"

CARD MODIFIER    Alters future story card resolution:
                   e.g., "Remove option B from card CA-12"
                   e.g., "Any future COMBAT card: add tier 1 CULT MOB"
```

Not every token has all four sections. Most carry just IMMEDIATE. Significant tokens add LASTING. Key story moments include TRIGGER or CARD MODIFIER. Complexity matches narrative weight (~10-20% have lasting effects; ~5% have card modifiers).

### Token front layout — worked example

```
TOKEN: KETHROS (front)

  ┌─────────────────────────────────────────┐
  │  KETHROS                       VLN-XX   │
  │  The High Priest of the Cult of Aeloth. │
  │                                         │
  │  Tier ●●●         👹 CULT               │
  │  ─────────────────────────────────────  │
  │  IMMEDIATE:                             │
  │    Commit faction:CULT                  │
  │    Remove non-CULT tokens from pools    │
  │                                         │
  │  LASTING:                               │
  │    raise card alert in any tile where a CULT    │
  │    MOB spawns                           │
  │                                         │
  │  TRIGGER:                               │
  │    When CA-09 drawn: spawn tier-2 CULT  │
  │    MOB in current tile                  │
  │                                         │
  │  CARD MODIFIER:                         │
  │    Remove option B from CA-12           │
  └─────────────────────────────────────────┘
```

★ The token is not just an identity reveal — it shapes the scenario's mechanical state going forward.

### Why multi-effect tokens matter

```
Without lasting/trigger effects:
  Tokens commit identity once, then become passive diary entries
  All mid-game variability lives on story cards
  
With lasting/trigger effects:
  Tokens become active modifiers
  Different draws produce structurally different scenarios
  Same scenario, different villain = different events throughout
  Replayability scales without authoring more content
```

### Effect tracking at the table

```
LASTING:
  Token stays face-up on diary
  Effect applies whenever its condition is met
  Players reference token text during play

TRIGGER:
  Token text describes hook condition
  When condition met, resolve the printed effect
  Token may consume (rotate 90°) or persist (designer choice)

CARD MODIFIER:
  When referenced card later drawn, apply modification BEFORE resolution
  E.g., "Remove option B from CA-12" → card CA-12 plays without option B
```

### Setup and draw flow

```
At scenario setup:
  Each pool (VLN, PLT, MOB by tier, EVT, NPC) shuffled face-down
  Stacked into named piles
  Players don't see fronts of any pool tokens

At reveal:
  Story card or tile slot calls "draw from POOL"
  Player takes TOP of that pool's stack (blind, top-draw)
  Flips face-up
  Resolves IMMEDIATE effects
  Token placed on slot / card grid (or beside it)
  LASTING effects active while token visible
  TRIGGER and CARD MODIFIER effects await their conditions
```

★ Pure random within each pool. No designer pre-arranging. Top-draw from shuffled stacks.

### Scenario setup uses category/tag/tier, not unique IDs

Since backs don't show unique IDs, scenario setup references compositionally:

```
Scenario setup card example:
  "Setup VLN pool with:
     2 tokens tagged CULT (any 2 from VLN tier-3 CULT options)
     2 tokens tagged EMBER (any 2)
     1 token tagged NEUTRAL (any 1)"

Players grab the appropriate count of CULT-tagged, EMBER-tagged, etc. 
(from box's general supply); shuffle face-down. Specific identities 
are still random within the constraint.
```

★ Composition by category/tag/tier, not by unique name. Maximizes obfuscation; designer specifies the SHAPE of the pool, randomness fills in the specifics.

### Bidirectional constraint via physical tag filtering

```
First identity reveal commits the tag:
  Token "Cult Acolytes" drawn from MOB pool
  Tag: 👹 CULT
  → Commit faction:CULT for this scenario
  → Players physically search each pool, REMOVE non-CULT tokens
  → Set removed tokens aside (return to box at scenario end)
  → Pools are now visibly smaller

Subsequent draws automatically respect the constraint:
  Story card CA-04 reveals → VLN slot pulls from CULT-only options
  Tile encounter reveals MOB → only CULT mobs available
  Coherent throughout

Reverse-flow example:
  First reveal is VLN "Brigand King" (🗡 BRIGAND) from a story card
  → Faction:BRIGAND committed
  → All non-BRIGAND tokens removed from all pools
  → Subsequent MOB draws limited to BRIGAND options

Symmetric: either pool can commit first; the other automatically constrains.
```

### Single-slot story cards

Not all story cards need multi-slot grids:

```
Card CA-02 [NPC — A Wounded Stranger]:
  "You meet a wounded stranger who knows the way."
  
  ┌─────┐
  │ NPC │   single slot
  └─────┘
  
  At reveal: draw 1 from NPC pool, place token in slot.
  Future references: by token name (e.g., "Eira" if drawn).
```

Many story cards have 0 slots (self-contained narrative); some have 1-2; major reveals have 3-6.

### Card text references

```
Future card CA-09 [COMBAT]:
  "Kethros's warriors charge!"

Players check the table:
  CA-04 visible → VLN slot shows "KETHROS" token → confirms identity

Or via glyph reference:
  "The mobs from CA-04 advance"
  → MOB slot on CA-04 shows the active mob token name
```

★ No placeholder substitution; the table-visible diary IS the reference.

### Table layout (worked example)

```
After CA-04 reveal with all tokens placed:

  +─────────────────────────────────────────+
  |   CA-04 [LORE — The Cult Revealed]      |
  |                                         |
  |   "You uncover the cult's plans..."     |
  |                                         |
  |   ┌──────┬──────┬──────┬──────┐         |
  |   │ KETH │ SEAL │ CULT │ ECL  │         |  ← Tokens placed
  |   │ ROS  │ ING  │ VETS │ IPSE │         |     (all 👹 CULT)
  |   │ 👹   │ 👹   │ 👹   │ 👹   │         |
  |   └──────┴──────┴──────┴──────┘         |
  |                                         |
  |   CHOICES: ...                          |
  +─────────────────────────────────────────+
```

### Production counts per scenario

```
Story cards with slot grids:    ~5-10 (key story moments)
Story cards without slots:       ~20-30 (flavor, minor beats)
Identity tokens:                 ~30-50 (across all pool categories)

Per base game (5 scenarios):
  ~150-200 story cards
  ~200-250 identity tokens
  + standard tile / slot / status marker components
```

### Replay variance

Same scenario, different identities drawn each playthrough:

```
Run 1: First draw → "Kethros, the High Priest" (CULT)
       Whole scenario plays out CULT-themed
       
Run 2: First draw → "Brigand King" (BRIGAND)
       Whole scenario plays out BRIGAND-themed
       
Same story cards, completely different antagonist narrative.
```

★ The composite system (story cards + identity tokens + bidirectional tags) gives massive replayability with modest production cost.

### Decisions locked

- ★ Identity tokens (small sub-cards) for pool-drawn fillables
- ★ Story cards with printed slot grids matching pool categories
- ★ At reveal, draw tokens from matching pools, place on card's slot grid
- ★ Tags on tokens drive bidirectional pool filtering (physical removal)
- ★ Composite cards (story card + filled tokens) stay on table as diary
- ★ Future card references resolved by checking diary for placed tokens
- ★ Pool categories per scenario: VLN / PLT / MOB / EVT / NPC (designer-tunable)
- ★ Some story cards have 0 slots; others have 1-6

### Card identity — multi-level keys

Every card has a globally unique key: `GROUP-NN` (e.g., `CA-06`, `S1-12`, `J-04`, `VJ-09`).

```
GROUP    1-3 chars  Identifies the scenario / story arc / pool
   -    hyphen separator
NN       2 digits   Position within group (01-99), zero-padded
```

Group prefix corresponds to a **scenario or story arc**, NOT to content type. Cards within a group mix combat, NPC dialogue, lore, treasure, and hazard content — unified by narrative arc, not category.

Group prefix conventions (designer-tunable per content set):

| Prefix | Meaning |
|---|---|
| `TU-` | Tutorial arc |
| `S1- S2- ...` | Numbered scenarios |
| `CA-` | "Cult Arc" — named multi-scenario story |
| `DA-` | "Dragon Arc" — named story |
| `J-` | Joker / wild flavor pool (universal random) |
| `VJ- EJ- TDJ- GJ- SJ- AJ-` | Biome-flavored joker pools |
| `B- X1- X2-` | Base game / expansion sets |

Keys allow cross-arc references — a choice on card `CA-03` can manipulate `S1-08` cleanly.

### Card content carries the type

Each card declares its own type on the face. Type is content metadata, not deck-organizing principle:

```
Card CA-03 [COMBAT — Cult Guards]
Card CA-04 [LORE — Sigil Inscription]
Card CA-07 [NPC — Wounded Ranger Ally]
Card CA-09 [TREASURE — Crypt Hoard]
```

### Tile markers indicate source group

```
📖[CA] → draw next from CA arc
📖[S1] → draw next from S1 scenario
📖[J]  → draw from joker pool (random flavor)
📖[VJ] → draw from VERDANT joker pool (biome flavor)
```

Markers indicate WHICH group to draw from. Group's stack ordering (numbered cards top → in order; random below) determines WHICH specific card.

If a scenario uses only one main arc, markers can be simplified (just `📖` → "draw from active arc").

### Branching via deck manipulation

Choices on story cards can:
- **Insert** a specific card (by full key) onto deck top, bottom, or specific position
- **Remove** a specific card from the deck entirely
- **Move** a card to a different position
- **Conditional** trigger based on game state (alert, party comp, items, scenario clock)

Examples:

```
Card CA-03 [COMBAT — Cult Leader Confrontation]:
  "You confront the cult leader at the inner sanctum."
  CHOICES:
    A) Fight him        → Resolve combat (tier 3 enemy)
    B) Parley           → Remove card CA-05 from deck (boss battle averted)
                          raise card alert in current card
    C) Flee             → Place card CA-07 on top of deck (cult pursues)

Card CA-06 [NPC — Wounded Ranger]:
  "You meet a wounded ranger who knows the way."
  CHOICES:
    A) Help her         → Take card CA-09 from deck (ranger joins as ally NPC)
                          Place ☉ slot in current section
    B) Continue         → Remove cards CA-09 and CA-10 from deck
                          raise card alert
    C) Take her supplies and leave
                        → Hero gains 1 food + 1 healing potion
                          Remove card CA-09 from deck
                          −1 Heroism for ethics

Card CA-11 [LORE — Ancient Sigil]:
  "The ancient sigil glows in response."
  CHOICES:
    A) Study it         → If Mage in party: take card CA-14 (magical revelation)
                          Otherwise: card discarded
    B) Smash it         → raise card alert directly to 2
                          Spawn tier-3 enemy in adjacent card
                          Place card CA-09 on top of deck
```

### Conditional triggers

State-driven branching:

```
"If card alert = 2 (sustained 3+ turns): take card CA-13 from deck, place on top (reinforcements)"
"If hero has the relic from card S1-T-02: take card CA-08"
"If Priest in party: option C available; otherwise locked"
"If scenario clock advanced X steps: remove card CA-16 (the cult has left)"
```

### Deck physical management

- Cards stacked face-up (number visible) at setup so designers/players can find specific cards
- Removed cards → "discarded / not used" pile (return to box at scenario end)
- Inserted cards → placed at specified position immediately

### Branching depth

Designer composes branching through card content. Simple scenarios: linear numbered cards, no manipulation. Complex scenarios: rich conditional + choice-based deck manipulation creates multi-arc narrative without flowchart language.

### Class engagement in story

Story cards can have class-specific outcome branches:

```
"If Mage: dispel option available, +1 expendable on success"
"If Priest: blessing option, restore HP to all allies"
"If Rogue: stealth approach, no alert change"
"If Scout: alternate route revealed"
"If Knight: rally option, +1 inspire to next ally"
"If Heavy: brute force, automatic STR check pass"
```

Adds class identity to narrative moments beyond combat.

### Production

```
Story cards: ~80-200 across all scenarios in base game
  Per scenario: 20-50 cards typical
  Reusable across scenarios: joker, biome-keyed
  Scripted scenario-specific: prominent numbering

Storage:
  Each scenario box / envelope: scenario-specific cards
  Main game: reusable decks (biome, joker)
  Each scenario card lists deck composition for setup
```

---

## 🛡 Classes (6 base)

All values placeholder, calibrate via playtest.

| Class  | AP base | HP  | STR / AGI / INT | Resource         | Identity |
|--------|---------|-----|-----------------|------------------|---|
| Knight | 4       | 14  | 4 / 1 / 1       | Heroism tokens   | Reliable melee, defender, rallier |
| Heavy  | 3       | 16  | 5 / 0 / 1       | Wrath tokens     | Devastating melee, slow, durable |
| Rogue  | 5       | 9   | 2 / 4 / 2       | (positional + items) | Stealth, traps, backstab |
| Mage   | 4       | 7   | 1 / 2 / 5       | Mana gems        | Spells cantrip → ritual; fragile |
| Priest | 4       | 11  | 3 / 2 / 4       | Faith markers    | Hybrid combat+heal+control; anti-evil |
| Scout  | 6       | 8   | 2 / 4 / 2       | (extra AP)       | Exploration, ranged, mobility |

All classes roll 2d for AP bonus; total AP = base + roll successes.

### Skill ratings per class

Three primary skills: **Combat**, **Stealth**, **Magic**. Each rated −1 / 0 / +1.

| Class | Combat | Stealth | Magic |
|---|---|---|---|
| Knight | +1 | −1 | −1 |
| Heavy | +1 | −1 | −1 |
| Rogue | 0 | +1 | 0 |
| Scout | 0 | +1 | 0 |
| Mage | −1 | 0 | +1 |
| Priest | 0 | 0 | +1 |

Class actions and spells can override or amplify these (e.g., Priest's Smite vs undead reads as +2 effective).

### Class utility actions (3–5 each)

Per archetype:
- **Knight**: block, force, inspire/rally
- **Heavy**: force, move-heavy, carry, hold-ground
- **Rogue**: disarm, lockpick, distract, backstab
- **Mage**: identify, detect-magic, light, enchant
- **Priest**: heal (small/medium/greater/mass), bless, cleanse, turn-undead
- **Scout**: scout, track, listen, hunt

### Resource specifics

- **Mana gems (Mage)**: inventory loot, refresh at shrines, lost at scenario end
- **Faith markers (Priest)**: earned via devotion/shrines, persist across scenarios up to 2× starter
- **Heroism tokens (Knight)**: +2 boss kill, +1 tier-3 kill, +1 heroic deed; lost at scenario end
- **Wrath tokens (Heavy)**: earned via damage taken; lost at scenario end

### Spell / ability tiers

| Tier | AP | Expendable |
|---|---|---|
| Cantrip | 1–2 | 0 |
| Standard | 2–3 | 0 |
| Major | 3–5 | 1 |
| Ritual | 5–6 | 2 |

Spam-prevention via AP cost + expendable + positional gates. No cooldowns.

---

## ❤ Resources

### Per hero

- **HP** (class-specific max)
- **AP** (rolled per turn)
- **Food** (inventory; 1 free eat/turn)
- **Expendables** (class-specific resource)
- **Items** (consumables, gear)

### Tracked per card

- **Alert level** (0/1/2, per-card — one-step propagation only)
- **Revealed slots** (resolved or pending)
- **Wall markers** (placed at mismatches)

### Scenario-wide

- **Campaign clock** (advances on soft breaks)
- **Incursion deck state** (random encounter pool)

---

## 💤 Recovery hierarchy

Layered from cheapest to most generous:

| Tier | Method | Cost | Recovery |
|---|---|---|---|
| 1 | Eat food (1×/turn free) | 1 food | +1 HP outside camp / +3–5 HP at camp |
| 2 | Healing item | consumable | +3–5 HP |
| 3 | Priest heal | AP + 0–2 markers | +3 / +5 / +8 HP / mass heal ritual |
| 4 | Shrine | 2–4 AP, ⌈reserve/2⌉ markers | class-keyed, multi-visit diminishing |
| 5 | In-delve camp | ☾ slot + 1 food/hero | rest = full HP / watch = half + alert |
| 6 | Soft scenario break | scenario time advances | full HP, full expendables (to cap), status cleared, card alerts reset to default |
| 7 | Scenario end | n/a | full reset, meta-progression |

### In-delve camp specifics

- Each hero: rest ☾ or watch 👁
- 1 food/hero mandatory; bonus food = +3–5 HP each
- Camp turn random encounter roll; watcher reduces chance
- If attacked: round 1 = watchers only; resting heroes wake round 2 (2 AP groggy); round 3+ normal
- No alert change; camps aren't noisy (threat comes from outside)

### No long rest mid-delve

Only in-delve camps (with food cost) or soft breaks. Permadeath on run end.

---

## 🚨 Alert & random encounters

### Alert replaces continuous alarm

Each card has a single alert level (0 / 1 / 2). Random encounters and pressure derive from alert, not from a continuous numeric track.

```
ALERT 0    UNAWARE          No random encounter risk; cards are calm
ALERT 1    AWARE             ~25% encounter chance per turn-end
ALERT 2    HOSTILE           ~50% encounter chance per turn-end
                              Sustained 2+ turns → severity escalates
```

### Random encounter trigger

```
At end of hero turn, for each card hero is on or adjacent to:
  Roll % chance based on card's alert level
  If triggered → draw from incursion deck

Tier of encounter drawn scales with how long card has been at alert 2:
  1st turn at alert 2: minor tier
  2nd turn:            medium tier
  3rd+ turn:           major tier
```

### Encounter severity tiers

| Tier | Examples |
|---|---|
| **Minor** | Distant patrol, noise, lost wanderer, small wild beast, passing noise |
| **Medium** | Wandering monster (tier 2), cultist scout, hazard event, hostile NPC |
| **Major** | Reinforcement wave, tier-3 elite, boss-tier attention, major event |

### Incursion deck

Small special deck (~12–20 cards per scenario), tiered into minor / medium / major sub-piles. Designer composition per scenario theme.

### Encounter placement

1. Find **nearest border** to the triggering hero — revealed or unrevealed — within 1 card distance
2. Tie-break: highest-alert neighbor, else d6 direction roll
3. Spawn encounter at the entry section of the target card
4. If interior with no qualifying border: fallback spawn in current card (rare)

### Enemy movement on revealed map

All section connections treated as open. Enemies path freely on revealed cards; cover/sight rules apply only to heroes.

### Alert dynamics (consolidated per-card)

```
ESCALATION (per card):
  0 → 1    hero enters card first time
  0 → 1    adjacent revealed card at alert 2 (one-step propagation)
  0 → 1    story trigger / class ability / magic effect
  
  1 → 2    any damage to non-sleeper enemy on card
  1 → 2    sustained presence (3+ turns at alert 1)
  1 → 2    confirmed visibility / specific narrative trigger

DE-ESCALATION (at hero turn start):
  1 → 0    no hero on card AND no stimulus for 2-3 turns
  1 → 0    successful disguise / distraction
  
  2 → lower    difficult; usually requires:
               - all non-sleeper enemies on card defeated (decay over time)
               - major narrative effect (truce, charm, mind control)
               
  Reset on soft scenario break (all cards back to designer-default alert)

INTER-CARD PROPAGATION:
  Alert 2 card → adjacent revealed cards: 0 → 1 (one-step, no chain)
  Checked at each turn-end while alert 2 persists
```

### Failed stealth and alert

```
Hero auto-fails stealth check or commits-and-fails:
  Current card alert 0 → 1 immediately (caught)
  Adjacent cards may also propagate next turn

Stealth budget exhausted but hero stops in last affordable section:
  No alert change (still hidden, no detection)
```

---

## 📏 Pacing layers

| Layer | Duration | Tension carrier |
|---|---|---|
| Per-turn | seconds | AP roll, action choice |
| Per-room | minutes | Slot resolution, combat tick |
| Per-segment | 15–30 min | Continuous pressure, no long rest |
| Per soft-break | narrative beat | Full recovery, scenario clock advances |
| Per-scenario | 60–90 min | Multi-segment arc |
| Per-run | hours / sessions | Campaign with permadeath |
| Across runs | meta | Unlocks, class variants, scenarios |

---

## 🎨 Visualization (perspective-agnostic mechanics)

Mechanics work in any visual style. Production can mix:

- **Top-down** — schematic, cheapest, used for utility cards
- **Oblique toward center** — radial perspective; walls splay outward from center to square edges; rotation-invariant
- **Isometric** — premium boss / scripted scene cards
- **Side view** — rare narrative scenes only

### Visual conventions (any perspective)

- Square cards, rotatable in any direction
- Center is the visual focal point
- Iconography is rotation-invariant (no compass markers)
- Section graph rendered via **transparent overlay**: circles for sections, lines for connections, symbols for slots
- AI-generated atmospheric art handles flavor; overlay handles all mechanical info

### Two-layer card production

```
LAYER 1: Background art (AI-generated, any perspective)
LAYER 2: Vector overlay (sections, lines, slot symbols, edge indicators, biome bands)
```

Symbols and mechanics live in the overlay; cards remain consistent regardless of art style.

---

## ❓ Open / to calibrate

### Numbers (playtest)

- Class AP base values (current 3 / 4 / 4 / 4 / 5 / 6)
- Action costs (first-pass table above)
- Weapon pool sizes (placeholder above)
- Enemy defense and HP scaling (current 1/2/3/4 def, 2/5/8/15 HP)
- Pip-to-tier mapping for slot population
- Alert de-escalation timing (currently 2-3 turns no stimulus)
- Alert 2 → lower decay rules (currently narrative-only)
- Stealth section costs (covered 0 / partial 1 / open 2)
- Surge effect balance per weapon/spell/action
- Encounter trigger probability tuning (currently 25% at alert 1, 50% at alert 2)
- Severity tier thresholds (alert 1 / alert 2 / sustained alert 2)
- Shrine reserves and class keying
- Camp recovery percentages
- Stealth skill cap (currently ±1)

### Content (authoring)

- Specific class abilities (3–5 utility actions per class, full list)
- Enemy roster, tiers, stealth values
- Scenario library (number, structure, narrative)
- Wall stack composition per scenario
- Incursion deck composition per scenario
- Biome adjacency graph (final lore-tied version)
- Card pool composition per biome
- Item economy

### Production

- Default oblique tilt angle (15° vs 30° vs varied)
- Symbol / glyph design system
- Card art commission strategy (AI base + human polish? Custom from start?)
- Overlay template (Figma / SVG)
- Physical vs digital-first

### Modes

- Solo vs coop vs competitive (currently coop-only)
- Difficulty modes
- Variable scenario length

---

## 🎭 Scenario types & narrative diary

The framework supports multiple gameplay genres beyond dungeon runs. Same core mechanics; scenarios specify what additional layers they engage.

### Story cards as scenario diary

Revealed story cards stay on the table as a visible record. No separate key sheet. The cards themselves document discoveries — their text carries specific named identities directly.

```
On story card reveal:
  Resolve narrative + mechanical effects
  Card stays on table in "diary" area (face-up)
  
Card text uses specific names directly:
  "You discover Kethros is the High Priest of the Cult of Aeloth."

  No placeholders / no key sheet rendering.
```

Future cards reference earlier reveals:
- By card key: "Kethros, the priest from CA-04"
- By proper name: "Kethros approaches" (rely on player memory + diary visibility)
- By context: "the cult priest you confronted"

★ The card IS the diary entry. Players read the table to recall developing story.

### Diary as table layout

```
Player area:
  +-----------------+
  | DRAWN CARDS     |   Cards arranged chronologically or by category
  | [CA-01] [CA-04] |   Visible to all players
  | [CA-07] [CA-12] |   Referenced as needed
  | [N-03]  [L-08]  |
  +-----------------+

Cards categorize loosely:
  Story beats / revelations
  Encountered NPCs (☉ identity reveals)
  Found loot / treasures
  Clues (detective scenarios)
```

Cards stay visible until explicitly consumed by deck manipulation (e.g., "remove card CA-09 from deck" by a choice).

### What this simplifies vs alternative key sheet

```
NO extra component         (no key sheet to print/distribute/lose)
NO copying or writing      (names committed directly to cards)
ONE state model            (story cards are the diary in all dimensions)
Visual record at a glance  (heroes see developing narrative on the table)
NO placeholder rendering   (cards use specific names)
```

### Authoring change

Designer writes cards with **specific named identities** directly:

```
Card CA-04 [LORE]:
  TEXT: "You discover Kethros is the High Priest of the Cult of Aeloth.
         He seeks the Sunstone of Aeloth to bind it to his will."
  
  CONSTRAINT RIDER (printed at bottom):
    Commit {faction:CULT}
    Remove non-CULT cards from ⚔ pool
  
  CHOICES:
    A) Investigate further → take card CA-11 (if Mage in party)
    B) Press on → continue
    C) Search the chamber → place ✦ loot slot here, tier 2
```

Card text becomes specific, printed once. Scenario authoring is concrete.

### Variant scenarios — multiple identity sets for replay

For replay variance, scenarios may include multiple variant cards for the same scenario role; one is chosen at start:

```
Scenario "Ruins of the Sun Cult" — 3 villain variants:
  CA-04-A: "Kethros, the High Priest..."   (specific named villain)
  CA-04-B: "Vexa, the Sun Champion..."     (alternate)
  CA-04-C: "The Twin Priests..."            (alternate)

At setup: shuffle variants, draw one, place in CA stack as CA-04.
Discard the others for this scenario.

→ Same scenario, different villain each playthrough.
```

### Inter-card references

Cards reference each other by key or by narrative context:

```
Card CA-09 [COMBAT]:
  "Kethros's warriors charge!"

Players check diary:
  CA-04 visible on table → confirms Kethros's identity
  No placeholder substitution; just narrative continuity via visible diary record.

Alternative explicit reference:
  Card CA-09: "The villain from CA-04 sends reinforcements."
  → Read diary card CA-04 to recall the name.
```

### Diary as narrative artifact (post-scenario)

After scenario ends:
- Diary is the story heroes lived
- Players review their choices, names encountered
- Photographs of the diary become campaign memory aids
- For meta-progression, specific cards may carry forward (NPC allies → permanent allies)

### Scenario genres supported

```
DUNGEON RUN (default):
  Procedural wilderness/dungeon biomes
  Encounter-driven exploration
  Loot + meta-progression

ESCORT MISSION:
  NPC token (☉ persistent ally) follows the party
  Failure if NPC dies or abandoned
  Escort target named on a specific reveal card
  Special enemy AI: prioritize NPC

DETECTIVE MYSTERY:
  Clue tokens (🔍) gathered via tile exploration
  Each clue card stays on table as part of the case file
  Final accusation phase: choice gated by visible clue cards
  Branching outcomes based on accuracy

URBAN / POLITICAL:
  City biome with sub-pools (TVN, MRK, SLM, NBL, DCK, GRD)
  Faction reputation tracking (cards committed to {faction})
  Dialogue and persuasion challenges

SURVIVAL / HUNT:
  Wilderness biomes; tracking prey across tiles
  Limited supplies (food, water consumption)
  Status: hunger, exhaustion, exposure
```

★ Core mechanics stay the same. Scenarios mix and match these patterns within the unified framework.

### City biome sub-pools

```
TVN  Tavern        Social gathering, NPCs, drink-related events
MRK  Market        Trade, theft, encounters with merchants
SLM  Slums         Criminal underworld, beggars, dangerous alleys
NBL  Noble         Wealthy district, political intrigue
DCK  Docks         Sailors, smugglers, water access
GRD  Guard         Patrols, watch posts, arrests
TMP  Temple        Shared with dungeon TMP sub-pool
```

City biomes carry the same section topology as wilderness biomes. Stealth/cover dynamics work in urban setting (alleys, market crowds, rooftops as covered sections).

### Faction system (optional layer)

For urban / political scenarios:

```
Heroes track +/- reputation with named factions.

Example factions per scenario:
  GUARD       (city watch)
  CULT        (the antagonists)
  MERCHANTS   (trade guild)
  CRIMINALS   (thieves guild)
  NOBLES      (aristocracy)

Actions modify reputation:
  Help NPC of faction X         → +1 with X
  Attack NPC of faction X       → −1 with X
  Complete faction quest        → +N
  Betray faction                 → severe penalty

Faction state affects:
  Available story card options
  Random encounter composition (high alert with GUARD = patrol)
  Final scenario outcomes
```

Opt-in per scenario. Not all scenarios use factions.

### Detective scenarios — clues as story cards; on-demand truth

Detective scenarios leverage existing mechanics with minor additions:

```
NO PRE-DRAWN TRUTH.
Clues are STORY CARDS of type [CLUE].
Resolution = standard draws from filtered pools at the accusation phase.
```

```
[CLUE] story cards drawn during investigation:
  Carry narrative ("Cult sigil at crime scene")
  Carry constraint riders (commit 👹 CULT — filter pools)
  Stay on the diary table as the "case file"

Each clue narrows the truth pools via the existing constraint mechanism.
Same as VLN / PLT / NPC / etc. reveals — clues are just identity-tagged
story cards focused on hint content.
```

Hidden 📖 story triggers may be embedded on:
- Tile sections (printed default)
- ❖ mystery tokens (revealed on inspection)
- ☉ NPC tokens (revealed on interaction)
- ✦ loot items (revealed on take — journal, map, letter)
- Status markers (revealed on investigation)

Inspection of ❖ may reveal hidden 📖 → triggers story card draw.

### Investigation narrows pools

```
Heroes inspect ❖ → 📖 trigger → draws [CLUE] story card "Cult sigil"
  → commit 👹 → filter VLN/PLT/MOB pools to CULT-tagged

Heroes investigate further → draws [CLUE] "Poison residue"
  → commit ☠ POISON → filter METHOD pool

Heroes interview ☉ → draws [LORE] "Noble seen at scene"
  → commit 🏛 → bridges CULT-NOBLES tokens favored

By accusation phase: pools are tight, candidates narrowed.
```

### Generalized RESOLUTION phase

Detective accusation is one instance of a broader RESOLUTION mechanic — any scenario climax where heroes commit to a target and pools reveal the truth.

```
Card S1-RES [RESOLUTION] variants by scenario type:

[ACCUSATION]   Detective         "We accuse X of Y by method Z"
[HUNT]         Monster hunt      "We hunt the werewolf at location"
[CAPTURE]      Pursuit           "We catch the thief at hideout"
[ASSAULT]      Combat finale     "We strike the warlord's lair"
[RESCUE]       Escort climax     "We extract the hostage"
[BANISH]       Magical finale    "We banish the demon"
[EXPOSE]       Political         "We expose the conspirator"
[SEAL]         Cosmic            "We seal the rift at location"

All share the same mechanic:
  1. Heroes commit theory (suspect / target / method)
  2. Draw from filtered pools at resolution time
  3. Compare commit vs drawn truth
  4. Outcome tier:
      Full match (named identity)    → primary objective, max reward
      Partial match (tag set)        → objective partially achieved
      No match                       → target escapes, partial fail
```

### Why on-demand (not pre-drawn) truth

```
Investigation actively narrows pools via constraint propagation.
At resolution, truth is drawn from the now-filtered pool.

HEROES WHO INVESTIGATE DEEPLY:
  Many clues → many tag commits → tight pool (~1-2 tokens)
  Specific accusation likely to match
  Full reward

HEROES WHO RUSH:
  Few clues → loose constraints → broad pool (~5-8 tokens)
  Specific accusation unlikely to match
  Partial or wrong; lesser reward

PURE LUCK NEVER WINS:
  Without investigation, accusation is essentially random
  Investigation transforms accusation from coin-flip to guaranteed
```

### Worked example — detective scenario

```
"Murder in the Court" using on-demand truth:

PLAY:
  Tile MOB reveal → "Cult Acolyte" (👹) — CULT faction commits
                    → "Cult of Vekros" faction card drawn
  
  ❖ inspection → 📖 trigger → [CLUE] "Cult sigil at scene"
                    → commits 👹 (already committed; reinforces)
  
  🔍 slot → [CLUE] "Poison residue"
                    → commits ☠ → METHOD pool filtered
  
  ☉ NPC interview → [CLUE] "Robed noble seen"
                    → commits 🏛 → bridges (👹🏛) favored

ACCUSATION:
  Card S1-RES [ACCUSATION]
  Heroes commit: "Cult-Noble bridge VLN, poison, ritual motive"
  
  Resolution draws:
    Filtered VLN pool → "Lady Veris" (👹🏛 — only bridge remaining)
    Filtered METHOD pool → POISON (only survivor)
    Filtered PLT pool → "Ritual Sacrifice"
  
  Match: full → arrest, scenario win, full reward
```

### Empty truth pool handling

```
If investigation over-narrows (no tokens left in a pool):
  Scenario specifies fail-safe behavior:
    Auto-fail accusation
    OR re-expand pool (draw from initially-removed)
    OR partial credit narrative
  
Practical: pools sized to ensure 1-3 candidates remain after typical investigation.
```

### Detective scenario uses standard layers

```
✓ Tile system + slots
✓ Story cards (with high [CLUE] density)
✓ Identity tokens (VLN, PLT, MOB, NPC pools)
✓ Faction emergence + cards
✓ Constraint propagation (clues commit tags)
✓ Resolution card at climax

No special "detective rules" beyond:
- Higher [CLUE] density in story stacks
- A [RESOLUTION] / [ACCUSATION] card at scenario end
```

### Escort mechanic — NPC ally rules

```
Persistent ☉ NPC slot follows the party:
  HP / defense per scenario specification
  Moves with party (shares AP cost)
  Cannot act independently (no AP)
  
Failure conditions:
  NPC HP → 0
  NPC abandoned (card alert escalates in NPC's card, no hero adjacent for N turns)

Enemy AI variants:
  Some enemies prioritize NPC target
  Status markers can target NPC ("the cult curses your ally")

Success:
  NPC reaches destination tile (anchor) → scenario success
  OR escort phase ends with [RESCUE] resolution card
```

### Mixed-genre scenarios

```
"The Lost Heir" — multi-genre example:

Blends: Escort + Detective + Urban + Combat

Active layers:
  Persistent ☉ NPC (the heir Princess Lyra)
  [CLUE] story cards (identify the assassin)
  City biome + sub-pools (NBL, MRK, SLM, GRD)
  Multi-faction commitments (CULT, NOBLES, GUARD)
  [RESOLUTION] card at climax (accuse + rescue + assault)

Progression:
  Heroes escort heir through urban environments
  Gather clues identifying the assassin
  Confront at hideout (revealed by clue tag commits)
  Final RESOLUTION: identify killer + extract heir + survive
```

★ All within the same framework. Different scenarios engage different subsets of mechanics.

### Genre support summary

Each genre uses the same core mechanics with different emphases:

| Genre | Primary biomes | Key markers | Special mechanic |
|---|---|---|---|
| Dungeon run | Wilderness + GLOOM/EMBER/etc. | ⚔ ✦ ❖ | Permadeath, loot |
| Escort | Any | ☉ persistent | NPC AI, fail condition |
| Detective | CITY | 🔍 clue | Key sheet deduction |
| Political | CITY (NBL, GRD) | ☉ faction | Faction reputation |
| Survival | VERDANT, EMBER | 💧 ☠ supply | Resource depletion |

Scenarios choose which patterns to engage.

### Decisions locked

- ★ Scenario key sheet replaces generic flavor tables for named slots
- ★ Slots fill through discovery (card reveal text writes the value)
- ★ Card text references slot tokens ({villain}, {macguffin}, etc.)
- ★ CITY biome added as 7th top-level biome
- ★ City sub-pools: TVN, MRK, SLM, NBL, DCK, GRD
- ★ Optional faction system for urban / political scenarios
- ★ Clue mechanic (🔍) for detective gameplay
- ★ Escort mechanic via persistent NPC slot
- ★ Mixed-genre scenarios supported within unified framework

---

## 🧩 Scenario modularity

Not every scenario uses every framework layer. Scenarios declare which mechanics they engage; setup pulls only relevant components.

### Scenario-mechanic matrix

```
Mechanic                       Tutorial  Dungeon  Escort  Detective  Intrigue
─────────────────────────────────────────────────────────────────────────────
Tile system + slots               ✓         ✓        ✓        ✓          ✓
Story cards (alternation)         ✓         ✓        ✓        ✓          ✓
Identity tokens                              ✓        ✓        ✓          ✓
Faction emergence                            ✓        ✓        ✓          ✓
Multi-faction commitments                             ◐        ✓          ✓
Faction reputation                                             ◐          ✓
Resolution / accusation phase                                  ✓          ◐
[CLUE] story cards                                             ✓
NPC escort (☉ persistent)                             ✓                   ◐
City biomes / sub-pools                                                   ✓
Supply / hunger / exposure                ◐
Branching deck manipulation       ◐         ✓        ✓        ✓          ✓
Random encounters / alert         ◐         ✓        ✓        ◐          ✓
Status markers (full vocab)       ◐         ✓        ✓        ✓          ✓
Variant cards / tokens                      ✓        ◐        ✓          ✓
Social combat                                         ◐        ✓          ✓
```

(◐ = optional / light use; ✓ = central; blank = not used)

### Scenario declares its engagement

```
Scenario card lists:
  BIOMES:      VERDANT, GLOOM, TMP, RUI         (which pools active)
  FACTIONS:    single / dual / multi             (faction layer scope)
  RESOLUTION:  ACCUSATION / HUNT / CAPTURE / ... (climax variant)
  ESCORT:      yes / no                          (persistent NPC)
  SUPPLY:      yes / no                          (survival hunger/exposure)
  CITY:        yes / no                          (city biome + sub-pools)
  REPUTATION:  yes / no                          (faction reputation tracking)
  SOCIAL:      yes / no                          (social combat NPCs)
  
Mechanics not declared → not used → no setup needed.
```

### Why modularity matters

- ▶ **Tutorial scenarios** stay minimal — tile + story cards only
- ▶ **Dungeon runs** add identity tokens + faction emergence
- ▶ **Detective** adds [CLUE] cards + accusation
- ▶ **Intrigue** adds multi-faction + reputation + city biomes
- ▶ Players don't face overwhelming rules every scenario
- ▶ Designer authors scoped scenarios with relevant components only
- ▶ Component variety scales with campaign progression

### Progressive complexity across campaign

```
S1 Tutorial:        tile + story cards + light combat
S2:                  + identity tokens + faction emergence
S3:                  + alert + random encounters
S4 Detective lite:   + [CLUE] cards + accusation
S5 Multi-faction:    + multi-faction + reputation
S6 City intrigue:    + city biomes + social combat
...                  meta-progression unlocks further layers
```

★ Players ease into the system. Each scenario introduces one new mechanic on top of the established base.

---

## 🗣 Social combat

Social challenges use the same dice + AP framework as physical combat. Different stat categories, same mechanic.

### Mechanic

```
SOCIAL CHALLENGE:
  Hero rolls social pool (~2-3 dice based on Social skill + class mod)
  Target NPC has:
    Social defense (0-3)            "resistance / stubbornness"
    Trust track (3-10)               HP-equivalent, social "wounds"
    Personality flags                stubborn / vain / fearful / etc.
  
  Hits above defense → reduce trust by 1 each
  Trust 0 → NPC swayed (concedes / helps / reveals)
  Partial trust depletion → partial concession
  Failed challenge → NPC closes off, consequences (rep loss, card alert escalation)
```

### Social skill per class

```
Class       Combat  Stealth  Magic  Social
─────────────────────────────────────────────
Knight      +1       -1       -1      0       (honest, blunt)
Heavy       +1       -1       -1     -1       (intimidating, not persuasive)
Rogue        0       +1        0     +1       (smooth-talking)
Mage        -1        0       +1      0       (analytical)
Priest       0       -1       +1     +1       (compassionate, charismatic)
Scout        0       +1       -1      0       (observant)
```

### Class-specific social surges

```
Rogue:    lie convincingly       → +2 hits this roll
Knight:   invoke honor           → if NPC has "honorable" flag, -1 trust
Mage:     read mind              → reveal one hidden tag on NPC
Priest:   moral / divine appeal  → +1 hit for ethical arguments
Heavy:    intimidate             → trust direct to 0 if already < 3
Scout:    read body language     → see NPC's faction tag glyph if hidden
```

### Social approaches

```
PERSUADE     (Social roll, vs Social defense)
  Default approach; works on most NPCs
  Surge: appeal to NPC's personality flag

INTIMIDATE   (Social roll, vs Social defense + NPC's fear flag)
  Heavy / Knight bonus
  Failure: NPC's faction reputation -1 (they remember)

DECEIVE      (Social roll, vs Social defense + NPC's vain/wise flag)
  Rogue bonus; risky
  Failure if caught: lose access permanently to this NPC

NEGOTIATE    (Social roll, vs Social defense - faction reputation)
  Reputation-dependent (faction card track)
  Higher rep = easier
```

### NPC token social stats

NPC tokens carry social stats on front when social combat is active:

```
NPC TOKEN: Lady Veris (front)

  ┌─────────────────────────────────────────┐
  │  LADY VERIS                  ☉          │
  │  Mother of the slain heir.              │
  │                                         │
  │  Social Defense: 2                      │
  │  Trust: ●●●○○○○ (3 of 7, current)       │
  │                                         │
  │  Personality: vain, prideful, fearful   │
  │  Faction: 🏛 NOBLES                     │
  │                                         │
  │  If swayed (Trust 0):                   │
  │    Reveals secret about her cousin      │
  │    (draw [CLUE] "noble plot")           │
  │    NOBLES rep +1                        │
  │                                         │
  │  If antagonized:                        │
  │    NOBLES rep -1; closes access         │
  └─────────────────────────────────────────┘
```

★ Social NPCs play like a different "enemy type" — same combat-like resolution, different reward outcomes (info, alliance, rep gain).

### Hidden info generalized via ❖ mystery

```
❖ MYSTERY slot is the universal "hidden information" mechanism.

Inspection (1 AP) → flip face-down → reveal what was hidden:
  📖    Hidden story trigger    → draw story card
  ✦    Hidden loot              → place loot slot, draw loot identity
  ☉    Hidden NPC               → place NPC slot
  🪤    Hidden trap              → resolve immediately
  ⚙    Hidden hazard             → place status marker
  
Story triggers (📖) may hide on:
  Tile sections (printed default)
  ❖ mystery tokens (revealed on inspection)
  ☉ NPCs (revealed on dialogue)
  ✦ loot items (revealed on take — journal, map, letter)
  ⚔ post-combat (revealed after enemy defeat)

Same inspection action; varied content via context.
```

★ Sealed envelopes layer on for plot-twist reveals (sparingly used).

---

## 📦 Production materials

Two physical families. Each artifact uses the form best suited to its role.

### Component split

```
CARTON / CARDBOARD (placed, manipulated, durable):
  Tiles                            Thick stock, art + overlay
  Status markers                   Chits by category (different shapes)
  Wall tokens                      Edge-fitting pieces
  Alert markers                    Per-card chits or rotating dials
  
CARD STOCK (shuffled, stacked, drawn):
  Story cards                      Standard playing card size
  Identity tokens                  Smaller cards (~1.5"×1.0")
  Class cards                      Standard size
  Scenario reference cards         Standard size
  Faction cards                    Standard size
  
ROLLED:
  Custom d6 dice                   (3 blank / 2 hit / 1 surge ★)

FIGURES:
  Hero standees or miniatures
```

### Identity token format

```
Identity tokens are small cards (~1.5"×1.0"):

  Category encoded by color + header band
    VLN: deep red header
    PLT: purple header
    MOB: orange header
    EVT: yellow header
    NPC: green header
  
  Back: color band + category letter + tag glyphs (multi-tag) + decorative pattern
  Front: name + description + stats + effect sections

Storage:
  Stacked face-down per category
  Color/header visible at edge for sorting
  Standard card stock (sleeveable)
```

### Component count (base game estimate)

```
TILES:                ~80-120 (carton)
STATUS MARKERS:       ~150 chits (carton)
WALL TOKENS:          ~30-40 chits (carton)
ALARM TRACKERS:       ~20 dials / d6 dice (carton / dice)

STORY CARDS:          ~150-200 across scenarios (card stock)
IDENTITY TOKENS:      ~200-250 across scenarios (small card stock)
CLASS CARDS:          ~6-8 (card stock)
FACTION CARDS:        ~30-40 (card stock)
SCENARIO REFERENCES:  ~5-10 (card stock)

HERO FIGURES:         ~6 (standees / minis)
DICE:                 ~10 custom d6
```

---

## 📦 Base game + extensions

Product structure scales the design's modularity into a release cadence.

### Base game (self-contained, ~$60-80)

```
6 wilderness biomes (VERDANT / EMBER / TIDE / GLOOM / SUN / ARCANE)
6 hero classes (Knight / Heavy / Rogue / Mage / Priest / Scout)
5-6 scenarios demonstrating framework breadth
  S1: Tutorial dungeon
  S2: Classic dungeon run
  S3: Escort mission
  S4: Detective lite (1-2 factions)
  S5: Multi-faction intro
  S6: Boss capstone
All 10 procedural layers active
~100 tiles, ~150 markers, ~400 cards
```

### Extensions (~$25-40 each)

```
EXT-1: CITIES OF SHADOW
  CITY biome (TVN / MRK / SLM / NBL / DCK / GRD sub-pools)
  Faction reputation deepened (4+ factions)
  4-6 urban scenarios (intrigue, detective, political)
  2 new classes (Bard, Inquisitor)
  Social combat fully engaged

EXT-2: THE WILD HUNT
  Monster hunt resolution mechanic (HUNT variant)
  Werewolves, vampires, fey, demons (bridge-tag systems)
  4-6 hunt scenarios
  2 new classes (Hunter, Witch)

EXT-3: VOIDLANDS
  Cosmic horror / corruption mechanic
  VOR (vortex) sub-pool deepened
  Sanity / corruption status track
  4-6 horror scenarios
  2 new classes

EXT-4: CHRONICLES (campaign meta)
  Persistent campaign across scenarios
  Hero progression, class advancement, item heritage
  10-12 chained scenarios
  Meta-progression scaffolding (unlocks)

EXT-5: SHATTERED EMPIRES (faction war)
  Large-scale political scenarios
  Multi-party objectives
  Faction territory tracking on campaign map
```

### Extension principles

- ▶ Self-contained scenarios (work alongside base; no requirement for other extensions)
- ▶ Cross-compatible (combine extensions for hybrid scenarios)
- ▶ No invalidation of base game content
- ▶ New mechanics are OPTIONAL layers (modular per scenario)

### Class progression across releases

```
BASE:           Knight, Heavy, Rogue, Mage, Priest, Scout       (6)
CITIES:         + Bard, Inquisitor                              (+2)
WILD HUNT:      + Hunter, Witch                                 (+2)
VOIDLANDS:      + Cultist-hunter, Voidtouched                   (+2)
CHRONICLES:     + Veteran progression                           (advancement)
SHATTERED:      + Warlord, Diplomat                             (+2)

Total over base + extensions: ~14 classes
Players pick from available pool per scenario
```

### Box organization

```
BASE BOX (large):
  Core mechanical components
  6 base scenarios
  All universal artifacts

EXTENSION BOX (smaller):
  Themed scenario pack
  New tiles for biome / sub-pool additions
  New identity tokens, story cards, class cards
  Extension scenarios reference base components
```

---

## 💻 Digital prototype

The mechanics-heavy design benefits from digital prototyping before production tooling.

### Tech direction: web-based with native-wrap path

```
PRIMARY:
  TypeScript + React + Vite
  Konva or Pixi.js for tile/card rendering
  Zustand or Jotai for state
  YAML/JSON for content authoring

PATH TO APP:
  PWA (immediate, mobile-feel)
  Capacitor (native iOS / Android wrap)
  Tauri (native desktop wrap)
  Same codebase across targets
```

### Why web over Unity

```
Card/board game = web's sweet spot:
  Rendering needs modest (cards, overlays, tokens)
  Rapid iteration critical for prototyping
  URL share for playtest access
  Multiplayer via Liveblocks / Yjs / Convex (well-trodden)
  PWA / Capacitor preserve codebase to app

Unity reserved for:
  Console / Steam targets
  Heavy 3D / physics needs (not this game)
```

### Staged build

```
PHASE 1   Mechanics simulator (TypeScript CLI)    Validate balance
PHASE 2   Single-scenario web playground          Tile + dice + slot flow
PHASE 3   Full scenario flow                      Faction + tokens + diary
PHASE 4   Multiplayer (Liveblocks / Yjs)          Group remote playtest
PHASE 5   Content authoring tools                  Designer workflow
PHASE 6   PWA + Capacitor wrap                    Mobile-ready app
```

### Estimated effort (solo dev)

```
Phase 1: 1-2 weeks (mechanics sim)
Phase 2: 3-4 weeks (web playground)
Phase 3: 4-6 weeks (full scenario flow)
Phase 4: 2-3 weeks (multiplayer)
Phase 5: 2-3 weeks (authoring tools)
Phase 6: 1-2 weeks (PWA + Capacitor)

Total: ~13-20 weeks (3-5 months evenings/weekends)
Tooling cost: < $50
```

### Decisions locked (digital)

- ★ Web-based prototype (TypeScript + React + Konva/Pixi)
- ★ PWA-ready for mobile-app feel without native build
- ★ Capacitor wrap for true native mobile when ready
- ★ Multiplayer added when single-player flow solid
- ★ Defer Unity unless console/Steam becomes priority

---

## 🔄 Layered procedural generation

The game's emergent richness comes from many independently simple procedural layers stacked together. Each is small in isolation; the combination produces tactical-narrative variety without rules overhead per moment.

### The 10 layers

```
1.  Spatial topology         Biome pool + adjacency rules → emergent map geography
2.  Tactical content         Printed slots + pip-driven tier → graded difficulty per tile
3.  Spatial-narrative routing Generic/numbered story markers → arc via traversal
4.  Story stack composition   Scenario + random alternation → emergent rhythm
5.  Branching via decks       Insert/remove/move via GROUP-NN → causally responsive narrative
6.  Pressure mechanics        Per-card alert (0/1/2) + threshold encounters → dynamic threat
7.  Status emergence          Status markers from events → evolving environment
8.  Dice resolution           Pool + stat + surge → probabilistic outcomes
9.  Hero agency               Variable AP + class abilities → tactical decisions
10. Meta-progression          Permadeath + unlocks → long-arc engagement
```

### Layer flow per turn

```
Map (1) → Slots (2) → Story markers (3) → Stack draws (4) → Choice branches (5)
                                                ↓
Pressure (6) → Status (7) → Dice (8) → Hero choices (9) → Meta (10)
```

Every turn touches all 10 layers in microcosm. Complexity is felt as depth, not cognitive load.

### What the player experiences

```
Spatial:    "I'm in a forest tile next to a temple ruin"      (L1, L2)
Narrative:  "The cult is moving south — sigil found"          (L3, L4, L5)
Tactical:   "Combat at the altar room is loud; card alert climbs"  (L6, L7)
Decision:   "I sneak through partial cover, attack from back" (L8, L9)
Long-arc:   "This unlocks the dragon arc for next campaign"   (L10)
```

### What the designer authors

```
Scenario:     pool composition, story decks, anchor tiles, marker placement
Cards:        printed slot templates, story marker positions, card text choices
Pools:        biome and sub-pool composition with density variance
Mechanics:    universal (dice, AP, alert) — shared across content
Meta:         meta-progression unlocks and class variants
```

Designer composes the layers thoughtfully. Procedural systems handle execution.

### Why this works

- ▶ Independent layers — change one without breaking others
- ▶ Per-turn touch-all — every moment a microcosm
- ▶ Scalable richness — small scenarios use few layers; long campaigns engage all
- ▶ Emergent narratives — combinations produce unique stories no single layer could
- ▶ Repeatable surprise — same scenario, different experiences each run
- ▶ Designer-friendly — author at the layer-appropriate abstraction

### Layers added vs base CoraQuest

```
CoraQuest baseline:        Our additions:
  Tile pool                  + Field-graph topology with cover states
  Quest book                 + Per-pool story stacks
                             + Branching via deck manipulation
                             + Generic vs numbered markers
                             + Sub-pool linking
  Light combat               + Success-count dice + surge mechanic
                             + Stealth budget mechanic
  Basic classes              + 6 classes with skills, resources, AP
                             + Class-specific surge / wall / marker engagement
  Danger track               + Per-card alert (3 levels)
                             + Threshold encounters
                             + Random incursion deck
  Story tiles                + Tile-event placement
                             + Status markers
                             + Persistent tile state
  (none)                     + Meta-progression
```

★ Grows CoraQuest's framework into a multi-layered procedural system while preserving its cooperative family-friendly accessibility at the core.

---

## 📐 Status

🟢 **Mechanical framework**: locked at system level (post first playgroup feedback round)

🟡 **Calibration**: pending playtest — all numbers are first-pass (AP costs, alert percentages, chokepoints, pool ratios, stealth penalties)

🟡 **Content authoring**: pending (phase decks, symbol cards, mystery pools, identity tokens per scenario)

🟡 **Production design**: AI art pipeline needs revision — earlier top-down validation (flux-2-klein-4b) superseded by point-and-click landscape perspective

🔴 **Playtest**: not started; first playgroup *discussion* drove the current refinement round

🔴 **Publication path**: not decided

---

## 📚 Reference: design lineage

- **CoraQuest** (Dan & Cora Hughes) — co-op tile-laying dungeon crawler with story booklet, exploration torch / danger track, custom-friendly. Directly closest analog. This design is essentially its grown-up cousin.
- **Karak** — procedural tile-laying with monster-on-tile, light classes.
- **HeroQuest** — tactical density, class roles, GM-driven (but mechanics translate).
- **Mage Knight** — variable action economy, class-specific expendables, exploration + combat blend.
- **Gloomhaven / Frosthaven** — scenario-driven roguelite campaign, tactical map combat.
- **Burgle Bros** — cooperative stealth on tile maps.
- **Fighting Fantasy / playbook adventures** — narrative branching, scripted scenes.
