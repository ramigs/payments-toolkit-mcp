/**
 * IBAN-preview MCP App widget.
 *
 * Rendered in a sandboxed iframe by an MCP Apps host (Claude, the MCP Apps
 * Inspector) when `validate_iban` runs. The host pushes that tool's result to
 * `App.ontoolresult`; this script reads `structuredContent` and paints the
 * tile. Bundled to a single self-contained HTML file by `build:widget`.
 *
 * The iframe can't reach the server, so everything shown comes from the
 * result: `ibanFormatted`, `country`, `countryName`, `flagSvg` (the one
 * country's flag, inlined by the tool), and `failureReason`.
 */
import { App } from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

interface IbanResult {
  valid?: boolean;
  country?: string;
  countryName?: string;
  ibanFormatted?: string;
  flagSvg?: string;
  failureReason?: 'format' | 'country' | 'length' | 'checksum';
}

const FAILURE_TEXT: Record<NonNullable<IbanResult['failureReason']>, string> = {
  format: 'Not an IBAN',
  country: 'Unknown country',
  length: 'Wrong length',
  checksum: 'Checksum failed',
};

const GLOBE_SVG =
  '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
  '<path fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.4" ' +
  'd="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c3 3 3 17 0 20M2 12h20M4 7h16M4 17h16"/></svg>';

const ibanEl = document.getElementById('iban') as HTMLElement;
const flagEl = document.getElementById('flag') as HTMLElement;
const countryEl = document.getElementById('country') as HTMLElement;
const pillEl = document.getElementById('pill') as HTMLElement;

const IBAN_BASE_PX = 16;
const IBAN_MIN_PX = 9;

/**
 * Keep the IBAN on a single line by shrinking its font to fit the width the
 * host gave us — a widget can't ask the host for more room, and the longest
 * IBANs (Malta, 31 chars) don't fit at the base size in a narrow panel.
 */
function fitIban(): void {
  ibanEl.style.fontSize = `${IBAN_BASE_PX}px`;
  const available = ibanEl.clientWidth;
  const needed = ibanEl.scrollWidth;
  if (available > 0 && needed > available) {
    const px = Math.max(
      IBAN_MIN_PX,
      Math.floor(IBAN_BASE_PX * (available / needed) * 10) / 10,
    );
    ibanEl.style.fontSize = `${px}px`;
    ibanEl.style.letterSpacing = px <= 12 ? '0.01em' : '';
  } else {
    ibanEl.style.letterSpacing = '';
  }
}

function render(result: IbanResult): void {
  const { valid, country, countryName, ibanFormatted, flagSvg, failureReason } =
    result;

  ibanEl.textContent = ibanFormatted || '—';
  fitIban();

  flagEl.innerHTML = flagSvg || GLOBE_SVG;
  const place = countryName ?? country;
  flagEl.setAttribute(
    'aria-label',
    place ? `Flag of ${place}` : 'Unknown country',
  );
  countryEl.textContent = place ?? 'Unknown country';

  if (valid) {
    pillEl.className = 'pill valid';
    pillEl.textContent = '✓ Valid';
  } else if (failureReason) {
    pillEl.className = 'pill invalid';
    pillEl.textContent = `✕ ${FAILURE_TEXT[failureReason]}`;
  } else {
    pillEl.className = 'pill unknown';
    pillEl.textContent = 'Not checked';
  }
}

function applyResult(result: CallToolResult): void {
  render((result.structuredContent as IbanResult) ?? {});
}

window.addEventListener('resize', fitIban);

const app = new App({ name: 'IBAN Preview', version: '1.0.0' });
app.ontoolresult = applyResult;
void app.connect();
