/** Display label for a zone/section id: `gate_yard` → `Gate Yard`. */
export const zoneLabel = (id: string): string =>
  id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Per-player figurine colours (player 1..6), used for both the board token and the party panel. */
// no red — red is reserved for enemies
export const PLAYER_COLORS = ['#4f8fe0', '#5fc86a', '#e0b64f', '#b06fe0', '#4fd0d0', '#cfd8e0'] as const;
export const playerColor = (idx: number): string => PLAYER_COLORS[idx % PLAYER_COLORS.length]!;

/** Hero-class icons (emoji). */
const CLASS_ICON: Record<string, string> = { warden: '🛡', shadowfoot: '🗡', lorekeeper: '📖' };
export const classIcon = (classId: string): string => CLASS_ICON[classId] ?? '🎭';

/** Enemy icons (emoji), keyed by enemy def id. */
const ENEMY_ICON: Record<string, string> = { cultist: '🧎', ghoul: '🧟', shade: '👻', stone_golem: '🗿' };
export const enemyIcon = (defId: string): string => ENEMY_ICON[defId] ?? '👹';
