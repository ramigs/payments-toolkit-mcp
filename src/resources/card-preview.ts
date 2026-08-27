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
 * URI of the card-preview MCP App widget. `detect_card_type` references this
 * via `_meta.ui.resourceUri`; the host reads the resource below and renders it.
 */
export const CARD_PREVIEW_RESOURCE_URI = 'ui://payments-toolkit/card-preview';

// The widget is bundled to a single self-contained HTML file by
// `pnpm run build:widget`, separately from the server's `tsc` output. Resolve
// that built file whether this module runs from source (Vitest) or from the
// compiled `dist/` tree.
const here = path.dirname(fileURLToPath(import.meta.url));
const WIDGET_HTML_PATH = import.meta.url.endsWith('.ts')
  ? path.join(here, '../../dist/ui/card-preview/mcp-app.html')
  : path.join(here, '../ui/card-preview/mcp-app.html');

let cachedHtml: string | undefined;
async function loadWidgetHtml(): Promise<string> {
  cachedHtml ??= await readFile(WIDGET_HTML_PATH, 'utf-8');
  return cachedHtml;
}

export function registerCardPreviewResource(server: McpServer): void {
  registerAppResource(
    server,
    'Card Preview',
    CARD_PREVIEW_RESOURCE_URI,
    {
      title: 'Card Preview',
      description:
        'Interactive widget rendered by detect_card_type — shows the detected ' +
        'network and the masked last four digits on a styled card.',
    },
    withResourceLogging('card_preview', async (uri) => {
      const html = await loadWidgetHtml();
      return {
        contents: [{ uri: uri.href, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    }),
  );
}
