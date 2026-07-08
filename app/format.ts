/** Display label for a zone/section id: `gate_yard` → `Gate Yard`. */
export const zoneLabel = (id: string): string =>
  id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
