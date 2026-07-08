/** Display label for a zone/section id: `gate_yard` → `Gate Yard`. */
export const zoneLabel = (id: string): string =>
  id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Per-player figurine colours (player 1..6), used for both the board token and the party panel. */
export const PLAYER_COLORS = ['#e0564f', '#4f8fe0', '#5fc86a', '#e0b64f', '#b06fe0', '#4fd0d0'] as const;
export const playerColor = (idx: number): string => PLAYER_COLORS[idx % PLAYER_COLORS.length]!;

/** Hero-class icons, shown on the figurine and in the party profile. */
const CLASS_ICON: Record<string, string> = { warden: '🛡', shadowfoot: '🗡', lorekeeper: '📖' };
export const classIcon = (classId: string): string => CLASS_ICON[classId] ?? '🎭';
