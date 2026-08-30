/**
 * Vendors the country flags the IBAN preview widget needs.
 *
 * Reads the ISO 3166-1 alpha-2 codes from `src/lib/iban.ts` (the IBAN_LENGTHS
 * table — the authoritative list of countries this server recognises), copies
 * the matching `4x3` SVG from the `flag-icons` package, runs it through SVGO,
 * and writes the result to `src/ui/iban-preview/flags/<cc>.svg`.
 *
 * The flags are served by the `validate_iban` tool (one per result), not
 * bundled into the widget, so they live outside the Vite build. Re-run with
 * `pnpm run vendor:flags` whenever the country table changes.
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { optimize } from 'svgo';
import { Resvg } from '@resvg/resvg-js';

// A handful of flags carry a detailed coat of arms whose path data stays large
// (tens to ~175 KiB) even after SVGO. That crest detail is invisible at the
// widget's chip size, and each flag is embedded whole in a `validate_iban`
// result, so anything past this many bytes is rasterised to a small PNG and
// re-wrapped as an <image> SVG — same string shape for the loader, ~90% smaller.
const RASTER_THRESHOLD = 25 * 1024;
const RASTER_WIDTH = 160;

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..');

const IBAN_LIB = path.join(repoRoot, 'src/lib/iban.ts');
const FLAG_ICONS_4X3 = path.join(
  path.dirname(require.resolve('flag-icons/package.json')),
  'flags/4x3',
);
const OUT_DIR = path.join(repoRoot, 'src/ui/iban-preview/flags');

/** Pull the two-letter keys out of the `IBAN_LENGTHS` object literal. */
async function ibanCountryCodes() {
  const src = await readFile(IBAN_LIB, 'utf-8');
  const body = src.slice(
    src.indexOf('IBAN_LENGTHS'),
    src.indexOf('};', src.indexOf('IBAN_LENGTHS')),
  );
  return [...body.matchAll(/^\s{2}([A-Z]{2}):/gm)].map((m) =>
    m[1].toLowerCase(),
  );
}

const codes = await ibanCountryCodes();

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

/** Render an SVG string to a compact PNG-backed <image> SVG at chip resolution. */
function rasterise(svg) {
  // flag-icons' 4x3 sources omit xmlns (they're built to be inlined); resvg
  // needs it on the root node to parse.
  const rooted = svg.replace(
    /^<svg /,
    '<svg xmlns="http://www.w3.org/2000/svg" ',
  );
  const png = new Resvg(rooted, {
    fitTo: { mode: 'width', value: RASTER_WIDTH },
  })
    .render()
    .asPng()
    .toString('base64');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">` +
    `<image width="640" height="480" href="data:image/png;base64,${png}"/></svg>`
  );
}

let total = 0;
let rastered = 0;
for (const cc of codes) {
  const raw = await readFile(path.join(FLAG_ICONS_4X3, `${cc}.svg`), 'utf-8');
  let { data } = optimize(raw, {
    multipass: true,
    plugins: [
      { name: 'preset-default' },
      { name: 'removeDimensions' },
      { name: 'removeXMLNS', active: false },
    ],
  });
  if (data.length > RASTER_THRESHOLD) {
    data = rasterise(data);
    rastered += 1;
  }
  await writeFile(path.join(OUT_DIR, `${cc}.svg`), data);
  total += data.length;
}

const notice = `Flags in this directory are from flag-icons (https://github.com/lipis/flag-icons),
MIT License, Copyright (c) 2013 Panayiotis Lipiridis.

Only the ISO 3166-1 alpha-2 codes present in src/lib/iban.ts are vendored here,
optimised with SVGO; a few with a heavy coat of arms are rasterised to a small
PNG wrapped in an <image> SVG. Regenerate with \`pnpm run vendor:flags\`.
`;
await writeFile(path.join(OUT_DIR, 'NOTICE'), notice);

console.log(
  `vendored ${codes.length} flags -> ${path.relative(repoRoot, OUT_DIR)} ` +
    `(${(total / 1024).toFixed(0)} KiB total, ${rastered} rasterised)`,
);
