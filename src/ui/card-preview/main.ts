/**
 * Card-preview MCP App widget.
 *
 * Rendered in a sandboxed iframe by an MCP Apps host (Claude, the MCP Apps
 * Inspector) when `detect_card_type` runs. The host pushes that tool's result
 * to `App.ontoolresult`; this script reads `structuredContent` and paints the
 * card. Bundled to a single self-contained HTML file by `build:widget`.
 */
import { App } from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const BRAND_COLORS: Record<string, string> = {
  Visa: '#1a1f71',
  Mastercard: '#eb001b',
  'American Express': '#006fcf',
  Discover: '#ff6000',
  'Diners Club': '#0079be',
  JCB: '#0b4ea2',
};
const FALLBACK_COLOR = '#6b7280';

const cardEl = document.getElementById('card') as HTMLElement;
const brandEl = document.getElementById('brand') as HTMLElement;
const numberEl = document.getElementById('number') as HTMLElement;

function render(network: string, last4: string): void {
  const known = network !== 'unknown';
  cardEl.style.background = BRAND_COLORS[network] ?? FALLBACK_COLOR;
  brandEl.textContent = known ? network : 'Unknown network';
  numberEl.textContent = `•••• •••• •••• ${last4 || '••••'}`;
}

function applyResult(result: CallToolResult): void {
  const { network, last4 } =
    (result.structuredContent as { network?: string; last4?: string }) ?? {};
  render(network ?? 'unknown', last4 ?? '');
}

const app = new App({ name: 'Card Preview', version: '1.0.0' });
app.ontoolresult = applyResult;
void app.connect();
