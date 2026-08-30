import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { validateIban } from '../lib/iban.js';
import { getFlagSvg } from '../lib/flags.js';
import { IBAN_PREVIEW_RESOURCE_URI } from '../resources/iban-preview.js';
import { withToolLogging } from '../lib/with-logging.js';

const regionNames = new Intl.DisplayNames(['en'], {
  type: 'region',
  fallback: 'none',
});

/** English country name for an alpha-2 code, or `undefined` if CLDR has none. */
function countryName(code: string): string | undefined {
  try {
    return regionNames.of(code) || undefined;
  } catch {
    return undefined;
  }
}

export function registerValidateIbanTool(server: McpServer): void {
  registerAppTool(
    server,
    'validate_iban',
    {
      title: 'Validate IBAN',
      description:
        'Validates an International Bank Account Number (IBAN): checks the ' +
        'country-specific length and the ISO 13616 mod-97 checksum. Spaces ' +
        'are stripped and letters are case-insensitive.',
      inputSchema: {
        iban: z.string().min(4).max(50),
      },
      outputSchema: {
        valid: z.boolean(),
        country: z.string().optional(),
        countryName: z.string().optional(),
        ibanFormatted: z.string().optional(),
        flagSvg: z.string().optional(),
        failureReason: z
          .enum(['format', 'country', 'length', 'checksum'])
          .optional(),
      },
      // Links this tool to the iban-preview widget; an MCP Apps host renders
      // that resource and pushes this result to it.
      _meta: { ui: { resourceUri: IBAN_PREVIEW_RESOURCE_URI } },
    },
    withToolLogging('validate_iban', async ({ iban }) => {
      const result = validateIban(iban);

      // Enrich the structured payload for the widget: the country's flag SVG
      // (one per call — the widget can't fetch them) and its English name.
      // The text content stays the lean validator result.
      const flagSvg = result.country
        ? ((await getFlagSvg(result.country)) ?? undefined)
        : undefined;
      const name = result.country ? countryName(result.country) : undefined;

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: {
          ...result,
          ...(name ? { countryName: name } : {}),
          ...(flagSvg ? { flagSvg } : {}),
        },
      };
    }),
  );
}
