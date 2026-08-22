import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateIban } from '../lib/iban.js';
import { withToolLogging } from '../lib/with-logging.js';

export function registerValidateIbanTool(server: McpServer): void {
  server.registerTool(
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
      },
    },
    withToolLogging('validate_iban', async ({ iban }) => {
      const result = validateIban(iban);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      };
    }),
  );
}
