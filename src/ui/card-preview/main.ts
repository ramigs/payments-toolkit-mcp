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

// Network artwork (flat-rounded variant) from aaronfagan/svg-credit-card-
// payment-icons, Apache-2.0 — see icons/LICENSE. Imported as raw strings so the
// single-file bundle inlines them; each SVG is a self-contained rounded badge
// shown small in the card's bottom-right corner.
import visaSvg from './icons/visa.svg?raw';
import mastercardSvg from './icons/mastercard.svg?raw';
import amexSvg from './icons/amex.svg?raw';
import discoverSvg from './icons/discover.svg?raw';
import dinersSvg from './icons/diners.svg?raw';
import jcbSvg from './icons/jcb.svg?raw';

// Keys match the network names returned by `detect_card_type`.
const NETWORK_SVG: Record<string, string> = {
  Visa: visaSvg,
  Mastercard: mastercardSvg,
  'American Express': amexSvg,
  Discover: discoverSvg,
  'Diners Club': dinersSvg,
  JCB: jcbSvg,
};

// Card-body colour per network. An unrecognised network falls back to grey and
// the badge is hidden.
const BRAND_COLOR: Record<string, string> = {
  Visa: '#1a1f71',
  Mastercard: '#1a1a1a',
  'American Express': '#2e77bb',
  Discover: '#1d1d1b',
  'Diners Club': '#0079be',
  JCB: '#0b4ea2',
};
const FALLBACK_COLOR = '#6b7280';

const cardEl = document.getElementById('card') as HTMLElement;
const logoEl = document.getElementById('logo') as HTMLElement;
const numberEl = document.getElementById('number') as HTMLElement;

// Group digits into fours for readability (`4111 1111 1111 1111`). Falls back
// to a bullet placeholder before the first tool result arrives.
function formatCardNumber(cardNumber: string): string {
  if (!cardNumber) return '•••• •••• •••• ••••';
  return cardNumber.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function render(network: string, cardNumber: string): void {
  const svg = NETWORK_SVG[network];
  logoEl.innerHTML = svg ?? '';
  cardEl.style.background = BRAND_COLOR[network] ?? FALLBACK_COLOR;
  cardEl.setAttribute(
    'aria-label',
    svg ? `${network} card` : 'Card, network not recognised',
  );
  numberEl.textContent = formatCardNumber(cardNumber);
}

function applyResult(result: CallToolResult): void {
  const { network, cardNumber } =
    (result.structuredContent as {
      network?: string;
      cardNumber?: string;
    }) ?? {};
  render(network ?? 'unknown', cardNumber ?? '');
}

const app = new App({ name: 'Card Preview', version: '1.0.0' });
app.ontoolresult = applyResult;
void app.connect();
