import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Scoped to this widget and invoked explicitly (`vite build --config ...`) so
// it never gets picked up by Vitest, which resolves `vitest.config.ts` at the
// repo root.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  // Inline JS/CSS into the single HTML file — the MCP Apps iframe runs under a
  // deny-by-default CSP, so external asset requests would be blocked.
  plugins: [viteSingleFile()],
  build: {
    outDir: resolve(here, '../../../dist/ui/iban-preview'),
    // The single-file build emits only `mcp-app.html` (always the same name,
    // overwritten each run), and `scripts/copy-flags.mjs` puts the runtime
    // flags in a `flags/` subdir of this same outDir — so don't wipe it.
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(here, 'mcp-app.html'),
    },
  },
});
