/**
 * Copies the vendored IBAN flags into the compiled tree.
 *
 * `tsc` only emits `.js`; the flag `.svg` files are read at runtime by
 * `src/lib/flags.ts` via `../ui/iban-preview/flags`, so `dist/lib/flags.js`
 * needs `dist/ui/iban-preview/flags` to exist next to it. The Vite widget
 * build creates `dist/ui/iban-preview/` (with `emptyOutDir: false`, so this
 * dir survives a re-run of `build:widget`); this drops the flags in beside
 * the bundled `mcp-app.html`, replacing any earlier copy.
 */
import { cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'src/ui/iban-preview/flags');
const to = path.join(root, 'dist/ui/iban-preview/flags');

await rm(to, { recursive: true, force: true });
await cp(from, to, { recursive: true });
console.log(`copied flags -> ${path.relative(root, to)}`);
