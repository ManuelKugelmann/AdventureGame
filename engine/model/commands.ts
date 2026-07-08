import { z } from 'zod';

/**
 * Player intents — exhaustive union. Adding a variant must break compilation
 * in applyCommand/legalCommands (`satisfies never` defaults).
 */

export const TheorySchema = z.object({
  who: z.string().min(1),
  where: z.string().min(1),
  how: z.string().min(1),
});

export const CommandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('MoveSection'), toSection: z.string().min(1) }),
  z.object({ kind: z.literal('CrossExit'), exitIdx: z.number().int().min(0).max(1) }),
  z.object({ kind: z.literal('PeekExit'), exitIdx: z.number().int().min(0).max(1) }),
  z.object({ kind: z.literal('OpenExit'), exitIdx: z.number().int().min(0).max(1) }),
  z.object({ kind: z.literal('CloseExit'), exitIdx: z.number().int().min(0).max(1) }),
  z.object({ kind: z.literal('StealthMove'), route: z.array(z.string().min(1)).min(1).max(4) }),
  z.object({ kind: z.literal('Climb'), toSection: z.string().min(1) }),
  z.object({ kind: z.literal('ReHide') }),
  z.object({ kind: z.literal('Attack'), targetId: z.string().min(1), ap: z.number().int().min(1) }),
  z.object({ kind: z.literal('Inspect'), slotIdx: z.number().int().min(0) }),
  z.object({ kind: z.literal('CommitResolution'), theory: TheorySchema }),
  z.object({ kind: z.literal('EndTurn') }),
]);

export type Command = z.infer<typeof CommandSchema>;
export type CommandKind = Command['kind'];

export function parseCommand(raw: unknown): Command {
  return CommandSchema.parse(raw);
}
