import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseContent, type ContentDB } from '../engine/index';

/** Load the built content DB (tools + tests). Fails loudly if not built. */
export function loadContent(): ContentDB {
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'content.json');
  if (!existsSync(path)) throw new Error(`content/content.json missing — run \`npm run content:build\` first`);
  return parseContent(JSON.parse(readFileSync(path, 'utf8')));
}
