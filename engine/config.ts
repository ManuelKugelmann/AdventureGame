/**
 * All rule numbers live here — the calibration surface for /tools sims.
 * Never inline these in systems code.
 *
 * The object is intentionally mutable at runtime so tools/sweep.ts can probe
 * knob values Monte-Carlo-style; game code must only ever read it.
 */
export interface GameConfig {
  dice: {
    /** faces on the custom d6: 3 blank / 2 hit / 1 surge (surge = hit + effect) */
    blankFaces: number;
    hitFaces: number;
    surgeFaces: number;
  };
  turn: {
    /** AP = classBase + hits(apDice d6) rolled at turn start */
    apDice: number;
    /** absolute ceiling on game length (scenarios may set lower caps) */
    maxRoundsCeiling: number;
  };
  costs: {
    moveSection: number;
    crossExit: number;
    reHide: number;
    inspect: number;
    attackMaxAp: number;
    climb: number;
  };
  alert: {
    min: number;
    max: number;
    /** floors: unstealthed movement ⇒ ≥1, zone-share with committed enemy ⇒ ≥2, enemy damaged ⇒ ≥3 */
    floorUnstealthedMove: number;
    floorZoneShare: number;
    floorEnemyDamaged: number;
    /** rounds a card must stay empty (heroes+enemies) to de-escalate 3→2 / 2→1 / 1→0 */
    deescalateEmptyRounds: { fromThree: number; fromTwo: number; fromOne: number };
    /** encounter chance per round-end check, indexed by card alert 0-3 */
    encounterChancePct: number[];
    /** sustained alert-3 rounds after which encounters spawn an extra enemy */
    severityEscalationAge: number;
    /** total live enemies cap (spawns beyond this are skipped) */
    enemyCap: number;
  };
  stealth: {
    /** dice rolled for a stealth attempt; budget = hits − alertPenalty + skill */
    dice: number;
    /** budget penalty indexed by card alert 0-3 */
    alertPenalty: number[];
    /** section entry cost by cover */
    sectionCost: { covered: number; partial: number; open: number };
  };
  combat: {
    /** defender DEF modifier from the cover of its section */
    coverDefMod: { covered: number; partial: number; open: number };
    /** bonus dice for a first strike from hidden */
    hiddenStrikeBonusDice: number;
    /** melee attack into an adjacent chokepoint-blocked section is allowed (project.md open question) */
    allowAttackIntoBlockedSection: boolean;
  };
  enemy: {
    /** sections an enemy may move per activation */
    moveSpeed: number;
    /** damage an enemy attack deals per net hit */
    damagePerNetHit: number;
  };
  hiding: {
    /** default occupant cap for a hiding zone when the content omits one */
    defaultCapacity: number;
  };
  ambush: {
    /** default chance an ambusher springs when a hero enters an adjacent zone */
    defaultChancePct: number;
  };
  resolution: {
    /** aspect matches (of who/where/how) required for full / partial success */
    fullMatches: number;
    partialMatches: number;
  };
  debug: {
    /** deep-freeze the state returned by createGame/applyCommand so external
     * mutation throws instead of corrupting the log (off in bulk sims for speed) */
    freezeState: boolean;
  };
}

export const config: GameConfig = {
  dice: { blankFaces: 3, hitFaces: 2, surgeFaces: 1 },
  turn: { apDice: 2, maxRoundsCeiling: 40 },
  costs: { moveSection: 1, crossExit: 1, reHide: 1, inspect: 1, attackMaxAp: 3, climb: 2 },
  alert: {
    min: 0,
    max: 3,
    floorUnstealthedMove: 1,
    floorZoneShare: 2,
    floorEnemyDamaged: 3,
    deescalateEmptyRounds: { fromThree: 1, fromTwo: 2, fromOne: 3 },
    encounterChancePct: [0, 10, 30, 60],
    severityEscalationAge: 2,
    enemyCap: 8,
  },
  stealth: {
    dice: 2,
    alertPenalty: [0, 1, 2, 4],
    sectionCost: { covered: 0, partial: 1, open: 2 },
  },
  combat: {
    coverDefMod: { covered: 1, partial: 0, open: -1 },
    hiddenStrikeBonusDice: 1,
    allowAttackIntoBlockedSection: true,
  },
  enemy: { moveSpeed: 1, damagePerNetHit: 1 },
  hiding: { defaultCapacity: 1 },
  ambush: { defaultChancePct: 50 },
  resolution: { fullMatches: 3, partialMatches: 2 },
  debug: { freezeState: true },
};

export type Config = GameConfig;
