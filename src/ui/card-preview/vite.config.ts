import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// This config is intentionally scoped to the widget and invoked explicitly
// (`vite build --config ...`) so it never gets picked up by Vitest, which
// resolves `vitest.config.ts` at the repo root.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  // Inline JS/CSS into the single HTML file — the MCP Apps iframe runs under a
  // deny-by-default CSP, so external asset requests would be blocked.
  plugins: [viteSingleFile()],
  build: {
    outDir: resolve(here, '../../../dist/ui/card-preview'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(here, 'mcp-app.html'),
    },
  },
});
