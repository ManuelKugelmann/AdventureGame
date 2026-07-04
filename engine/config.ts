/**
 * All rule numbers live here — calibration surface for /tools sims.
 * Never inline these in systems code.
 */
export const config = {
  dice: {
    /** faces on the custom d6: 3 blank / 2 hit / 1 surge (surge = hit + effect) */
    blankFaces: 3,
    hitFaces: 2,
    surgeFaces: 1,
  },

  turn: {
    /** AP = classBase + hits(apDice d6) rolled at turn start */
    apDice: 2,
    /** hard game length cap; hitting it without resolution = doom loss */
    // (scenario may set a lower cap; this is the absolute ceiling)
    maxRoundsCeiling: 40,
  },

  costs: {
    moveSection: 1,
    crossExit: 1,
    reHide: 1,
    inspect: 1,
    attackMaxAp: 3,
  },

  alert: {
    min: 0,
    max: 3,
    /** floor set by: unstealthed movement ⇒ ≥1, zone-share with committed enemy ⇒ ≥2, enemy damaged ⇒ ≥3 */
    floorUnstealthedMove: 1,
    floorZoneShare: 2,
    floorEnemyDamaged: 3,
    /** rounds a card must stay empty of heroes+enemies to de-escalate: 3→2, 2→1, 1→0 */
    deescalateEmptyRounds: { fromThree: 1, fromTwo: 2, fromOne: 3 },
    /** encounter chance per round-end check, indexed by card alert 0-3 */
    encounterChancePct: [0, 10, 30, 60] as const,
    /** sustained alert-3 rounds after which encounters spawn an extra enemy */
    severityEscalationAge: 2,
    /** total live enemies cap (spawns beyond this are skipped) */
    enemyCap: 8,
  },

  stealth: {
    /** dice rolled for a stealth attempt; budget = hits − alertPenalty + skill */
    dice: 2,
    /** budget penalty indexed by card alert 0-3 */
    alertPenalty: [0, 1, 2, 4] as const,
    /** section entry cost by cover */
    sectionCost: { covered: 0, partial: 1, open: 2 } as const,
  },

  combat: {
    /** defender DEF modifier from the cover of its section */
    coverDefMod: { covered: 1, partial: 0, open: -1 } as const,
    /** bonus dice for a first strike from hidden */
    hiddenStrikeBonusDice: 1,
    /** melee attack into an adjacent chokepoint-blocked section is allowed (see project.md open question) */
    allowAttackIntoBlockedSection: true,
  },

  enemy: {
    /** sections an enemy may move per activation */
    moveSpeed: 1,
    /** damage an enemy attack deals per net hit */
    damagePerNetHit: 1,
  },

  resolution: {
    /** aspect matches (of who/where/how) required for full / partial success */
    fullMatches: 3,
    partialMatches: 2,
  },
} as const;

export type Config = typeof config;
