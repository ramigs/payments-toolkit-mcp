import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { withResourceLogging } from '../lib/with-logging.js';

/**
 * URI of the iban-preview MCP App widget. `validate_iban` references this via
 * `_meta.ui.resourceUri`; the host reads the resource below and renders it,
 * then pushes each `validate_iban` result to it.
 */
export const IBAN_PREVIEW_RESOURCE_URI = 'ui://payments-toolkit/iban-preview';

// Bundled to a single self-contained HTML file by `pnpm run build:widget`,
// separately from the server's `tsc` output. Resolve that built file whether
// this module runs from source (Vitest) or from the compiled `dist/` tree.
const here = path.dirname(fileURLToPath(import.meta.url));
const WIDGET_HTML_PATH = import.meta.url.endsWith('.ts')
  ? path.join(here, '../../dist/ui/iban-preview/mcp-app.html')
  : path.join(here, '../ui/iban-preview/mcp-app.html');

let cachedHtml: string | undefined;
async function loadWidgetHtml(): Promise<string> {
  cachedHtml ??= await readFile(WIDGET_HTML_PATH, 'utf-8');
  return cachedHtml;
}

export function registerIbanPreviewResource(server: McpServer): void {
  registerAppResource(
    server,
    'IBAN Preview',
    IBAN_PREVIEW_RESOURCE_URI,
    {
      title: 'IBAN Preview',
      description:
        'Interactive widget rendered by validate_iban — shows the IBAN grouped ' +
        'for reading, its country and flag, and whether the checksum passed.',
    },
    withResourceLogging('iban_preview', async (uri) => {
      const html = await loadWidgetHtml();
      return {
        contents: [{ uri: uri.href, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    }),
  );
}
