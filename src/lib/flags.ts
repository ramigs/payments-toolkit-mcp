import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Vendored country flags for the IBAN preview widget.
 *
 * The `validate_iban` tool embeds one flag per result in `structuredContent`
 * rather than the widget bundling all ~80 — the widget's sandboxed iframe has
 * no route back to the server to fetch them. Files come from `flag-icons`
 * (MIT), optimised by `scripts/vendor-flags.mjs`; see the sibling `NOTICE`.
 *
 * `src/lib/flags.ts` -> `../ui/iban-preview/flags` resolves to the source dir
 * under Vitest and to `dist/ui/iban-preview/flags` once compiled (the `build`
 * script copies the flags there alongside the Vite-built widget HTML).
 */
const FLAGS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../ui/iban-preview/flags',
);

const cache = new Map<string, string | null>();

/**
 * The `4x3` SVG for an ISO 3166-1 alpha-2 country code (case-insensitive), or
 * `null` when no flag is vendored for it. Results (hits and misses) are cached.
 */
export async function getFlagSvg(countryCode: string): Promise<string | null> {
  const cc = countryCode.toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return null;

  const cached = cache.get(cc);
  if (cached !== undefined) return cached;

  let svg: string | null;
  try {
    svg = await readFile(path.join(FLAGS_DIR, `${cc}.svg`), 'utf-8');
  } catch {
    svg = null;
  }
  cache.set(cc, svg);
  return svg;
}
